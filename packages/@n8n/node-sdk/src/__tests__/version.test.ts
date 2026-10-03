import { generateKeyPairSync } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import { freezeAction, type FrozenAction } from '../freeze';
import { generateNodeModule } from '../entry/codegen';
import {
	setContractVersionLoader,
	setNodeContractRange,
	toVersionedNodeType,
	type FrozenVersion,
} from '../entry/host';
import {
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
import { defineNode, provider, t, type ActionFlow, type Shape } from '../index';
import { checkPublish, lastPublishedIn, publishAction, replayFixtures } from '../publish';
import { storeFilesOfDir, storeReader } from '../store';
import { evaluateBundle } from '../runtime';
import type { AnySchema } from '../schema';
import {
	DEFAULT_NODE_CONTRACT_RANGE,
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
			JSON.stringify({ executions: [{ name: 'a', params: {}, responses: [], ...expected }] });
		expect(parseFixtures(fixture({ output: [] })).executions).toHaveLength(1);
		expect(parseFixtures(fixture({ outputs: [[], []] })).executions).toHaveLength(1);
		expect(() => parseFixtures(fixture({}))).toThrow('not valid');
		expect(() => parseFixtures(fixture({ output: [], outputs: [[]] }))).toThrow('not valid');
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

	it('classifies an added or removed resource pointer, or another resource, as a major', () => {
		const call = {
			nodeType: 'n8n-nodes-base.demo',
			version: 2,
			methodName: 'getFields',
			parameters: {},
			idParameter: 'id',
		};
		const pointer = { method: 'demo.fields', input: 'text', loadOptions: [call] };
		const pointed = (resource: typeof pointer) => ({
			...base,
			output: { ...base.output, 'x-n8n-resource': resource },
		});
		expect(diffContracts(base, pointed(pointer)).changes).toEqual([
			{ kind: 'major', text: 'output adds x-n8n-resource' },
		]);
		expect(diffContracts(pointed(pointer), base).kind).toBe('major');
		expect(diffContracts(pointed(pointer), pointed({ ...pointer, input: 'mode' })).kind).toBe(
			'major',
		);
		const fallback = { ...pointer, loadOptions: [call, { ...call, version: 1 }] };
		expect(diffContracts(pointed(pointer), pointed(fallback)).changes).toEqual([
			{ kind: 'minor', text: 'output changes the x-n8n-resource loadOptions' },
		]);
		expect(contractHash(pointed(pointer))).not.toBe(contractHash(base));
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
	version?: number;
	minor?: number;
	input?: string;
	text?: string;
	migrate?: string;
}

const echoSource = ({
	version = 1,
	minor = 0,
	input = '{ text: str() }',
	text = 'input.text',
	migrate = '',
}: EchoOptions = {}) => `
import { defineNode, path, t } from '@n8n/node-sdk';
const { obj, str } = t;
import { shout } from './shout';

const demo = defineNode({ id: 'demo', displayName: 'Demo', baseUrl: 'https://demo.test' });

export const echo = demo.action('echo', {
	version: ${version},
	minor: ${minor},
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

const fixturesOf = (output: string, extra: Partial<ContractFixtures> = {}): ContractFixtures => ({
	executions: [
		{ name: 'echo', params: { text: 'hello' }, responses: ['!'], output: [{ text: output }] },
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

const freeze = async (options: EchoOptions = {}, last?: VersionManifest) => {
	await writeFile(dirs.entry, echoSource(options));
	return await freezeAction(dirs.entry, 'echo', async () => last);
};

/** A frozen version of the same contract with other bytes. */
const olderBundleOf = (manifest: VersionManifest, semver = manifest.semver): VersionManifest => ({
	...manifest,
	semver,
	bundleHash: sha256('older bytes'),
});

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
	it('computes the patch from the last version of the same major and minor', async () => {
		await writeShout('text.toUpperCase()');
		const { manifest } = await freeze();
		const semverAfter = async (last: VersionManifest, options: EchoOptions = {}) =>
			(await freeze(options, last)).manifest.semver;

		expect(manifest.semver).toBe('1.0.0');
		expect(await semverAfter(manifest)).toBe('1.0.0');
		expect(await semverAfter(olderBundleOf(manifest))).toBe('1.0.1');
		expect(await semverAfter(olderBundleOf(manifest, '1.0.4'))).toBe('1.0.5');
		expect(await semverAfter(olderBundleOf(manifest, '1.0.4'), { minor: 1 })).toBe('1.1.0');
	});

	it('asks for the last version of the major and minor of the source', async () => {
		await writeShout('text.toUpperCase()');
		const asked: unknown[] = [];
		await writeFile(dirs.entry, echoSource({ version: 2, minor: 3 }));
		await freezeAction(dirs.entry, 'echo', async (...head) => {
			asked.push(head);
			return undefined;
		});
		expect(asked).toEqual([['demo.echo', 2, 3]]);
	});

	it('takes no patch in the source', () => {
		demo.action('echo', {
			// @ts-expect-error freeze computes the patch
			patch: 1,
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
		const next = await freeze({ minor: 1, input: '{ text: str(), prefix: str() }' });
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).rejects.toThrow(
			'is a minor bump from 1.0.0, but the change is major (major: input.prefix added as required)',
		);
	});

	it('refuses a patch whose contract hash moved', async () => {
		const prev = await v1();
		const next = await freeze({}, olderBundleOf(prev));
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

	it('refuses an older version and failing fixtures', async () => {
		const prev = await v1();
		await expect(checkPublish(prev, await freeze(), fixturesOf('HELLO!'))).rejects.toThrow(
			'must be newer',
		);
		const patch = await freeze({}, olderBundleOf(prev));
		await expect(checkPublish(prev, patch, fixturesOf('hello!'))).rejects.toThrow(
			'demo.echo@1.0.1 fails its fixtures: demo.echo@1.0.1 fixture "echo": output [{"text":"HELLO!"}]',
		);
		await expect(checkPublish(prev, patch, { executions: [] })).rejects.toThrow(
			'needs an execution fixture',
		);
	});

	it('reports fixture params that the action does not declare', async () => {
		await writeShout('text.toUpperCase()');
		const frozen = await freeze();
		const fixtures = (params: Record<string, unknown>) => ({
			executions: [{ name: 'echo', params, responses: ['!'], output: [{ text: 'HELLO!' }] }],
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
					responses: [],
					output: [],
					error: 'No recorded response is left',
				},
			],
		};
		await expect(replayFixtures(frozen, failing)).resolves.toEqual([
			'demo.echo@1.0.0 fixture "echo": params not declared: txt',
		]);
	});

	it('needs migrate and a fixture pair for a major that breaks old input', async () => {
		const prev = await v1();
		const v2 = { version: 2, input: '{ message: str() }', text: 'input.message' };
		const migrate = 'migrate: (fromMajor, params) => ({ message: params.text }),';
		const executions = [
			{
				name: 'echo',
				params: { message: 'hello' },
				responses: ['!'],
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
	});

	it('needs migrate and a fixture pair for a trigger major that breaks old input', async () => {
		const entry = path.join(dirs.root, 'ping.ts');
		const freezePing = async (version: number, input: string, migrate = '') => {
			await writeFile(
				entry,
				`import { defineNode, t } from '@n8n/node-sdk';
const { obj, str } = t;
const demo = defineNode({ id: 'demo', displayName: 'Demo' });
export const ping = demo.trigger('ping', {
	version: ${version},
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
				{ name: 'read', params: {}, responses: ['hi'], output: [{ text: 'hi' }], credential },
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
		const next = await freeze({ version: 2, input: '{ text: str(), prefix: str().optional() }' });
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
	const run = async (frozen: FrozenVersion, metadata: ITaskMetadata[] = []) => {
		const NodeType = toVersionedNodeType([frozen]);
		const result = await new NodeType().getNodeType(1).execute?.call(contextOf(metadata));
		const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
		return items.map((item) => item.json.text);
	};
	const frozenOf = (manifest: VersionManifest, bundle: string): FrozenVersion => ({
		manifest,
		readBundle: async () => bundle,
	});

	afterEach(() => setContractVersionLoader(async (_context, head) => head));

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

		// The helper changes: the same contract with other bytes ships as the next patch.
		await writeShout("text + '?'");
		const v101 = await publish(fixturesOf('hello!?'));
		expect(v101.semver).toBe('1.0.1');
		expect(v101.contractHash).toBe(v100.contractHash);
		expect(v101.bundleHash).not.toBe(v100.bundleHash);
		await expect(publish(fixturesOf('hello!?'))).resolves.toEqual(v101);

		// A contract change needs a minor or a major in the source.
		await writeFile(dirs.entry, echoSource({ input: '{ text: str(), prefix: str().optional() }' }));
		await expect(publish(fixturesOf('hello!?'))).rejects.toThrow(
			'demo.echo@1.0.2 is a patch bump from 1.0.1, but the change is minor',
		);
		await writeFile(dirs.entry, echoSource());

		const registry = storeReader(storeFilesOfDir(dirs.registry));
		const opened = await Promise.all(
			(await registry.records('demo.echo')).map(async (record) => {
				const read = await registry.readManifest(record);
				const [bundle, fixtures] = await Promise.all(
					[record.bundle, record.fixtures].map(async (digest) =>
						(await registry.blob(digest ?? ''))?.toString('utf8'),
					),
				);
				if (read?.manifest.kind === 'credential' || !read || !bundle || !fixtures) {
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
		const indexOnly = {
			...registry,
			blob: async () => await Promise.reject(new Error('no blob')),
			readManifest: async () => await Promise.reject(new Error('no manifest')),
		};
		const head = await freezeAction(dirs.entry, 'echo', lastPublishedIn(indexOnly));
		expect(head.manifest).toEqual(v101);
		if (!old) throw new Error('1.0.0 is not published');
		setContractVersionLoader(async () => frozenOf(old.manifest, old.bundle));
		const metadata: ITaskMetadata[] = [];
		expect(await run(frozenOf(head.manifest, head.bundle), metadata)).toEqual(['HELLO!']);
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
		setContractVersionLoader(async (_context, bundled) => bundled);
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
			readBundle: async () => {
				reads.count += 1;
				if (reads.count === 1) throw new Error('offline');
				return bundle;
			},
		};

		await expect(run(flaky)).rejects.toThrow('offline');
		expect(await run(flaky)).toEqual(['hello!']);
		expect(reads.count).toBe(2);
	});

	describe('nodeContract', () => {
		afterEach(() => setNodeContractRange(DEFAULT_NODE_CONTRACT_RANGE));

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

		it('refuse a bundle outside the range, or of a minor this host lacks', async () => {
			await writeShout('text');
			const { manifest, bundle } = await freeze();
			const typeOf = (nodeContract: NodeContractVersion) =>
				toVersionedNodeType([frozenOf({ ...manifest, nodeContract }, bundle)]);

			expect(() => typeOf('3.0.0')).toThrow(
				'demo.echo@1.0.0 needs Node Contract 3.0.0. This host runs >=2.0.0 <3.0.0 and implements 2.6.0.',
			);
			expect(() => typeOf('2.7.0')).toThrow('needs Node Contract 2.7.0');
			expect(() => typeOf('2.6.0')).not.toThrow();
			expect(() => typeOf('2.5.0')).not.toThrow();
			expect(() => typeOf('2.4.0')).not.toThrow();
			expect(() => typeOf('2.3.0')).not.toThrow();
			expect(() => typeOf('2.2.0')).not.toThrow();
			expect(() => typeOf('2.1.0')).not.toThrow();
			expect(() => typeOf('2.0.3')).not.toThrow();

			setNodeContractRange('>=1.0.0 <3.0.0');
			expect(() => typeOf('1.0.0')).toThrow(
				'needs Node Contract 1.0.0. This host runs >=1.0.0 <3.0.0 and implements 2.6.0.',
			);
			// The range also applies at run time, to a version the registry loader picks.
			setNodeContractRange(DEFAULT_NODE_CONTRACT_RANGE);
			const NodeType = typeOf('2.0.0');
			setNodeContractRange('>=1.0.0 <2.0.0');
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

		it('is refused by evaluateBundle for a major or minor this host lacks', async () => {
			await writeShout('text');
			const { bundle } = await freeze();
			expect(() => evaluateBundle(bundle, '3.0.0')).toThrow(
				'This host cannot run Node Contract 3.0.0',
			);
			expect(() => evaluateBundle(bundle, '2.7.0')).toThrow('cannot run');
			expect(() => evaluateBundle(bundle, '1.0.0')).toThrow(
				'This host cannot run Node Contract 1.0.0. It implements 2.6.0.',
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
		expect(() => setNodeContractRange('>=2')).toThrow('is not a semver range');
	});
});
