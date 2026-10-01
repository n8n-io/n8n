import { generateKeyPairSync } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import { freezeAction, type FrozenAction } from '../freeze';
import {
	arr,
	bool,
	contractHash,
	defineNode,
	diffContracts,
	generateNodeModule,
	integrityOf,
	obj,
	openContractPackage,
	packageNameOf,
	resolveContractVersion,
	setContractVersionLoader,
	str,
	toContract,
	toVersionedNodeType,
	verifyManifestSignature,
	type ActionFlow,
	type ContractFixtures,
	type FrozenVersion,
	type Shape,
	type VersionManifest,
} from '../index';
import {
	checkPublish,
	packContractPackage,
	publishAction,
	replayFixtures,
	type ContractRegistry,
} from '../publish';
import type { AnySchema } from '../schema';
import { sha256 } from '../version';

const demo = defineNode({ id: 'demo', displayName: 'Demo', credentials: [] });
const FLOW: ActionFlow = { effect: 'transform', cardinality: 'per-item' };

const contractOf = ({
	input = { text: str() },
	output = obj({ text: str() }),
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
			input: { text: str().hint('The text').describe('Some prose') },
			output: obj({ text: str().hint('Echoed') }),
		});
		expect(contractHash(hinted)).toBe(contractHash(base));
	});

	it('moves with the flow, the major, and the schema', () => {
		expect(contractHash(contractOf({ flow: { ...FLOW, effect: 'read' } }))).not.toBe(
			contractHash(base),
		);
		expect(contractHash({ ...base, version: 2 })).not.toBe(contractHash(base));
		expect(contractHash(contractOf({ input: { text: str().optional() } }))).not.toBe(
			contractHash(base),
		);
	});
});

describe('diffContracts', () => {
	const base = contractOf({ input: { text: str(), mode: str().with({ enum: ['a', 'b'] }) } });
	const baseInput = { text: str(), mode: str().with({ enum: ['a', 'b'] }) };
	const kindOf = (next: Parameters<typeof contractOf>[0]) =>
		diffContracts(base, contractOf(next)).kind;
	const withInput = (input: Shape) => kindOf({ input });

	it('classifies a contract-hash-preserving change as a patch', () => {
		expect(diffContracts(base, contractOf({ input: baseInput, summary: 'Echo it.' })).kind).toBe(
			'patch',
		);
	});

	it('classifies an additive optional input as a minor', () => {
		expect(withInput({ ...baseInput, prefix: str().optional() })).toBe('minor');
		expect(withInput({ ...baseInput, mode: str().with({ enum: ['a', 'b', 'c'] }) })).toBe('minor');
	});

	it('classifies a new required input with a default as a minor', () => {
		const next = contractOf({ input: { ...baseInput, prefix: str().default('>') } });
		// `.default()` makes the field optional; a required field with a default is the same rule.
		const required = { ...next, input: { ...next.input, required: ['text', 'mode', 'prefix'] } };
		expect(diffContracts(base, required).kind).toBe('minor');
	});

	it('classifies a new required input as a major', () => {
		const diff = diffContracts(base, contractOf({ input: { ...baseInput, prefix: str() } }));
		expect(diff).toMatchObject({ kind: 'major', breaksInput: true });
		expect(withInput({ text: str() })).toBe('major');
		expect(withInput({ ...baseInput, mode: str().with({ enum: ['a'] }) })).toBe('major');
		expect(withInput({ ...baseInput, text: str().with({ minLength: 2 }) })).toBe('major');
	});

	it('classifies a removed or narrowed output as a major', () => {
		const output = obj({ text: str(), tags: arr(str()) });
		const prev = contractOf({ input: baseInput, output });
		const diff = (next: AnySchema) =>
			diffContracts(prev, contractOf({ input: baseInput, output: next }));
		expect(diff(obj({ text: str() }))).toMatchObject({ kind: 'major', breaksInput: false });
		expect(diff(obj({ text: str().optional(), tags: arr(str()) })).kind).toBe('major');
		expect(diff(obj({ text: bool(), tags: arr(str()) })).kind).toBe('major');
		expect(diff(obj({ text: str(), tags: arr(str()), extra: str() })).kind).toBe('minor');
	});

	it('classifies a changed flow as a major', () => {
		expect(kindOf({ input: baseInput, flow: { ...FLOW, cardinality: '1:N' } })).toBe('major');
	});

	it('compares nested fields', () => {
		const prev = contractOf({ input: { where: obj({ field: str(), op: str() }) } });
		const next = contractOf({ input: { where: obj({ field: str() }) } });
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
	patch?: number;
	input?: string;
	text?: string;
	migrate?: string;
}

const echoSource = ({
	version = 1,
	minor = 0,
	patch = 0,
	input = '{ text: str() }',
	text = 'input.text',
	migrate = '',
}: EchoOptions = {}) => `
import { defineNode, obj, str } from '@n8n/node-sdk';
import { shout } from './shout';

const demo = defineNode({ id: 'demo', displayName: 'Demo', credentials: [], baseUrl: 'https://demo.test' });

export const echo = demo.action('echo', {
	version: ${version},
	minor: ${minor},
	patch: ${patch},
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: ${input},
	output: obj({ text: str() }),
	async run({ input, http }) {
		const suffix = await http.request({ path: '/suffix' });
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
const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const otherKey = generateKeyPairSync('ed25519')
	.publicKey.export({ type: 'spki', format: 'pem' })
	.toString();

/** A directory as a fake npm registry: `<dir>/<name>/<version>.tgz`. */
const directoryRegistry = (dir: string): ContractRegistry => ({
	versions: async (name) =>
		await readdir(path.join(dir, name)).then(
			(files) => files.map((file) => file.replace(/\.tgz$/, '')),
			() => [],
		),
	tarball: async (name, version) => {
		const data = await readFile(path.join(dir, name, `${version}.tgz`));
		return { data, integrity: integrityOf(data) };
	},
	publish: async (name, version, tarball) => {
		await mkdir(path.join(dir, name), { recursive: true });
		// `wx` refuses a republish, as npm does.
		await writeFile(path.join(dir, name, `${version}.tgz`), tarball, { flag: 'wx' });
	},
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
		const next = await freeze({ patch: 1 });
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
		const patch = await freeze({ patch: 1 });
		await expect(checkPublish(prev, patch, fixturesOf('hello!'))).rejects.toThrow(
			'demo.echo@1.0.1 fails its fixtures: demo.echo@1.0.1 fixture "echo": output [{"text":"HELLO!"}]',
		);
		await expect(checkPublish(prev, patch, { executions: [] })).rejects.toThrow(
			'needs an execution fixture',
		);
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

	it('takes a major without migrate when the old input still fits', async () => {
		const prev = await v1();
		const next = await freeze({ version: 2, input: '{ text: str(), prefix: str().optional() }' });
		await expect(checkPublish(prev, next, fixturesOf('HELLO!'))).resolves.toMatchObject({
			kind: 'minor',
		});
	});
});

describe('contract packages', () => {
	it('verify integrity, bundle hash, and the manifest signature', async () => {
		await writeShout('text.toUpperCase()');
		const frozen = await freeze();
		const tarball = packContractPackage(frozen, fixturesOf('HELLO!'), privateKey);
		const opened = openContractPackage(tarball, integrityOf(tarball));

		expect(opened.manifest).toEqual(frozen.manifest);
		expect(opened.bundle).toBe(frozen.bundle);
		expect(opened.fixtures).toEqual(fixturesOf('HELLO!'));
		expect(verifyManifestSignature(opened, publicKey)).toBe(true);
		expect(verifyManifestSignature(opened, otherKey)).toBe(false);
		expect(
			verifyManifestSignature({ ...opened, manifestText: `${opened.manifestText} ` }, publicKey),
		).toBe(false);
		expect(() => openContractPackage(tarball, integrityOf(Buffer.from('other')))).toThrow(
			'integrity',
		);
		// Same input, same bytes: a release build reproduces the published tarball.
		expect(packContractPackage(frozen, fixturesOf('HELLO!'), privateKey)).toEqual(tarball);
		expect(packageNameOf('notion.databasePage.getAll')).toBe(
			'@n8n-contracts/notion-database-page-get-all',
		);
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
		const registry = directoryRegistry(dirs.registry);
		const publish = async (fixtures: ContractFixtures) =>
			await publishAction({
				entryFile: dirs.entry,
				exportName: 'echo',
				fixtures,
				registry,
				privateKey,
			});
		await writeShout('text.toUpperCase()');
		await writeFile(dirs.entry, echoSource());
		const v100 = await publish(fixturesOf('HELLO!'));
		// The same bytes again: a no-op.
		await expect(publish(fixturesOf('HELLO!'))).resolves.toEqual(v100);

		// The helper changes: 1.0.0 cannot take other bytes, so the change ships as 1.0.1.
		await writeShout("text + '?'");
		await expect(publish(fixturesOf('hello!?'))).rejects.toThrow('other bytes');
		await writeFile(dirs.entry, echoSource({ patch: 1 }));
		const v101 = await publish(fixturesOf('hello!?'));
		expect(v101.contractHash).toBe(v100.contractHash);
		expect(v101.bundleHash).not.toBe(v100.bundleHash);

		const name = packageNameOf('demo.echo');
		const opened = await Promise.all(
			(await registry.versions(name)).map(async (version) => {
				const { data, integrity } = await registry.tarball(name, version);
				return openContractPackage(data, integrity);
			}),
		);
		// Every published version replays its own fixtures through the current executor.
		const issues = await Promise.all(
			opened.map(async (pkg) => await replayFixtures(pkg, pkg.fixtures)),
		);
		expect(issues.flat()).toEqual([]);

		const old = opened.find(({ manifest }) => manifest.semver === '1.0.0');
		const head = await freezeAction(dirs.entry, 'echo');
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
					abi: 2,
				},
			},
		]);
		setContractVersionLoader(async (_context, bundled) => bundled);
		expect(await run(frozenOf(head.manifest, head.bundle))).toEqual(['hello!?']);
	});

	it('refuse a bundle that does not match its hash, and an unknown ABI', async () => {
		await writeShout('text');
		const { manifest, bundle } = await freeze({ patch: 7 });
		const tampered = { ...manifest, bundleHash: sha256('other bytes') };

		await expect(run(frozenOf(tampered, bundle))).rejects.toThrow('does not match');
		expect(() => toVersionedNodeType([frozenOf({ ...manifest, abi: 3 }, bundle)])).toThrow(
			'needs ABI 3',
		);
	});
});
