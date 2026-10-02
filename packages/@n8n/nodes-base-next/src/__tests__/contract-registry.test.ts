import {
	integrityOf,
	packageNameOf,
	setNodeContractRange,
	setContractVersionLoader,
	toVersionedNodeType,
	type FrozenVersion,
	type NodeContractLock,
} from '@n8n/node-sdk';
import { freezeAction, type FrozenAction } from '@n8n/node-sdk/freeze';
import { packContractPackage } from '@n8n/node-sdk/publish';
import { sandboxExecutorLoader } from '@n8n/node-sdk/sandbox';
import { generateKeyPairSync } from 'node:crypto';
import { link, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IExecuteFunctions, INodeExecutionData, ITaskMetadata } from 'n8n-workflow';

import {
	contractStore,
	contractVersionLoader,
	syncContractStore,
	useContractRegistry,
	type ContractRegistryOptions,
	type ContractStoreOptions,
} from '../contract-registry';
import { versionsOf } from '../registry';

vi.mock('node:fs/promises', async (importOriginal) => {
	const fs = await importOriginal<typeof import('node:fs/promises')>();
	return { ...fs, link: vi.fn(fs.link) };
});

vi.mock('@n8n/node-sdk', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/node-sdk')>()),
	setExecutorLoader: vi.fn(),
}));

vi.mock('@n8n/node-sdk/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/node-sdk/sandbox')>()),
	sandboxExecutorLoader: vi.fn(),
}));

const echoSource = (minor: number, patch: number, text: string) => `
import { defineNode, obj, str } from '@n8n/node-sdk';

export const echo = defineNode({ id: 'demo', displayName: 'Demo', credentials: [] }).action('echo', {
	version: 1,
	minor: ${minor},
	patch: ${patch},
	action: 'Echo',
	summary: 'Echo the text.',
	flow: { effect: 'transform', cardinality: 'per-item' },
	input: { text: str()${minor > 0 ? ', suffix: str().optional()' : ''} },
	output: obj({ text: str() }),
	async run({ input }) {
		return { text: ${text} };
	},
});
`;

const keyPair = () =>
	generateKeyPairSync('ed25519', {
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});
const { privateKey, publicKey } = keyPair();
const strangerKey = keyPair().privateKey;

const FIXTURES = { executions: [] };
const NAME = packageNameOf('demo.echo');

interface Published {
	readonly data: Buffer;
	readonly integrity: string;
	readonly frozen: FrozenAction;
	/** Replaces fields of `n8nContract` in the packument. */
	readonly contract?: Record<string, unknown>;
}

/** Tarballs the fake registry serves, by version. A test may replace one. */
const tarballs = new Map<string, Published>();
const dirs = { root: '', store: '' };
const registry = { url: '', server: createServer() };
const versions = new Map<string, FrozenAction>();

const publish = (frozen: FrozenAction, key = privateKey, contract?: Record<string, unknown>) => {
	const data = packContractPackage(frozen, FIXTURES, key);
	tarballs.set(frozen.manifest.semver, { data, integrity: integrityOf(data), frozen, contract });
};

const packument = () => ({
	name: NAME,
	versions: Object.fromEntries(
		[...tarballs].map(([version, { integrity, frozen, contract }]) => {
			const { id, nodeContract, contractHash, bundleHash } = frozen.manifest;
			const tarball = `${registry.url}/tarballs/${version}.tgz`;
			const n8nContract = { id, nodeContract, contractHash, bundleHash, ...contract };
			return [version, { n8nContract, dist: { tarball, integrity } }];
		}),
	),
});

const listen = async (server: Server) =>
	await new Promise<string>((resolve) =>
		server.listen(0, '127.0.0.1', () =>
			resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
		),
	);

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'contract-registry-'));
	const entry = path.join(dirs.root, 'echo.ts');
	const freeze = async (minor: number, patch: number, text: string) => {
		await writeFile(entry, echoSource(minor, patch, text));
		const frozen = await freezeAction(entry, 'echo');
		versions.set(frozen.manifest.semver, frozen);
	};
	await freeze(0, 0, 'input.text.toUpperCase()');
	await freeze(0, 1, "input.text + '?'");
	await freeze(1, 0, "input.text + (input.suffix ?? '#')");
	registry.server.on('request', (request, response) => {
		const tarball = /^\/tarballs\/(.+)\.tgz$/.exec(request.url ?? '')?.[1];
		const found = tarball ? tarballs.get(tarball) : undefined;
		if (request.url === `/${NAME.replace('/', '%2f')}`) {
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify(packument()));
		} else if (found) {
			response.end(found.data);
		} else {
			response.statusCode = 404;
			response.end();
		}
	});
	registry.url = await listen(registry.server);
});

beforeEach(async () => {
	dirs.store = await mkdtemp(path.join(dirs.root, 'store-'));
	tarballs.clear();
	['1.0.0', '1.0.1', '1.1.0'].forEach((version) => publish(frozenOf(version)));
});

afterAll(async () => {
	setContractVersionLoader(async (_context, head) => head);
	registry.server.close();
	await rm(dirs.root, { recursive: true, force: true });
});

function frozenOf(version: string): FrozenAction {
	const frozen = versions.get(version);
	if (!frozen) throw new Error(`${version} is not frozen`);
	return frozen;
}

const bundled = (version: string): FrozenVersion => ({
	manifest: frozenOf(version).manifest,
	readBundle: async () => frozenOf(version).bundle,
});

const lockOf = (version: string): NodeContractLock => {
	const { id, semver, bundleHash, contractHash } = frozenOf(version).manifest;
	return { action: id, version: semver, bundleHash, contractHash };
};

const contextOf = (metadata: ITaskMetadata[] = []) =>
	({
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Echo', credentials: {} }),
		getNodeParameter: (name: string) => (name === 'text' ? 'hello' : ''),
		continueOnFail: () => false,
		setMetadata: (value: ITaskMetadata) => metadata.push(value),
	}) as unknown as IExecuteFunctions;

/** Runs the node with HEAD 1.1.0 bundled, as a release ships it. */
const storeOf = (options: Partial<ContractStoreOptions> = {}) =>
	contractStore({
		registryUrl: registry.url,
		publicKey,
		storeDir: dirs.store,
		fetch: async (url, init) => await fetch(url, init),
		...options,
	});

const run = async (
	meta: unknown,
	options: Partial<Omit<ContractRegistryOptions, 'store'> & ContractStoreOptions> = {},
	metadata: ITaskMetadata[] = [],
	head = bundled('1.1.0'),
) => {
	setContractVersionLoader(
		contractVersionLoader({
			policy: 'tolerant',
			store: storeOf(options),
			metaOf: async () => meta,
			nodeContractRange: '>=1.0.0 <3.0.0',
			...options,
		}),
	);
	const NodeType = toVersionedNodeType([head]);
	const result = await new NodeType().getNodeType(1).execute?.call(contextOf(metadata));
	const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
	return items.map((item) => item.json.text);
};

const locked = (version: string, policy?: string) => ({
	nodeContracts: { Echo: lockOf(version) },
	...(policy ? { nodeContractsPolicy: policy } : {}),
});

describe('contractVersionLoader', () => {
	it('runs the bundled HEAD for a node without a lock', async () => {
		expect(await run({})).toEqual(['hello#']);
	});

	it('runs the locked bundle from the registry when strict', async () => {
		expect(await run(locked('1.0.0'), { policy: 'strict' })).toEqual(['HELLO']);
	});

	it('runs the newest signed patch of the locked minor when tolerant', async () => {
		expect(await run(locked('1.0.0'))).toEqual(['hello?']);
	});

	it('takes the policy of the workflow over the instance policy', async () => {
		expect(await run(locked('1.0.0', 'strict'))).toEqual(['HELLO']);
		expect(await run(locked('1.0.0', 'tolerant'), { policy: 'strict' })).toEqual(['hello?']);
	});

	it('applies no newer patch without a trusted key or with a wrong signature', async () => {
		expect(await run(locked('1.0.0'), { publicKey: undefined })).toEqual(['HELLO']);
		publish(frozenOf('1.0.1'), strangerKey);
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('reads the abi field of a packument entry published before apiVersion', async () => {
		publish(frozenOf('1.0.1'), privateKey, { nodeContract: undefined, abi: 2 });
		expect(await run(locked('1.0.0'))).toEqual(['hello?']);
	});

	it('reads the apiVersion field of a packument entry published before nodeContract', async () => {
		const legacy = { nodeContract: undefined, apiVersion: 'n8n:action@2.1.0' };
		publish(frozenOf('1.0.1'), privateKey, legacy);
		expect(await run(locked('1.0.0'))).toEqual(['hello?']);
	});

	it('applies no newer patch outside the Node Contract range of the host', async () => {
		publish(frozenOf('1.0.1'), privateKey, { nodeContract: '3.0.0' });
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('refuses a tampered tarball', async () => {
		const tarball = tarballs.get('1.0.0');
		if (!tarball) throw new Error('1.0.0 is not published');
		tarballs.set('1.0.0', { ...tarball, data: Buffer.concat([tarball.data, Buffer.from([0])]) });
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'does not match its integrity',
		);
	});

	it('skips a tampered patch and runs the locked version', async () => {
		const tarball = tarballs.get('1.0.1');
		if (!tarball) throw new Error('1.0.1 is not published');
		tarballs.set('1.0.1', { ...tarball, data: Buffer.concat([tarball.data, Buffer.from([0])]) });
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('runs a cached version without a registry', async () => {
		expect(await run(locked('1.0.0'), { policy: 'strict' })).toEqual(['HELLO']);
		expect(await run(locked('1.0.0'), { policy: 'strict', registryUrl: '' })).toEqual(['HELLO']);
	});

	it('names the action, version and bundle hash when no version matches', async () => {
		const { bundleHash } = lockOf('1.0.0');
		await expect(run(locked('1.0.0'), { registryUrl: '' })).rejects.toThrow(
			`Cannot get demo.echo@1.0.0 (bundle ${bundleHash}) from the registry (none set)`,
		);
		tarballs.delete('1.0.0');
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			`Cannot get demo.echo@1.0.0 (bundle ${bundleHash}) from the registry ${registry.url}: The registry does not have this bundle`,
		);
	});

	it('records the version that ran in the execution metadata', async () => {
		const metadata: ITaskMetadata[] = [];
		await run(locked('1.0.0'), {}, metadata);
		const { bundleHash } = frozenOf('1.0.1').manifest;
		expect(metadata).toEqual([
			{
				nodeContract: {
					action: 'demo.echo',
					version: '1.0.1',
					bundleHash,
					nodeContract: '2.1.0',
				},
			},
		]);
	});
});

describe('contractStore', () => {
	it('takes only bundles with the trusted signature when a key is set', async () => {
		publish(frozenOf('1.0.0'), strangerKey);
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'demo.echo@1.0.0 (bundle',
		);
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'is not signed by the trusted key',
		);
		expect(await run(locked('1.0.0'), { policy: 'strict', publicKey: undefined })).toEqual([
			'HELLO',
		]);
	});

	it('adds a file once and never replaces it', async () => {
		const store = storeOf();
		const { data } = tarballs.get('1.0.0') ?? { data: Buffer.alloc(0) };
		const manifest = await store.add(data);
		await store.add(data);
		expect(manifest.semver).toBe('1.0.0');
		expect([...(await store.bundleHashes())]).toEqual([manifest.bundleHash]);
	});

	it('lists the newest stored version of each major', async () => {
		const store = storeOf();
		await Promise.all(
			['1.0.0', '1.0.1'].map(async (version) => await store.locked(lockOf(version))),
		);
		const versions = await storeOf().versions();
		expect(versions.get('demo.echo')?.map(({ manifest }) => manifest.semver)).toEqual(['1.0.1']);
	});

	it('loads a bundle from the registry again when its file is gone', async () => {
		const store = storeOf();
		const version = await store.locked(lockOf('1.0.0'));
		await rm(path.join(dirs.store, `${lockOf('1.0.0').bundleHash}.tgz`));
		expect(await version.readBundle()).toBe(frozenOf('1.0.0').bundle);
		expect(await store.bundleHashes()).toContain(lockOf('1.0.0').bundleHash);
	});

	it('fails a request after the timeout', async () => {
		const store = storeOf({
			fetchTimeoutMs: 20,
			fetch: async (_url, { signal }) =>
				await new Promise((_resolve, reject) =>
					signal.addEventListener('abort', () => reject(new Error(String(signal.reason)))),
				),
		});
		await expect(store.locked(lockOf('1.0.0'))).rejects.toThrow(
			`Cannot get demo.echo@1.0.0 (bundle ${lockOf('1.0.0').bundleHash}) from the registry ${registry.url}`,
		);
	});

	it('stores a file by rename when the file system has no hard links', async () => {
		vi.mocked(link).mockRejectedValueOnce(Object.assign(new Error('no links'), { code: 'EPERM' }));
		const { data } = tarballs.get('1.0.0') ?? { data: Buffer.alloc(0) };
		const manifest = await storeOf().add(data);
		expect([...(await storeOf().bundleHashes())]).toEqual([manifest.bundleHash]);
	});

	it('refuses a bundle whose manifest does not match the lock', async () => {
		const store = storeOf();
		const lock = { ...lockOf('1.0.0'), contractHash: 'a'.repeat(64) };
		await expect(store.locked(lock)).rejects.toThrow('has contractHash');
		expect(await store.bundleHashes()).toEqual(new Set());
		await store.locked(lockOf('1.0.0'));
		await expect(store.locked(lock)).rejects.toThrow('but the lock has');
	});

	it('serves only signed files when a key is set', async () => {
		publish(frozenOf('1.0.0'), strangerKey);
		const { data } = tarballs.get('1.0.0') ?? { data: Buffer.alloc(0) };
		await storeOf({ publicKey: undefined }).add(data);
		expect((await storeOf({ publicKey: undefined }).versions()).has('demo.echo')).toBe(true);
		expect((await storeOf().versions()).has('demo.echo')).toBe(false);
		await expect(storeOf().locked(lockOf('1.0.0'))).rejects.toThrow(
			'is not signed by the trusted key',
		);
	});

	it('runs a stored version as a newer patch only when its lock or signature allows it', async () => {
		const store = storeOf();
		const stored = await store.locked(lockOf('1.0.1'));
		expect(await run(locked('1.0.0'), { publicKey: undefined }, [], stored)).toEqual(['HELLO']);
	});
});

describe('syncContractStore', () => {
	const nodeOf = (version: string, workflowId = 'wf') => ({
		workflowId,
		workflowName: workflowId,
		node: 'Echo',
		lock: lockOf(version),
	});

	it('adds each missing locked bundle once and reports what it cannot get', async () => {
		const store = storeOf();
		await store.locked(lockOf('1.0.0'));
		tarballs.delete('1.1.0');
		const result = await syncContractStore(store, [
			nodeOf('1.0.0'),
			nodeOf('1.0.1', 'a'),
			nodeOf('1.0.1', 'b'),
			nodeOf('1.1.0'),
		]);
		expect(result.added.map(({ semver }) => semver)).toEqual(['1.0.1']);
		expect(result.failed.map(({ workflowId, error }) => [workflowId, error])).toEqual([
			['wf', expect.stringContaining('Cannot get demo.echo@1.1.0 (bundle')],
		]);
		expect(result.unsupported).toEqual([]);
	});

	it('reports nodes whose locked bundle needs a Node Contract version the host does not run', async () => {
		setNodeContractRange('>=3.0.0 <4.0.0');
		try {
			const result = await syncContractStore(storeOf(), [nodeOf('1.0.0')]);
			expect(result.unsupported).toEqual([{ ...nodeOf('1.0.0'), nodeContract: '2.1.0' }]);
		} finally {
			setNodeContractRange('>=1.0.0 <3.0.0');
		}
	});
});

describe('useContractRegistry', () => {
	const inProcessOf = (scope: 'stored' | 'all') => {
		vi.mocked(sandboxExecutorLoader).mockClear();
		useContractRegistry({
			policy: 'tolerant',
			store: storeOf(),
			metaOf: async () => undefined,
			nodeContractRange: '>=1.0.0 <3.0.0',
			sandbox: {
				options: { sidecar: '', guests: '', cacheDir: '', credentialType: () => undefined },
				scope,
			},
		});
		const [[, inProcess] = []] = vi.mocked(sandboxExecutorLoader).mock.calls;
		return inProcess;
	};
	const [{ manifest }] = versionsOf('httpRequest.send');

	it('runs only the versions that this package bundles in this process with the stored scope', () => {
		const inProcess = inProcessOf('stored');
		expect(inProcess?.(manifest)).toBe(true);
		expect(inProcess?.({ ...manifest, bundleHash: 'sha256-stored' })).toBe(false);
	});

	it('runs every version in the sandbox with the all scope', () => {
		expect(inProcessOf('all')?.(manifest)).toBe(false);
	});
});
