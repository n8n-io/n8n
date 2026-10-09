import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import {
	credentialTypesOf,
	packAction,
	packPackage,
	packSdkRuntime,
	type PackedAction,
} from '../pack';
import { credentialManifestOf } from '../manifest';
import { defineCredential, field } from '../entry/credentials';
import { generateNodeModule } from '../entry/codegen';
import {
	hostRuntime,
	nodeContractRangeOf,
	toVersionedNodeType,
	type PackedVersion,
	type HostRuntime,
} from '../entry/host';
import {
	addedPermissionsOf,
	contractHash,
	diffContracts,
	parseFixtures,
	parseManifest,
	toContract,
	type ContractDocument,
	type ContractFixtures,
	type NodeContractVersion,
	type VersionManifest,
} from '../entry/registry';
import {
	defineNode,
	defineResource,
	provider,
	ref,
	t,
	type ActionFlow,
	type JsonSchema,
	type Shape,
} from '../index';
import { checkPublish, replayFixtures } from '../publish';
import { storeFilesOfDir, storeReader } from '../store';
import { evaluateBundle } from '../runtime';
import type { AnySchema } from '../schema';
import type { MockRoute } from '../testing';
import {
	diffCredentials,
	NODE_CONTRACT_VERSION,
	requiredNodeContractOf,
	semverRange,
	sha256,
} from '../version';

const demo = defineNode({ id: 'demo', displayName: 'Demo' });
const FLOW: ActionFlow = { effect: 'transform', cardinality: 'per-item' };

const contractOf = ({
	input = { text: t.str() },
	output = t.obj({ text: t.str() }),
	flow = FLOW,
	summary = 'Echo the text.',
}: { input?: Shape; output?: AnySchema; flow?: ActionFlow; summary?: string } = {}) =>
	toContract(
		demo.action('echo', {
			action: 'Echo',
			summary,
			flow,
			input,
			output,
			async *run() {},
		}),
	);

describe('contractHash', () => {
	const base = contractOf();

	it('ignores key order and prose', () => {
		const reordered = Object.fromEntries(Object.entries(base).reverse());
		expect(contractHash({ ...base, ...reordered })).toBe(contractHash(base));
		expect(contractHash({ ...base, summary: 'Other.', action: 'Say' })).toBe(contractHash(base));
		const hinted = contractOf({
			input: { text: t.str().hint('The text').describe('Some prose') },
			output: t.obj({ text: t.str().hint('Echoed') }),
		});
		expect(contractHash(hinted)).toBe(contractHash(base));
	});

	it('moves with the flow, the major, and the schema', () => {
		expect(contractHash(contractOf({ flow: { ...FLOW, effect: 'read' } }))).not.toBe(
			contractHash(base),
		);
		expect(contractHash({ ...base, version: 2 })).not.toBe(contractHash(base));
		expect(contractHash(contractOf({ input: { text: t.str().optional() } }))).not.toBe(
			contractHash(base),
		);
	});

	it('moves with the runtime image', () => {
		const imaged = { ...base, runtime: { image: `node@sha256:${'a'.repeat(64)}` } };
		expect(contractHash(imaged)).not.toBe(contractHash(base));
		expect(
			contractHash({ ...imaged, runtime: { image: `node@sha256:${'b'.repeat(64)}` } }),
		).not.toBe(contractHash(imaged));
	});
});

describe('named outputs', () => {
	const base = contractOf();
	const routed = (outputs: ContractDocument['outputs']) => ({ ...base, outputs });

	it('leave the hash of an action with one output as it was, and hash the output list', () => {
		expect(contractHash({ ...base, outputs: undefined })).toBe(contractHash(base));
		expect(contractHash(routed(['true', 'false']))).not.toBe(contractHash(base));
		expect(contractHash(routed(['true', 'false']))).not.toBe(
			contractHash(routed(['false', 'true'])),
		);
	});

	it('classify an added, removed, renamed, or moved output as a major', () => {
		const two = routed(['kept', 'discarded']);
		const changed = [
			routed(['kept']),
			routed(['kept', 'discarded', 'error']),
			routed(['kept', 'dropped']),
			routed(['discarded', 'kept']),
			routed({ each: 'cases', then: ['fallback'] }),
			base,
		];
		expect(changed.map((next) => diffContracts(two, next).kind)).toEqual(
			changed.map(() => 'major'),
		);
		expect(diffContracts(two, routed(['kept', 'discarded'])).kind).toBe('patch');
		expect(diffContracts(two, routed(['kept'])).changes).toEqual([
			{ kind: 'major', text: 'outputs kept, discarded → kept' },
		]);
	});
});

describe('parseFixtures', () => {
	it('needs exactly one of output and outputs in a recorded run', () => {
		const fixture = (expected: object) =>
			JSON.stringify({ executions: [{ name: 'a', params: {}, ...expected }] });
		expect(parseFixtures(fixture({ output: [] })).executions).toHaveLength(1);
		expect(parseFixtures(fixture({ outputs: [[], []] })).executions).toHaveLength(1);
		expect(() => parseFixtures(fixture({}))).toThrow('not valid');
		expect(() => parseFixtures(fixture({ output: [], outputs: [[]] }))).toThrow('not valid');
	});

	it('reads routes and a legacy node', () => {
		const fixture = (extra: object) =>
			JSON.stringify({ executions: [{ name: 'a', params: {}, output: [], ...extra }] });
		const routes = [
			{ method: 'POST', path: '/chat.postMessage', times: 1, reply: { json: { ok: true } } },
			{
				path: '/file',
				query: { id: ['1', 2] },
				reply: { binary: { data: 'aGk=', mimeType: 'text/plain' } },
			},
		];
		const legacy = {
			type: 'n8n-nodes-base.slack',
			version: 2.7,
			parameters: { resource: 'message' },
		};

		expect(parseFixtures(fixture({ routes, legacy })).executions[0]).toMatchObject({
			routes,
			legacy,
		});
		expect(() => parseFixtures(fixture({ routes: [{ reply: {} }] }))).toThrow('not valid');
		expect(() => parseFixtures(fixture({ routes: [{ path: '/a' }] }))).toThrow('not valid');
		expect(() => parseFixtures(fixture({ legacy: { type: 'x', version: '1' } }))).toThrow(
			'not valid',
		);
		expect(() => parseFixtures(fixture({ responses: [] }))).toThrow('not valid');
	});
});

describe('diffContracts', () => {
	const base = contractOf({ input: { text: t.str(), mode: t.str().with({ enum: ['a', 'b'] }) } });
	const baseInput = { text: t.str(), mode: t.str().with({ enum: ['a', 'b'] }) };
	const kindOf = (next: Parameters<typeof contractOf>[0]) =>
		diffContracts(base, contractOf(next)).kind;
	const withInput = (input: Shape) => kindOf({ input });

	it('classifies a contract-hash-preserving change as a patch', () => {
		expect(diffContracts(base, contractOf({ input: baseInput, summary: 'Echo it.' })).kind).toBe(
			'patch',
		);
	});

	it('keeps the hash for a changed lookup, and classifies an added ref as a minor, a dropped or other ref as a major', () => {
		const lookup = (path: `/${string}`) =>
			defineResource({
				id: 'demo.item',
				label: 'Item',
				shape: {},
				list: {
					request: { path },
					response: t.arr(t.obj({ id: t.str() })),
					item: { id: (e) => e.id, label: (e) => e.id },
				},
			});
		const listed = contractOf({ input: { ...baseInput, text: ref(lookup('/items')) } });
		const moved = contractOf({ input: { ...baseInput, text: ref(lookup('/v2/items')) } });
		expect(contractHash(moved)).toBe(contractHash(listed));
		expect(diffContracts(listed, moved).kind).toBe('patch');
		expect(diffContracts(base, listed).kind).toBe('minor');
		expect(diffContracts(listed, base).kind).toBe('major');
		const other = defineResource({ id: 'demo.other', label: 'Other', shape: {} });
		expect(
			diffContracts(listed, contractOf({ input: { ...baseInput, text: ref(other) } })).kind,
		).toBe('major');
	});

	it('classifies an additive optional input as a minor', () => {
		expect(withInput({ ...baseInput, prefix: t.str().optional() })).toBe('minor');
		expect(withInput({ ...baseInput, mode: t.str().with({ enum: ['a', 'b', 'c'] }) })).toBe(
			'minor',
		);
	});

	it('classifies a new required input with a default as a minor', () => {
		const next = contractOf({ input: { ...baseInput, prefix: t.str().default('>') } });
		// `.default()` makes the field optional; a required field with a default is the same rule.
		const required = { ...next, input: { ...next.input, required: ['text', 'mode', 'prefix'] } };
		expect(diffContracts(base, required).kind).toBe('minor');
	});

	it('classifies a new required input as a major', () => {
		const diff = diffContracts(base, contractOf({ input: { ...baseInput, prefix: t.str() } }));
		expect(diff).toMatchObject({ kind: 'major', breaksInput: true });
		expect(withInput({ text: t.str() })).toBe('major');
		expect(withInput({ ...baseInput, mode: t.str().with({ enum: ['a'] }) })).toBe('major');
		expect(withInput({ ...baseInput, text: t.str().with({ minLength: 2 }) })).toBe('major');
	});

	it('classifies a removed or narrowed output as a major', () => {
		const output = t.obj({ text: t.str(), tags: t.arr(t.str()) });
		const prev = contractOf({ input: baseInput, output });
		const diff = (next: AnySchema) =>
			diffContracts(prev, contractOf({ input: baseInput, output: next }));
		expect(diff(t.obj({ text: t.str() }))).toMatchObject({ kind: 'major', breaksInput: false });
		expect(diff(t.obj({ text: t.str().optional(), tags: t.arr(t.str()) })).kind).toBe('major');
		expect(diff(t.obj({ text: t.bool(), tags: t.arr(t.str()) })).kind).toBe('major');
		expect(diff(t.obj({ text: t.str(), tags: t.arr(t.str()), extra: t.str() })).kind).toBe('minor');
	});

	it('classifies a required output field that becomes typical as a minor, and optional as a major', () => {
		const at = (text: AnySchema) =>
			contractOf({ input: baseInput, output: t.obj({ id: t.str(), text }) });
		const required = at(t.str());
		const typical = at(t.str().with({ 'x-n8n-claim': 'typical' }).optional());
		const optional = at(t.str().optional());
		expect(diffContracts(required, typical).changes).toEqual([
			{ kind: 'minor', text: 'output.text is typical' },
		]);
		expect(diffContracts(typical, optional).changes).toEqual([
			{ kind: 'major', text: 'output.text is optional' },
		]);
		expect(diffContracts(required, optional).kind).toBe('major');
		expect(diffContracts(optional, typical).kind).toBe('minor');
		expect(diffContracts(typical, required).kind).toBe('minor');
		expect(contractHash(typical)).not.toBe(contractHash(optional));
	});

	it('classifies an added or removed resource pointer, or another input in it, as a major', () => {
		const pointer = { input: 'text' };
		const pointed = (resource: JsonSchema['x-n8n-resource']) => ({
			...base,
			output: { ...base.output, 'x-n8n-resource': resource },
		});
		expect(diffContracts(base, pointed(pointer)).changes).toEqual([
			{ kind: 'major', text: 'output adds x-n8n-resource' },
		]);
		expect(diffContracts(pointed(pointer), base).kind).toBe('major');
		expect(diffContracts(pointed(pointer), pointed({ input: 'mode' })).kind).toBe('major');
		// A packed pointer of the legacy shape, with load-options calls.
		const legacy = {
			...pointer,
			method: 'demo.fields',
			loadOptions: [],
		} as JsonSchema['x-n8n-resource'];
		expect(diffContracts(pointed(legacy), pointed(pointer)).changes).toEqual([
			{ kind: 'minor', text: 'output lists the x-n8n-resource fields in another way' },
		]);
		expect(contractHash(pointed(pointer))).not.toBe(contractHash(base));
	});

	it('keeps a field lookup, an extract pattern and the input pointer out of the hash', () => {
		const withLookup = {
			...base,
			input: {
				...base.input,
				properties: {
					...base.input.properties,
					text: {
						type: 'string' as const,
						'x-n8n-ref': 'demo.doc',
						'x-n8n-extract': '/d/(\\w+)',
						'x-n8n-fields': {
							requests: [{ path: '/docs/{id}' }],
							response: {},
							item: { name: '={{ $json.name }}', value: '={{ $json.name }}' },
						},
					},
				},
			},
		};
		const bare = {
			...withLookup,
			input: {
				...withLookup.input,
				properties: {
					...withLookup.input.properties,
					text: { type: 'string' as const, 'x-n8n-ref': 'demo.doc' },
				},
			},
		};
		expect(contractHash({ ...withLookup, resourceInput: { input: 'text' } })).toBe(
			contractHash(bare),
		);
		expect(diffContracts(bare, withLookup).kind).toBe('patch');
	});

	it('classifies a changed flow as a major', () => {
		expect(kindOf({ input: baseInput, flow: { ...FLOW, cardinality: '1:N' } })).toBe('major');
	});

	it('classifies an added or a removed credential type as a major', () => {
		const one = { ...base, credentials: ['demoApi'] };
		const two = { ...base, credentials: ['demoApi', 'demoOAuth2Api'] };
		expect(diffContracts(one, two).changes).toEqual([
			{ kind: 'major', text: 'credential demoOAuth2Api added' },
		]);
		expect(diffContracts(two, one).kind).toBe('major');
	});

	it('lists the permissions that a version adds, or all of them without a previous version', () => {
		const one = { ...base, credentials: ['demoApi'], egress: { hosts: ['api.demo.test'] } };
		const two = {
			...one,
			egress: { hosts: ['api.demo.test', 'files.demo.test'] },
			imports: ['code' as const],
		};
		expect(addedPermissionsOf(one, two)).toEqual(['egress files.demo.test', 'import code']);
		expect(addedPermissionsOf(two, one)).toEqual([]);
		expect(addedPermissionsOf(undefined, one)).toEqual([
			'egress api.demo.test',
			'credential demoApi',
		]);
	});

	it('classifies an added provider call or binary data access as a major', () => {
		const added = (input: Shape) =>
			diffContracts(base, contractOf({ input: { ...baseInput, ...input } })).changes;
		expect(added({ tools: t.arr(provider.input('tool')).optional() })).toContainEqual({
			kind: 'major',
			text: 'provider tool added',
		});
		expect(added({ file: t.binary().optional() })).toContainEqual({
			kind: 'major',
			text: 'binary data access added',
		});
	});

	it('classifies an added binary key pattern as a minor, and a removed one as a major', () => {
		const fixed = contractOf({ output: t.obj({ id: t.str(), data: t.binary() }) });
		const indexed = contractOf({
			output: t.indexedBinaries(t.obj({ id: t.str(), data: t.binary() }), 'attachment_'),
		});
		expect(diffContracts(fixed, indexed).changes).toEqual([
			{ kind: 'minor', text: 'output[^attachment_\\d+$] added' },
		]);
		expect(diffContracts(indexed, fixed).changes).toEqual([
			{ kind: 'major', text: 'output[^attachment_\\d+$] removed' },
		]);
		const first = contractOf({ output: t.indexedBinaries(t.obj({ text: t.str() })) });
		expect(diffContracts(base, first).changes).toContainEqual({
			kind: 'major',
			text: 'binary data access added',
		});
	});

	it('classifies an added runtime or permission as a major, another image as a minor', () => {
		const image = (digit: string) => `node@sha256:${digit.repeat(64)}`;
		const imaged = { ...base, runtime: { image: image('a') } };
		expect(diffContracts(base, imaged).changes).toEqual([
			{ kind: 'major', text: 'runtime image added' },
		]);
		expect(diffContracts(imaged, base).kind).toBe('minor');
		expect(diffContracts(imaged, { ...base, runtime: { image: image('b') } }).changes).toEqual([
			{ kind: 'minor', text: `runtime image ${image('a')} → ${image('b')}` },
		]);
		expect(
			diffContracts(imaged, { ...base, runtime: { image: image('a'), childProcess: true } }).kind,
		).toBe('major');
	});

	it('compares nested fields', () => {
		const prev = contractOf({ input: { where: t.obj({ field: t.str(), op: t.str() }) } });
		const next = contractOf({ input: { where: t.obj({ field: t.str() }) } });
		expect(diffContracts(prev, next).changes).toEqual([
			{ kind: 'major', text: 'input.where.op removed' },
		]);
	});
});

describe('diffCredentials', () => {
	type Spec = Parameters<typeof defineCredential>[0];
	const manifestOf = ({ fields, ...spec }: Partial<Spec>) => {
		const manifest = credentialManifestOf(
			defineCredential({
				id: 'demo.token',
				version: '1.0.0',
				displayName: 'Demo API',
				fields: fields ?? { token: field.secret('Token') },
				auth: (a) => a.bearer('token'),
				...spec,
			}),
		);
		if (!manifest) throw new Error('no manifest');
		return manifest;
	};
	const base = manifestOf({});
	const diffTo = (spec: Partial<Spec>) => diffCredentials(base, manifestOf(spec));
	const region = (regions: string[]) =>
		field.options('Region', Object.fromEntries(regions.map((name) => [name, { name }])));

	it('classifies a change of text only as a patch', () => {
		expect(diffTo({ displayName: 'Demo', docs: 'https://docs.example.com' })).toEqual({
			kind: 'patch',
			breaksInput: false,
			changes: [],
		});
	});

	it('classifies a removed field as a major that breaks stored data', () => {
		const withUser = manifestOf({
			fields: { token: field.secret('Token'), user: field.text('User') },
		});
		expect(diffCredentials(withUser, base)).toEqual({
			kind: 'major',
			breaksInput: true,
			changes: [{ kind: 'major', text: 'fields.user removed' }],
		});
	});

	it('classifies a renamed field as a major, and a rename that renamed maps as a minor', () => {
		const withUser = manifestOf({
			fields: { token: field.secret('Token'), user: field.text('User') },
		});
		const fields = { token: field.secret('Token'), login: field.text('User') };
		expect(diffCredentials(withUser, manifestOf({ fields })).changes).toEqual([
			{ kind: 'major', text: 'fields.user removed' },
			{ kind: 'major', text: 'fields.login added as required' },
		]);
		expect(diffCredentials(withUser, manifestOf({ fields, renamed: { user: 'login' } }))).toEqual({
			kind: 'minor',
			breaksInput: false,
			changes: [{ kind: 'minor', text: 'renamed changed' }],
		});
	});

	it('classifies a field that becomes required as a major', () => {
		const optional = manifestOf({
			fields: { token: field.secret('Token'), user: field.text('User').optional() },
		});
		const required = manifestOf({
			fields: { token: field.secret('Token'), user: field.text('User') },
		});
		expect(diffCredentials(optional, required).changes).toEqual([
			{ kind: 'major', text: 'fields.user is required' },
		]);
	});

	it('classifies another field type as a major', () => {
		expect(diffTo({ fields: { token: t.num() } }).changes).toEqual([
			{ kind: 'major', text: 'fields.token type string → number' },
		]);
	});

	it('classifies another auth kind as a major', () => {
		expect(diffTo({ auth: (a) => a.none() }).changes).toEqual([
			{ kind: 'major', text: 'scheme apply → none' },
		]);
	});

	it('classifies a narrowed value set as a major', () => {
		const wide = manifestOf({
			fields: { token: field.secret('Token'), region: region(['eu', 'us']) },
		});
		const narrow = manifestOf({ fields: { token: field.secret('Token'), region: region(['eu']) } });
		expect(diffCredentials(wide, narrow).changes).toEqual([
			{ kind: 'major', text: 'fields.region drops us' },
		]);
	});

	it('classifies a new optional field as a minor', () => {
		expect(
			diffTo({ fields: { token: field.secret('Token'), user: field.text('User').optional() } }),
		).toEqual({
			kind: 'minor',
			breaksInput: false,
			changes: [{ kind: 'minor', text: 'fields.user added' }],
		});
	});

	it('classifies a new allowed value as a minor', () => {
		const narrow = manifestOf({ fields: { token: field.secret('Token'), region: region(['eu']) } });
		const wide = manifestOf({
			fields: { token: field.secret('Token'), region: region(['eu', 'us']) },
		});
		expect(diffCredentials(narrow, wide).changes).toEqual([
			{ kind: 'minor', text: 'fields.region adds us' },
		]);
	});
});

describe('generateNodeModule', () => {
	it('pins the action version when it is not 1', () => {
		const contract = { ...contractOf(), version: 2 };
		const action = { contract, nodeType: 'demo.echo', operation: 'echo' };
		expect(generateNodeModule('demo', [action])).toContain('contractStep("demo.echo", config, 2)');
	});
});

interface EchoOptions {
	version?: string;
	input?: string;
	text?: string;
	migrate?: string;
}

const echoSource = ({
	version = '1.0.0',
	input = '{ text: str() }',
	text = 'input.text',
	migrate = '',
}: EchoOptions = {}) => `
import { defineNode, path, t } from '@n8n/node-sdk';
const { obj } = t;
const str = () => t.str().title('Text');
import { shout } from './shout';

const demo = defineNode({ id: 'demo', displayName: 'Demo', baseUrl: 'https://demo.test' });

export const echo = demo.action('echo', {
	version: '${version}',
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: ${input},
	output: obj({ text: str() }),
	async run({ input, http }) {
		const suffix = await http.request({ path: path\`/suffix\` });
		return { text: shout(${text} + String(suffix)) };
	},
	${migrate}
});
`;

const suffixRoutes = [{ path: '/suffix', reply: { json: '!' } }];

const fixturesOf = (output: string, extra: Partial<ContractFixtures> = {}): ContractFixtures => ({
	executions: [
		{ name: 'echo', params: { text: 'hello' }, routes: suffixRoutes, output: [{ text: output }] },
	],
	...extra,
});

const contextOf = (metadata: ITaskMetadata[] = []) =>
	({
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Echo', credentials: {} }),
		getNodeParameter: () => 'hello',
		continueOnFail: () => false,
		setMetadata: (value: ITaskMetadata) => metadata.push(value),
		helpers: { httpRequest: async () => '!' },
	}) as unknown as IExecuteFunctions;

const dirs = { root: '', entry: '', shout: '' };

const pack = async (options: EchoOptions = {}) => {
	await writeFile(dirs.entry, echoSource(options));
	return await packAction(dirs.entry, 'echo');
};

const writeShout = async (body: string) =>
	await writeFile(dirs.shout, `export const shout = (text: string) => ${body};\n`);

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-publish-'));
	dirs.entry = path.join(dirs.root, 'echo.ts');
	dirs.shout = path.join(dirs.root, 'shout.ts');
});

afterAll(async () => {
	await rm(dirs.root, { recursive: true, force: true });
});

describe('packAction', () => {
	it('writes the version of the source, with its major as the contract version', async () => {
		await writeShout('text.toUpperCase()');
		expect((await pack()).manifest).toMatchObject({ semver: '1.0.0', contract: { version: 1 } });
		expect((await pack({ version: '2.3.1' })).manifest).toMatchObject({
			semver: '2.3.1',
			contract: { version: 2 },
		});
		await expect(pack({ version: '2.3' })).rejects.toThrow(
			'2.3 is not a major.minor.patch version',
		);
	});

	it('takes no minor beside the version', () => {
		demo.action('echo', {
			// @ts-expect-error the version holds the minor
			minor: 1,
			action: 'Echo',
			summary: 'Echo the text.',
			flow: FLOW,
			input: {},
			output: t.obj({}),
			async *run() {},
		});
	});
});

describe('checkPublish', () => {
	const v1 = async () => {
		await writeShout('text.toUpperCase()');
		return (await pack()).manifest;
	};

	it('refuses a bump lower than the computed change', async () => {
		const prev = await v1();
		const next = await pack({ version: '1.1.0', input: '{ text: str(), prefix: str() }' });
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).rejects.toThrow(
			'is a minor bump from 1.0.0, but the change is major (major: input.prefix added as required)',
		);
	});

	it('refuses a patch whose contract hash moved', async () => {
		const prev = await v1();
		const next = await pack({ version: '1.0.1' });
		const moved: PackedAction = {
			...next,
			manifest: { ...next.manifest, contractHash: sha256('other contract') },
		};
		await expect(checkPublish(prev, moved, fixturesOf('HELLO!'))).rejects.toThrow(
			'must keep the contract hash',
		);
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).resolves.toMatchObject({
			kind: 'patch',
		});
	});

	it('needs a major for a ui change that moves the stored parameters', async () => {
		await writeShout('text.toUpperCase()');
		const input =
			"{ text: str(), note: str().optional(), body: t.variant('kind', { a: { a: str(), inner: t.variant('mode', { x: { x: str() } }).title('Inner').optional() } }).title('Body').optional(), rows: t.arr(t.obj({ a: str() })).title('Rows').optional(), meta: t.record(str()).title('Meta').optional() }";
		const prev = (await pack({ input })).manifest;
		const next = await pack({ input, version: '1.0.1' });
		const withUi = (ui: VersionManifest['ui']): PackedAction => ({
			...next,
			manifest: { ...next.manifest, ui },
		});

		await expect(
			checkPublish(prev, withUi({ advanced: ['note'] }), fixturesOf('HELLO!')),
		).rejects.toThrow(
			'demo.echo@1.0.1 is a patch bump from 1.0.0, but the change is major (the form moves the stored parameters of note)',
		);
		await expect(
			checkPublish(prev, withUi({ fields: { body: { widget: 'json' } } }), fixturesOf('HELLO!')),
		).rejects.toThrow('the form moves the stored parameters of body');
		await expect(
			checkPublish(
				prev,
				withUi({ fields: { 'body.inner': { widget: 'json' } } }),
				fixturesOf('HELLO!'),
			),
		).rejects.toThrow('the form moves the stored parameters of body.inner');
		await expect(
			checkPublish(prev, withUi({ fields: { rows: { widget: 'list' } } }), fixturesOf('HELLO!')),
		).rejects.toThrow('the form moves the stored parameters of rows');
		await expect(
			checkPublish(
				prev,
				withUi({ fields: { meta: { widget: 'assignments' } } }),
				fixturesOf('HELLO!'),
			),
		).resolves.toMatchObject({ kind: 'patch' });
		await expect(
			checkPublish(
				prev,
				withUi({ order: ['note'], fields: { note: { placeholder: 'x' } } }),
				fixturesOf('HELLO!'),
			),
		).resolves.toMatchObject({ kind: 'patch' });
	});

	it('refuses an older version and failing fixtures', async () => {
		const prev = await v1();
		await expect(checkPublish(prev, await pack(), fixturesOf('HELLO!'))).rejects.toThrow(
			'must be newer',
		);
		const patch = await pack({ version: '1.0.1' });
		await expect(checkPublish(prev, patch, fixturesOf('hello!'))).rejects.toThrow(
			'demo.echo@1.0.1 fails its fixtures: demo.echo@1.0.1 fixture "echo": output [{"text":"HELLO!"}]',
		);
		await expect(checkPublish(prev, patch, { executions: [] })).rejects.toThrow(
			'needs an execution fixture',
		);
	});

	it('refuses an input field without a title', async () => {
		await writeShout('text.toUpperCase()');
		const untitled = await pack({ input: '{ text: t.str(), rows: t.arr(obj({ a: str() })) }' });
		await expect(checkPublish(undefined, untitled, fixturesOf('HELLO!'))).rejects.toThrow(
			'demo.echo@1.0.0 needs field titles: demo.echo: input.text has no title; demo.echo: input.rows has no title',
		);
	});

	it('reports fixture params that the action does not declare', async () => {
		await writeShout('text.toUpperCase()');
		const packed = await pack();
		const fixtures = (params: Record<string, unknown>) => ({
			executions: [{ name: 'echo', params, routes: suffixRoutes, output: [{ text: 'HELLO!' }] }],
		});

		await expect(replayFixtures(packed, fixtures({ text: 'hello' }))).resolves.toEqual([]);
		await expect(replayFixtures(packed, fixtures({ text: 'hello', txt: 'x' }))).resolves.toEqual([
			'demo.echo@1.0.0 fixture "echo": params not declared: txt',
		]);
		const failing = {
			executions: [
				{
					name: 'echo',
					params: { text: 'hello', txt: 'x' },
					output: [],
					error: 'mockHttp: no route for GET /suffix. Routes: none',
				},
			],
		};
		await expect(replayFixtures(packed, failing)).resolves.toEqual([
			'demo.echo@1.0.0 fixture "echo": params not declared: txt',
		]);
	});

	it('answers each request from the route of its method and path', async () => {
		await writeShout('text.toUpperCase()');
		const packed = await pack();
		const fixtures = (routes: MockRoute[]) => ({
			executions: [{ name: 'echo', params: { text: 'hi' }, routes, output: [{ text: 'HI!' }] }],
		});

		await expect(
			replayFixtures(
				packed,
				fixtures([
					{ method: 'POST', path: '/suffix', reply: { json: '?' } },
					{ path: '/other', reply: { json: '?' } },
					...suffixRoutes,
				]),
			),
		).resolves.toEqual([]);
		await expect(
			replayFixtures(packed, fixtures([{ path: '/suffix', reply: { status: 404, json: {} } }])),
		).resolves.toEqual([
			'demo.echo@1.0.0 fixture "echo": GET https://demo.test/suffix failed with 404: {}',
		]);
	});

	it('needs migrate and a fixture pair for a major that breaks old input', async () => {
		const prev = await v1();
		const v2 = { version: '2.0.0', input: '{ message: str() }', text: 'input.message' };
		const migrate = 'migrate: (fromMajor, params) => ({ message: params.text }),';
		const executions = [
			{
				name: 'echo',
				params: { message: 'hello' },
				routes: suffixRoutes,
				output: [{ text: 'HELLO!' }],
			},
		];
		const pair = (expected: Record<string, unknown>) => ({
			executions,
			migrations: [{ fromMajor: 1, params: { text: 'hi' }, expected }],
		});

		await expect(checkPublish(prev, await pack(v2), { executions })).rejects.toThrow(
			'demo.echo@2.0.0 breaks old input, so it needs migrate',
		);
		const migrating = await pack({ ...v2, migrate });
		await expect(checkPublish(prev, migrating, { executions })).rejects.toThrow(
			'needs a migration fixture from major 1',
		);
		await expect(checkPublish(prev, migrating, pair({ message: 'hi' }))).resolves.toMatchObject({
			kind: 'major',
		});
		await expect(replayFixtures(migrating, pair({ message: 'ho' }))).resolves.toEqual([
			'demo.echo@2.0.0 migration from 1: got {"message":"hi"}',
		]);
		await expect(replayFixtures(await pack(v2), pair({ message: 'hi' }))).resolves.toEqual([
			'demo.echo@2.0.0 migration from 1: the contract has no migrate',
		]);
		const throwing = await pack({
			...v2,
			migrate: "migrate: () => { throw new Error('boom'); },",
		});
		await expect(replayFixtures(throwing, pair({ message: 'hi' }))).resolves.toEqual([
			'demo.echo@2.0.0 migration from 1: boom',
		]);
	});

	it('needs migrate and a fixture pair for a trigger major that breaks old input', async () => {
		const entry = path.join(dirs.root, 'ping.ts');
		const packPing = async (version: number, input: string, migrate = '') => {
			await writeFile(
				entry,
				`import { defineNode, t } from '@n8n/node-sdk';
const { obj } = t;
const str = () => t.str().title('Text');
const demo = defineNode({ id: 'demo', displayName: 'Demo' });
export const ping = demo.trigger('ping', {
	version: '${version}.0.0',
	trigger: 'On ping',
	summary: 'Starts on each ping.',
	input: ${input},
	output: obj({ text: str() }),
	webhook: {},
	${migrate}
});
`,
			);
			return await packAction(entry, 'ping');
		};
		const prev = (await packPing(1, '{ text: str() }')).manifest;
		const v2 = '{ message: str() }';
		const migrate = 'migrate: (fromMajor, params) => ({ message: params.text }),';
		const pair = (expected: Record<string, unknown>) => ({
			executions: [],
			migrations: [{ fromMajor: 1, params: { text: 'hi' }, expected }],
		});

		await expect(checkPublish(prev, await packPing(2, v2), { executions: [] })).rejects.toThrow(
			'demo.ping@2.0.0 breaks old input, so it needs migrate',
		);
		const migrating = await packPing(2, v2, migrate);
		await expect(checkPublish(prev, migrating, pair({ message: 'hi' }))).resolves.toMatchObject({
			kind: 'major',
		});
		await expect(replayFixtures(migrating, pair({ message: 'ho' }))).resolves.toEqual([
			'demo.ping@2.0.0 migration from 1: got {"message":"hi"}',
		]);
	});

	it('replays with the credential fields of a fixture and refuses a secret there', async () => {
		// Inside this package, so tsx resolves @n8n/node-sdk when pack loads credentials.ts.
		const dir = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		const entry = path.join(dir, 'server.ts');
		await writeFile(
			path.join(dir, 'credentials.ts'),
			`import { t } from '@n8n/node-sdk';
import { defineCredential, field } from '@n8n/node-sdk/credentials';
export const demoToken = defineCredential({ id: 'demo.token', version: '1.0.0', legacyName: 'demoApi', displayName: 'Demo', fields: { server: t.str(), token: field.secret('Token') }, baseUrl: '{server}', auth: (a) => a.bearer('token') });
`,
		);
		await writeFile(
			entry,
			`import { defineNode, path, t } from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';
import { demoToken } from './credentials';
const { obj, str } = t;
const demo = defineNode({
	id: 'demo',
	displayName: 'Demo',
	credential: credential({ types: [demoToken] }),
});
export const read = demo.action('read', {
	action: 'Read',
	summary: 'Read the text.',
	flow: { effect: 'read', cardinality: 'per-item' },
	input: {},
	output: obj({ text: str() }),
	async run({ http }) {
		return { text: String(await http.request({ path: path\`/text\` })) };
	},
});
`,
		);
		const read = await packAction(entry, 'read').finally(
			async () => await rm(dir, { recursive: true, force: true }),
		);
		const packed = {
			...read,
			credentials: credentialTypesOf([read.action]).flatMap(
				(type) => credentialManifestOf(type) ?? [],
			),
		};
		const fixture = (credential?: Record<string, unknown>) => ({
			executions: [
				{
					name: 'read',
					params: {},
					routes: [{ path: '/text', reply: { json: 'hi' } }],
					output: [{ text: 'hi' }],
					credential,
				},
			],
		});

		await expect(
			replayFixtures(packed, fixture({ server: 'https://demo.example.com' })),
		).resolves.toEqual([]);
		await expect(replayFixtures(packed, fixture())).resolves.toEqual([
			expect.stringContaining('demo.read@1.0.0 fixture "read": Credential demoApi'),
		]);
		await expect(
			replayFixtures(packed, fixture({ server: 'https://demo.example.com', token: 't' })),
		).resolves.toEqual([
			'demo.read@1.0.0 fixture "read": A fixture credential holds only fields of demoApi, not token',
		]);
		await expect(
			checkPublish(undefined, packed, fixture({ server: 'https://demo.example.com', token: 't' })),
		).rejects.toThrow('not token');
	});

	it('takes a major without migrate when the old input still fits', async () => {
		const prev = await v1();
		const next = await pack({
			version: '2.0.0',
			input: '{ text: str(), prefix: str().optional() }',
		});
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).resolves.toMatchObject({
			kind: 'minor',
		});
	});
});

describe('published versions', () => {
	const run = async (
		packed: PackedVersion,
		metadata: ITaskMetadata[] = [],
		runtime: HostRuntime = hostRuntime(),
	) => {
		const NodeType = toVersionedNodeType([packed], runtime);
		const result = await new NodeType().getNodeType(1).execute?.call(contextOf(metadata));
		const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
		return items.map((item) => item.json.text);
	};
	const sdk = { bundle: '' };
	beforeAll(async () => {
		sdk.bundle = (await packSdkRuntime()).bundle;
	});
	const packedOf = (manifest: VersionManifest, bundle: string): PackedVersion => ({
		manifest,
		origin: 'first-party',
		readBundle: async () => bundle,
		readSdk: async () => sdk.bundle,
	});

	it('keep their behaviour when a shared helper changes', async () => {
		await writeShout('text.toUpperCase()');
		await writeFile(dirs.entry, echoSource());
		const old = await packAction(dirs.entry, 'echo');
		await checkPublish(undefined, old, fixturesOf('HELLO!'));
		const v100 = old.manifest;

		// The helper changes: other bytes need a new version in the source.
		await writeShout("text + '?'");
		await writeFile(dirs.entry, echoSource({ version: '1.0.1' }));
		const next = await packAction(dirs.entry, 'echo');
		await checkPublish(v100, next, fixturesOf('hello!?'));
		const v101 = next.manifest;
		expect(v101.contractHash).toBe(v100.contractHash);
		expect(v101.bundleHash).not.toBe(v100.bundleHash);

		// A contract change needs a minor or a major in the source.
		await writeFile(
			dirs.entry,
			echoSource({ version: '1.0.2', input: '{ text: str(), prefix: str().optional() }' }),
		);
		await expect(
			checkPublish(v101, await packAction(dirs.entry, 'echo'), fixturesOf('hello!?')),
		).rejects.toThrow('demo.echo@1.0.2 is a patch bump from 1.0.1, but the change is minor');
		await writeFile(dirs.entry, echoSource({ version: '1.0.1' }));

		// Every published version replays its own fixtures through the current executor.
		const issues = await Promise.all([
			replayFixtures(old, fixturesOf('HELLO!')),
			replayFixtures(next, fixturesOf('hello!?')),
		]);
		expect(issues.flat()).toEqual([]);

		const head = await packAction(dirs.entry, 'echo');
		expect(head.manifest).toEqual(v101);
		const pinned = hostRuntime({ versionLoader: async () => packedOf(old.manifest, old.bundle) });
		const metadata: ITaskMetadata[] = [];
		expect(await run(packedOf(head.manifest, head.bundle), metadata, pinned)).toEqual(['HELLO!']);
		expect(metadata).toEqual([
			{
				nodeContract: {
					action: 'demo.echo',
					version: '1.0.0',
					bundleHash: v100.bundleHash,
					nodeContract: v100.nodeContract,
				},
			},
		]);
		expect(await run(packedOf(head.manifest, head.bundle))).toEqual(['hello!?']);
	});

	it('refuse a bundle that does not match its hash', async () => {
		await writeShout('text');
		const { manifest, bundle } = await pack();
		const tampered = { ...manifest, bundleHash: sha256('other bytes') };

		await expect(run(packedOf(tampered, bundle))).rejects.toThrow('does not match');
	});

	it('read the bundle again after a failed read', async () => {
		await writeShout('text');
		const { manifest, bundle } = await pack();
		const reads = { count: 0 };
		const flaky: PackedVersion = {
			manifest,
			origin: 'first-party',
			readBundle: async () => {
				reads.count += 1;
				if (reads.count === 1) throw new Error('offline');
				return bundle;
			},
			readSdk: async () => sdk.bundle,
		};

		const runtime = hostRuntime();
		await expect(run(flaky, [], runtime)).rejects.toThrow('offline');
		expect(await run(flaky, [], runtime)).toEqual(['hello!']);
		expect(reads.count).toBe(2);
	});

	it('keep running a self-contained bundle of Node Contract 2.10.0, which pins no SDK runtime', async () => {
		await writeShout('text');
		await writeFile(dirs.entry, echoSource());
		const { manifest } = await packAction(dirs.entry, 'echo');
		// The bundle inlines the SDK, as pack did before Node Contract 2.11.0.
		const { build } = await import('esbuild');
		const result = await build({
			stdin: {
				contents: `export { echo as default } from ${JSON.stringify(dirs.entry)};`,
				resolveDir: dirs.root,
				loader: 'ts',
			},
			bundle: true,
			write: false,
			format: 'cjs',
			platform: 'neutral',
			mainFields: ['browser', 'module', 'main'],
			external: ['n8n-workflow'],
			alias: { '@n8n/node-sdk': path.resolve(__dirname, '../index.ts') },
		});
		const bundle = result.outputFiles[0]?.text ?? '';
		expect(bundle).not.toContain('require("@n8n/node-sdk")');
		const old: VersionManifest = {
			...manifest,
			nodeContract: '2.10.0',
			sdk: '0.1.0',
			bundleHash: sha256(bundle),
		};
		const selfContained: PackedVersion = {
			manifest: parseManifest(JSON.stringify(old)),
			origin: 'first-party',
			readBundle: async () => bundle,
		};
		expect(await run(selfContained)).toEqual(['hello!']);
	});

	describe('nodeContract', () => {
		it('is 2.11.0 for a bundle that imports the SDK runtime, which the manifest pins', async () => {
			await writeShout('text');
			const { manifest, sdk: runtime } = await pack();
			expect(manifest).toMatchObject({ kind: 'action', nodeContract: '2.11.0' });
			expect(manifest.sdk).toEqual({
				version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
				digest: `sha256:${sha256(runtime ?? '')}`,
			});
		});

		it('is 2.4.0 for a list binding or a page value input', () => {
			const contract = { input: t.obj({ url: t.str() }).json, output: t.obj({}).json };
			const paged = { ...contract, input: t.obj({ next: t.pageValue(t.str()) }).json };
			expect(requiredNodeContractOf(contract)).toBe('2.1.0');
			expect(requiredNodeContractOf(contract, true)).toBe('2.4.0');
			expect(requiredNodeContractOf(paged)).toBe('2.4.0');
		});

		it('is 2.6.0 for an output binary key pattern', () => {
			const input = t.obj({}).json;
			const output = t.indexedBinaries(t.obj({ id: t.str() }), 'attachment_').json;
			expect(requiredNodeContractOf({ input, output })).toBe('2.6.0');
			const branches = t.union(t.obj({ id: t.str() }), t.indexedBinaries(t.obj({}), 'file_')).json;
			expect(requiredNodeContractOf({ input, output: branches })).toBe('2.6.0');
			expect(requiredNodeContractOf({ input, output: t.obj({ file: t.binary() }).json })).toBe(
				'2.2.0',
			);
		});

		it('is 2.7.0 for a runtime image', () => {
			const contract = { input: t.obj({ url: t.str() }).json, output: t.obj({}).json };
			const runtime = { image: `node@sha256:${'a'.repeat(64)}` };
			expect(requiredNodeContractOf({ ...contract, runtime }, true)).toBe('2.7.0');
		});

		it('refuse a bundle outside the range, or of a minor this host lacks', async () => {
			await writeShout('text');
			const { manifest, bundle } = await pack();
			const typeOf = (nodeContract: NodeContractVersion, runtime = hostRuntime()) =>
				toVersionedNodeType([packedOf({ ...manifest, nodeContract }, bundle)], runtime);

			expect(() => typeOf('3.0.0')).toThrow(
				'demo.echo@1.0.0 needs Node Contract 3.0.0. This host runs >=2.0.0 <3.0.0 and implements 2.13.0.',
			);
			expect(() => typeOf('2.14.0')).toThrow('needs Node Contract 2.14.0');
			expect(() => typeOf('2.13.0')).not.toThrow();
			expect(() => typeOf('2.10.0')).not.toThrow();
			expect(() => typeOf('2.8.0')).not.toThrow();
			expect(() => typeOf('2.7.0')).not.toThrow();
			expect(() => typeOf('2.6.0')).not.toThrow();
			expect(() => typeOf('2.5.0')).not.toThrow();
			expect(() => typeOf('2.4.0')).not.toThrow();
			expect(() => typeOf('2.3.0')).not.toThrow();
			expect(() => typeOf('2.2.0')).not.toThrow();
			expect(() => typeOf('2.1.0')).not.toThrow();
			expect(() => typeOf('2.0.3')).not.toThrow();

			expect(() => typeOf('1.0.0', hostRuntime({ nodeContractRange: '>=1.0.0 <3.0.0' }))).toThrow(
				'needs Node Contract 1.0.0. This host runs >=1.0.0 <3.0.0 and implements 2.13.0.',
			);
			// The range also applies at run time, to a version the registry loader picks.
			const picking = hostRuntime({
				nodeContractRange: '>=2.1.0 <3.0.0',
				versionLoader: async () => packedOf({ ...manifest, nodeContract: '2.0.0' }, bundle),
			});
			const NodeType = typeOf('2.9.0', picking);
			await expect(new NodeType().getNodeType(1).execute?.call(contextOf([]))).rejects.toThrow(
				'needs Node Contract 2.0.0',
			);
		});

		it('refuses a manifest without nodeContract and names its version', async () => {
			await writeShout('text');
			const { manifest } = await pack();
			const { nodeContract: _, ...fields } = manifest;
			const unversioned = (extra: Record<string, unknown>) =>
				JSON.stringify({ ...fields, ...extra });
			const refusal =
				'The manifest of demo.echo@1.0.0 has no nodeContract. This host reads only manifests with nodeContract (the format from Node Contract 2.5.0): pack the version again.';

			expect(() => parseManifest(unversioned({ abi: 1 }))).toThrow(refusal);
			expect(() => parseManifest(unversioned({ apiVersion: 'n8n:action@2.4.0' }))).toThrow(refusal);
			expect(() => parseManifest(JSON.stringify({ ...manifest, nodeContract: 'x' }))).toThrow(
				'not valid',
			);
		});

		it('ignores a manifest field that this host does not know', async () => {
			await writeShout('text');
			const { manifest } = await pack();
			expect(parseManifest(JSON.stringify({ ...manifest, later: { x: 1 } }))).toEqual(manifest);
		});

		it('keeps the runtime and refuses an image without a digest', async () => {
			await writeShout('text');
			const { manifest } = await pack();
			const withImage = (image: string) => {
				const contract = { ...manifest.contract, runtime: { image } };
				return { ...manifest, contract, contractHash: contractHash(contract) };
			};
			const imaged = withImage(`node@sha256:${'a'.repeat(64)}`);
			expect(parseManifest(JSON.stringify(imaged))).toEqual(imaged);
			expect(() => parseManifest(JSON.stringify(withImage('node:24-slim')))).toThrow('not valid');
		});

		it('is refused by evaluateBundle for a major or minor this host lacks', async () => {
			await writeShout('text');
			const { bundle, sdk: runtime } = await pack();
			expect(() => evaluateBundle(bundle, '3.0.0', runtime)).toThrow(
				'This host cannot run Node Contract 3.0.0',
			);
			expect(() => evaluateBundle(bundle, '2.14.0', runtime)).toThrow('cannot run');
			expect(() => evaluateBundle(bundle, '1.0.0', runtime)).toThrow(
				'This host cannot run Node Contract 1.0.0. It implements 2.13.0.',
			);
			expect(() => evaluateBundle(bundle, NODE_CONTRACT_VERSION)).toThrow(
				'A packed action cannot import @n8n/node-sdk',
			);
			expect(evaluateBundle(bundle, '2.0.0', runtime).id).toBe('demo.echo');
			expect(evaluateBundle(bundle, '2.1.0', runtime).id).toBe('demo.echo');
			expect(evaluateBundle(bundle, NODE_CONTRACT_VERSION, runtime).id).toBe('demo.echo');
		});
	});
});

describe('semverRange', () => {
	it('tests comparator sets joined by ||', () => {
		const includes = semverRange('>=1.0.0 <3.0.0 || =4.1.0');
		expect(['1.0.0', '2.9.9', '4.1.0'].map(includes)).toEqual([true, true, true]);
		expect(['0.9.9', '3.0.0', '4.1.1'].map(includes)).toEqual([false, false, false]);
	});

	it('refuses a range it cannot read', () => {
		expect(() => semverRange('^2.0.0')).toThrow('is not a semver range');
		expect(() => semverRange('')).toThrow('is not a semver range');
		expect(() => nodeContractRangeOf('>=2')).toThrow('is not a semver range');
	});
});

describe('packPackage', () => {
	const pass = `
import { defineNode, t } from '@n8n/node-sdk';

const demo = defineNode({ id: 'demo', displayName: 'Demo' });

export const pass = demo.action('pass', {
	action: 'Pass',
	summary: 'Pass the item on.',
	flow: { effect: 'transform', cardinality: 'batch' },
	input: {},
	output: t.passedItem(),
	run: ({ items }) => items.map((item) => ({ item })),
});
`;
	it('packs each action of a package', async () => {
		// Inside this package, so the action file resolves @n8n/node-sdk.
		const dir = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		try {
			const entryFile = path.join(dir, 'src', 'nodes', 'demo', 'actions', 'pass.ts');
			await mkdir(path.dirname(entryFile), { recursive: true });
			await writeFile(entryFile, pass);
			// No list of contracts: the build finds them in the action files.
			const pkg = { name: '@acme/nodes', dir };

			const { manifests } = await packPackage(pkg);
			expect(manifests.map(({ id, semver }) => `${id}@${semver}`)).toEqual(['demo.pass@1.0.0']);
			const embedded = storeReader(storeFilesOfDir(path.join(dir, 'dist', 'store')));
			expect((await embedded.records('demo.pass')).map(({ version }) => version)).toEqual([
				'1.0.0',
			]);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('refuses two exports of one action, and an action file without an action', async () => {
		const dir = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		try {
			const actionsDir = path.join(dir, 'src', 'nodes', 'demo', 'actions');
			await mkdir(actionsDir, { recursive: true });
			await writeFile(path.join(actionsDir, 'pass.ts'), pass);
			await writeFile(path.join(actionsDir, 'copy.ts'), pass);
			const pkg = { name: '@acme/nodes', dir };

			await expect(packPackage(pkg)).rejects.toThrow(
				'These contracts of @acme/nodes have more than one export: demo.pass@1 (demo/actions/copy.ts#pass, demo/actions/pass.ts#pass)',
			);
			await rm(path.join(actionsDir, 'copy.ts'));
			await writeFile(path.join(actionsDir, 'label.ts'), 'export const label = "Pass";\n');
			await expect(packPackage(pkg)).rejects.toThrow(
				'These action files of @acme/nodes export no action or trigger: demo/actions/label.ts.',
			);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
