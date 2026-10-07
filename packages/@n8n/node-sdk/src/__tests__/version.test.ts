import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import { freezeAction, freezePackage, type FrozenAction } from '../freeze';
import { generateNodeModule } from '../entry/codegen';
import {
	hostRuntime,
	nodeContractRangeOf,
	toVersionedNodeType,
	type FrozenVersion,
	type HostRuntime,
} from '../entry/host';
import {
	addedPermissionsOf,
	contractHash,
	diffContracts,
	parseFixtures,
	parseManifest,
	resolveContractVersion,
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
import { checkPublish, publishAction, publishPackage, replayFixtures } from '../publish';
import { isVersionManifest, parseStoreIndex, storeFilesOfDir, storeReader } from '../store';
import { evaluateBundle } from '../runtime';
import type { AnySchema } from '../schema';
import type { MockRoute } from '../testing';
import { NODE_CONTRACT_VERSION, requiredNodeContractOf, semverRange, sha256 } from '../version';

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
					item: { id: '{id}', label: '{id}' },
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
		// A frozen pointer of the legacy shape, with load-options calls.
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
							item: { name: '{name}', value: '{name}' },
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

const keys = generateKeyPairSync('ed25519');
const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

const contextOf = (metadata: ITaskMetadata[] = []) =>
	({
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Echo', credentials: {} }),
		getNodeParameter: () => 'hello',
		continueOnFail: () => false,
		setMetadata: (value: ITaskMetadata) => metadata.push(value),
		helpers: { httpRequest: async () => '!' },
	}) as unknown as IExecuteFunctions;

const dirs = { root: '', registry: '', entry: '', shout: '' };

const freeze = async (options: EchoOptions = {}) => {
	await writeFile(dirs.entry, echoSource(options));
	return await freezeAction(dirs.entry, 'echo');
};

const writeShout = async (body: string) =>
	await writeFile(dirs.shout, `export const shout = (text: string) => ${body};\n`);

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'node-sdk-publish-'));
	dirs.registry = path.join(dirs.root, 'registry');
	dirs.entry = path.join(dirs.root, 'echo.ts');
	dirs.shout = path.join(dirs.root, 'shout.ts');
});

afterAll(async () => {
	await rm(dirs.root, { recursive: true, force: true });
});

describe('freezeAction', () => {
	it('writes the version of the source, with its major as the contract version', async () => {
		await writeShout('text.toUpperCase()');
		expect((await freeze()).manifest).toMatchObject({ semver: '1.0.0', contract: { version: 1 } });
		expect((await freeze({ version: '2.3.1' })).manifest).toMatchObject({
			semver: '2.3.1',
			contract: { version: 2 },
		});
		await expect(freeze({ version: '2.3' })).rejects.toThrow(
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
		return (await freeze()).manifest;
	};

	it('refuses a bump lower than the computed change', async () => {
		const prev = await v1();
		const next = await freeze({ version: '1.1.0', input: '{ text: str(), prefix: str() }' });
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).rejects.toThrow(
			'is a minor bump from 1.0.0, but the change is major (major: input.prefix added as required)',
		);
	});

	it('refuses a patch whose contract hash moved', async () => {
		const prev = await v1();
		const next = await freeze({ version: '1.0.1' });
		const moved: FrozenAction = {
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
		const prev = (await freeze({ input })).manifest;
		const next = await freeze({ input, version: '1.0.1' });
		const withUi = (ui: VersionManifest['ui']): FrozenAction => ({
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
		await expect(checkPublish(prev, await freeze(), fixturesOf('HELLO!'))).rejects.toThrow(
			'must be newer',
		);
		const patch = await freeze({ version: '1.0.1' });
		await expect(checkPublish(prev, patch, fixturesOf('hello!'))).rejects.toThrow(
			'demo.echo@1.0.1 fails its fixtures: demo.echo@1.0.1 fixture "echo": output [{"text":"HELLO!"}]',
		);
		await expect(checkPublish(prev, patch, { executions: [] })).rejects.toThrow(
			'needs an execution fixture',
		);
	});

	it('refuses an input field without a title', async () => {
		await writeShout('text.toUpperCase()');
		const untitled = await freeze({ input: '{ text: t.str(), rows: t.arr(obj({ a: str() })) }' });
		await expect(checkPublish(undefined, untitled, fixturesOf('HELLO!'))).rejects.toThrow(
			'demo.echo@1.0.0 needs field titles: demo.echo: input.text has no title; demo.echo: input.rows has no title',
		);
	});

	it('reports fixture params that the action does not declare', async () => {
		await writeShout('text.toUpperCase()');
		const frozen = await freeze();
		const fixtures = (params: Record<string, unknown>) => ({
			executions: [{ name: 'echo', params, routes: suffixRoutes, output: [{ text: 'HELLO!' }] }],
		});

		await expect(replayFixtures(frozen, fixtures({ text: 'hello' }))).resolves.toEqual([]);
		await expect(replayFixtures(frozen, fixtures({ text: 'hello', txt: 'x' }))).resolves.toEqual([
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
		await expect(replayFixtures(frozen, failing)).resolves.toEqual([
			'demo.echo@1.0.0 fixture "echo": params not declared: txt',
		]);
	});

	it('answers each request from the route of its method and path', async () => {
		await writeShout('text.toUpperCase()');
		const frozen = await freeze();
		const fixtures = (routes: MockRoute[]) => ({
			executions: [{ name: 'echo', params: { text: 'hi' }, routes, output: [{ text: 'HI!' }] }],
		});

		await expect(
			replayFixtures(
				frozen,
				fixtures([
					{ method: 'POST', path: '/suffix', reply: { json: '?' } },
					{ path: '/other', reply: { json: '?' } },
					...suffixRoutes,
				]),
			),
		).resolves.toEqual([]);
		await expect(
			replayFixtures(frozen, fixtures([{ path: '/suffix', reply: { status: 404, json: {} } }])),
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

		await expect(checkPublish(prev, await freeze(v2), { executions })).rejects.toThrow(
			'demo.echo@2.0.0 breaks old input, so it needs migrate',
		);
		const migrating = await freeze({ ...v2, migrate });
		await expect(checkPublish(prev, migrating, { executions })).rejects.toThrow(
			'needs a migration fixture from major 1',
		);
		await expect(checkPublish(prev, migrating, pair({ message: 'hi' }))).resolves.toMatchObject({
			kind: 'major',
		});
		await expect(replayFixtures(migrating, pair({ message: 'ho' }))).resolves.toEqual([
			'demo.echo@2.0.0 migration from 1: got {"message":"hi"}',
		]);
		await expect(replayFixtures(await freeze(v2), pair({ message: 'hi' }))).resolves.toEqual([
			'demo.echo@2.0.0 migration from 1: the contract has no migrate',
		]);
		const throwing = await freeze({
			...v2,
			migrate: "migrate: () => { throw new Error('boom'); },",
		});
		await expect(replayFixtures(throwing, pair({ message: 'hi' }))).resolves.toEqual([
			'demo.echo@2.0.0 migration from 1: boom',
		]);
	});

	it('needs migrate and a fixture pair for a trigger major that breaks old input', async () => {
		const entry = path.join(dirs.root, 'ping.ts');
		const freezePing = async (version: number, input: string, migrate = '') => {
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
			return await freezeAction(entry, 'ping');
		};
		const prev = (await freezePing(1, '{ text: str() }')).manifest;
		const v2 = '{ message: str() }';
		const migrate = 'migrate: (fromMajor, params) => ({ message: params.text }),';
		const pair = (expected: Record<string, unknown>) => ({
			executions: [],
			migrations: [{ fromMajor: 1, params: { text: 'hi' }, expected }],
		});

		await expect(checkPublish(prev, await freezePing(2, v2), { executions: [] })).rejects.toThrow(
			'demo.ping@2.0.0 breaks old input, so it needs migrate',
		);
		const migrating = await freezePing(2, v2, migrate);
		await expect(checkPublish(prev, migrating, pair({ message: 'hi' }))).resolves.toMatchObject({
			kind: 'major',
		});
		await expect(replayFixtures(migrating, pair({ message: 'ho' }))).resolves.toEqual([
			'demo.ping@2.0.0 migration from 1: got {"message":"hi"}',
		]);
	});

	it('replays with the credential fields of a fixture and refuses a secret there', async () => {
		const entry = path.join(dirs.root, 'server.ts');
		await writeFile(
			entry,
			`import { defineNode, path, t } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';
const { obj, str } = t;
const demo = defineNode({
	id: 'demo',
	displayName: 'Demo',
	credential: credential({
		types: [defineCredential({ id: 'demo.token', legacyName: 'demoApi', displayName: 'Demo', fields: { server: str(), token: field.secret('Token') }, baseUrl: '{server}', auth: (a) => a.bearer('token') })],
	}),
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
		const frozen = await freezeAction(entry, 'read');
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
			replayFixtures(frozen, fixture({ server: 'https://demo.example.com' })),
		).resolves.toEqual([]);
		await expect(replayFixtures(frozen, fixture())).resolves.toEqual([
			expect.stringContaining('demo.read@1.0.0 fixture "read": Credential demoApi'),
		]);
		await expect(
			replayFixtures(frozen, fixture({ server: 'https://demo.example.com', token: 't' })),
		).resolves.toEqual([
			'demo.read@1.0.0 fixture "read": A fixture credential holds only fields of demoApi, not token',
		]);
		await expect(
			checkPublish(undefined, frozen, fixture({ server: 'https://demo.example.com', token: 't' })),
		).rejects.toThrow('not token');
	});

	it('takes a major without migrate when the old input still fits', async () => {
		const prev = await v1();
		const next = await freeze({
			version: '2.0.0',
			input: '{ text: str(), prefix: str().optional() }',
		});
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).resolves.toMatchObject({
			kind: 'minor',
		});
	});
});

describe('resolveContractVersion', () => {
	const manifest = (semver: string, contract = 'c1'): VersionManifest =>
		({
			id: 'demo.echo',
			semver,
			contractHash: contract,
			bundleHash: `b${semver}`,
		}) as VersionManifest;
	const lock = { action: 'demo.echo', version: '1.2.0', bundleHash: 'b1.2.0', contractHash: 'c1' };
	const manifests = [
		manifest('1.2.0'),
		manifest('1.2.1'),
		manifest('1.2.2'),
		manifest('1.2.3', 'c2'),
		manifest('1.3.0'),
		manifest('2.0.0'),
	];

	it('runs the locked bundle when strict', () => {
		expect(resolveContractVersion(lock, 'strict', manifests).semver).toBe('1.2.0');
	});

	it('runs the newest patch with the locked contract hash when tolerant', () => {
		expect(resolveContractVersion(lock, 'tolerant', manifests).semver).toBe('1.2.2');
		expect(resolveContractVersion(lock, 'tolerant', [manifest('1.2.1')]).semver).toBe('1.2.1');
	});

	it('names the action, version, and hash when nothing matches', () => {
		expect(() => resolveContractVersion(lock, 'strict', [manifest('1.2.1')])).toThrow(
			'No trusted version of demo.echo matches 1.2.0 (bundle b1.2.0)',
		);
	});
});

describe('published versions', () => {
	const run = async (
		frozen: FrozenVersion,
		metadata: ITaskMetadata[] = [],
		runtime: HostRuntime = hostRuntime(),
	) => {
		const NodeType = toVersionedNodeType([frozen], runtime);
		const result = await new NodeType().getNodeType(1).execute?.call(contextOf(metadata));
		const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
		return items.map((item) => item.json.text);
	};
	const frozenOf = (manifest: VersionManifest, bundle: string): FrozenVersion => ({
		manifest,
		origin: 'first-party',
		readBundle: async () => bundle,
	});

	it('keep their behaviour when a shared helper changes', async () => {
		const publish = async (fixtures: ContractFixtures) =>
			await publishAction({
				entryFile: dirs.entry,
				exportName: 'echo',
				fixtures,
				registryDir: dirs.registry,
				privateKey,
			});
		await writeShout('text.toUpperCase()');
		await writeFile(dirs.entry, echoSource());
		const v100 = await publish(fixturesOf('HELLO!'));
		// The same bytes again: a no-op.
		await expect(publish(fixturesOf('HELLO!'))).resolves.toEqual(v100);

		// The helper changes: other bytes need a new version in the source.
		await writeShout("text + '?'");
		await expect(publish(fixturesOf('hello!?'))).rejects.toThrow(
			'demo.echo@1.0.0 is published with other bytes; bump the version in source',
		);
		await writeFile(dirs.entry, echoSource({ version: '1.0.1' }));
		const v101 = await publish(fixturesOf('hello!?'));
		expect(v101.semver).toBe('1.0.1');
		expect(v101.contractHash).toBe(v100.contractHash);
		expect(v101.bundleHash).not.toBe(v100.bundleHash);
		await expect(publish(fixturesOf('hello!?'))).resolves.toEqual(v101);

		// A contract change needs a minor or a major in the source.
		await writeFile(
			dirs.entry,
			echoSource({ version: '1.0.2', input: '{ text: str(), prefix: str().optional() }' }),
		);
		await expect(publish(fixturesOf('hello!?'))).rejects.toThrow(
			'demo.echo@1.0.2 is a patch bump from 1.0.1, but the change is minor',
		);
		await writeFile(dirs.entry, echoSource({ version: '1.0.1' }));

		const registry = storeReader(storeFilesOfDir(dirs.registry));
		const opened = await Promise.all(
			(await registry.records('demo.echo')).map(async (record) => {
				const read = await registry.readManifest(record);
				const [bundle, fixtures] = await Promise.all(
					[record.bundle, record.fixtures].map(async (digest) =>
						(await registry.blob(digest ?? ''))?.toString('utf8'),
					),
				);
				if (!read || !isVersionManifest(read.manifest) || !bundle || !fixtures) {
					throw new Error(`${record.version} is not complete`);
				}
				return { manifest: read.manifest, bundle, fixtures: parseFixtures(fixtures) };
			}),
		);
		// Every published version replays its own fixtures through the current executor.
		const issues = await Promise.all(
			opened.map(async (version) => await replayFixtures(version, version.fixtures)),
		);
		expect(issues.flat()).toEqual([]);

		const old = opened.find(({ manifest }) => manifest.semver === '1.0.0');
		const head = await freezeAction(dirs.entry, 'echo');
		expect(head.manifest).toEqual(v101);
		if (!old) throw new Error('1.0.0 is not published');
		const pinned = hostRuntime({ versionLoader: async () => frozenOf(old.manifest, old.bundle) });
		const metadata: ITaskMetadata[] = [];
		expect(await run(frozenOf(head.manifest, head.bundle), metadata, pinned)).toEqual(['HELLO!']);
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
		expect(await run(frozenOf(head.manifest, head.bundle))).toEqual(['hello!?']);
	});

	it('refuse a bundle that does not match its hash', async () => {
		await writeShout('text');
		const { manifest, bundle } = await freeze();
		const tampered = { ...manifest, bundleHash: sha256('other bytes') };

		await expect(run(frozenOf(tampered, bundle))).rejects.toThrow('does not match');
	});

	it('read the bundle again after a failed read', async () => {
		await writeShout('text');
		const { manifest, bundle } = await freeze();
		const reads = { count: 0 };
		const flaky: FrozenVersion = {
			manifest,
			origin: 'first-party',
			readBundle: async () => {
				reads.count += 1;
				if (reads.count === 1) throw new Error('offline');
				return bundle;
			},
		};

		const runtime = hostRuntime();
		await expect(run(flaky, [], runtime)).rejects.toThrow('offline');
		expect(await run(flaky, [], runtime)).toEqual(['hello!']);
		expect(reads.count).toBe(2);
	});

	describe('nodeContract', () => {
		it('is the version freezeAction writes: 2.1.0 without binary data', async () => {
			await writeShout('text');
			const { manifest } = await freeze();
			expect(manifest).toMatchObject({ kind: 'action', nodeContract: '2.1.0' });
			expect(manifest.sdk).toMatch(/^\d+\.\d+\.\d+$/);
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
			const { manifest, bundle } = await freeze();
			const typeOf = (nodeContract: NodeContractVersion, runtime = hostRuntime()) =>
				toVersionedNodeType([frozenOf({ ...manifest, nodeContract }, bundle)], runtime);

			expect(() => typeOf('3.0.0')).toThrow(
				'demo.echo@1.0.0 needs Node Contract 3.0.0. This host runs >=2.0.0 <3.0.0 and implements 2.10.0.',
			);
			expect(() => typeOf('2.11.0')).toThrow('needs Node Contract 2.11.0');
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
				'needs Node Contract 1.0.0. This host runs >=1.0.0 <3.0.0 and implements 2.10.0.',
			);
			// The range also applies at run time, to a version the registry loader picks.
			const picking = hostRuntime({
				nodeContractRange: '>=2.1.0 <3.0.0',
				versionLoader: async () => frozenOf({ ...manifest, nodeContract: '2.0.0' }, bundle),
			});
			const NodeType = typeOf('2.9.0', picking);
			await expect(new NodeType().getNodeType(1).execute?.call(contextOf([]))).rejects.toThrow(
				'needs Node Contract 2.0.0',
			);
		});

		it('refuses a manifest without nodeContract and names its version', async () => {
			await writeShout('text');
			const { manifest } = await freeze();
			const { nodeContract: _, ...fields } = manifest;
			const unversioned = (extra: Record<string, unknown>) =>
				JSON.stringify({ ...fields, ...extra });
			const refusal =
				'The manifest of demo.echo@1.0.0 has no nodeContract. This host reads only manifests with nodeContract (the format from Node Contract 2.5.0): freeze the version again.';

			expect(() => parseManifest(unversioned({ abi: 1 }))).toThrow(refusal);
			expect(() => parseManifest(unversioned({ apiVersion: 'n8n:action@2.4.0' }))).toThrow(refusal);
			expect(() => parseManifest(JSON.stringify({ ...manifest, nodeContract: 'x' }))).toThrow(
				'not valid',
			);
		});

		it('ignores a manifest field that this host does not know', async () => {
			await writeShout('text');
			const { manifest } = await freeze();
			expect(parseManifest(JSON.stringify({ ...manifest, later: { x: 1 } }))).toEqual(manifest);
		});

		it('keeps the runtime and refuses an image without a digest', async () => {
			await writeShout('text');
			const { manifest } = await freeze();
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
			const { bundle } = await freeze();
			expect(() => evaluateBundle(bundle, '3.0.0')).toThrow(
				'This host cannot run Node Contract 3.0.0',
			);
			expect(() => evaluateBundle(bundle, '2.11.0')).toThrow('cannot run');
			expect(() => evaluateBundle(bundle, '1.0.0')).toThrow(
				'This host cannot run Node Contract 1.0.0. It implements 2.10.0.',
			);
			expect(evaluateBundle(bundle, '2.0.0').id).toBe('demo.echo');
			expect(evaluateBundle(bundle, '2.1.0').id).toBe('demo.echo');
			expect(evaluateBundle(bundle, NODE_CONTRACT_VERSION).id).toBe('demo.echo');
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

describe('freezePackage and publishPackage', () => {
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
	const fixtures: ContractFixtures = {
		executions: [{ name: 'pass', params: {}, items: [{ a: 1 }], output: [{ a: 1 }] }],
	};

	afterEach(() => vi.unstubAllEnvs());

	it('freeze and publish each action of a package, and sign a status line', async () => {
		// Inside this package, so the action file resolves @n8n/node-sdk.
		const dir = await mkdtemp(path.join(__dirname, '..', '..', '.package-test-'));
		try {
			const entryFile = path.join(dir, 'src', 'nodes', 'demo', 'actions', 'pass.ts');
			const registryDir = path.join(dir, 'registry');
			const keyFile = path.join(dir, 'key.pem');
			await mkdir(path.dirname(entryFile), { recursive: true });
			await mkdir(path.join(dir, 'fixtures'));
			await writeFile(entryFile, pass);
			await writeFile(path.join(dir, 'fixtures', 'demo.pass.json'), JSON.stringify(fixtures));
			await writeFile(keyFile, privateKey);
			// No list of contracts: freeze and publish find them in the action files.
			const pkg = { name: '@acme/nodes', dir };
			vi.stubEnv('N8N_NODE_CONTRACTS_REGISTRY_URL', `file://${registryDir}`);
			vi.stubEnv('N8N_NODE_CONTRACTS_SIGNING_KEY_FILE', keyFile);
			const log: string[] = [];

			await publishPackage(pkg, [], (line) => log.push(line));
			await publishPackage(pkg, [], (line) => log.push(line));
			const { manifests } = await freezePackage(pkg);
			await publishPackage(pkg, ['yank', 'demo.pass@1.0.0', 'broken'], (line) => log.push(line));

			expect(log.slice(0, 2)).toEqual(['demo.pass@1.0.0', 'demo.pass@1.0.0']);
			expect(JSON.parse(log[2] ?? '')).toMatchObject({ id: 'demo.pass', yank: '1.0.0' });
			expect(manifests.map(({ id, semver }) => `${id}@${semver}`)).toEqual(['demo.pass@1.0.0']);
			const embedded = storeReader(storeFilesOfDir(path.join(dir, 'dist', 'store')));
			expect((await embedded.records('demo.pass')).map(({ version }) => version)).toEqual([
				'1.0.0',
			]);
			const index = await readFile(path.join(registryDir, 'index', 'demo.pass.ndjson'), 'utf8');
			expect(parseStoreIndex(index, 'demo.pass').map(({ version }) => version)).toEqual(['1.0.0']);
			await expect(
				publishPackage(pkg, ['yank', 'demo.pass'], (line) => log.push(line)),
			).rejects.toThrow('Usage:');
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

			await expect(freezePackage(pkg)).rejects.toThrow(
				'These contracts of @acme/nodes have more than one export: demo.pass@1 (demo/actions/copy.ts#pass, demo/actions/pass.ts#pass)',
			);
			await rm(path.join(actionsDir, 'copy.ts'));
			await writeFile(path.join(actionsDir, 'label.ts'), 'export const label = "Pass";\n');
			await expect(freezePackage(pkg)).rejects.toThrow(
				'These action files of @acme/nodes export no action or trigger: demo/actions/label.ts.',
			);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
