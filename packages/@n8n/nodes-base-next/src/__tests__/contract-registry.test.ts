import {
	setContractVersionLoader,
	setNodeContractRange,
	toVersionedNodeType,
	type FrozenVersion,
} from '@n8n/node-sdk/host';
import {
	addToStore,
	manifestTextOf,
	signStoreManifest,
	storeBlobFileOf,
	storeIndexFileOf,
	type NodeContractLock,
} from '@n8n/node-sdk/registry';
import { freezeAction, type FrozenAction } from '@n8n/node-sdk/freeze';
import { sandboxExecutorLoader, warmSandbox } from '@n8n/node-sdk/sandbox';
import { generateKeyPairSync } from 'node:crypto';
import { link, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	LoggerProxy,
	type IExecuteFunctions,
	type INodeExecutionData,
	type ITaskMetadata,
} from 'n8n-workflow';

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

vi.mock('@n8n/node-sdk/host', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/node-sdk/host')>()),
	setExecutorLoader: vi.fn(),
}));

vi.mock('@n8n/node-sdk/sandbox', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/node-sdk/sandbox')>()),
	sandboxExecutorLoader: vi.fn(),
	warmSandbox: vi.fn(async () => undefined),
}));

const echoSource = (minor: number, text: string) => `
import { defineNode, t } from '@n8n/node-sdk';
const { obj, str } = t;

export const echo = defineNode({ id: 'demo', displayName: 'Demo', credentials: [] }).action('echo', {
	version: 1,
	minor: ${minor},
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

interface Published {
	readonly frozen: FrozenAction;
	readonly key: string;
	/** Replaces fields of the index line. */
	readonly line?: Readonly<Record<string, unknown>>;
}

/** The versions in the fake registry, by version. A test may replace one. */
const published = new Map<string, Published>();
const dirs = { root: '', store: '', registry: '' };
const registry = { url: '', server: createServer() };
const versions = new Map<string, FrozenAction>();

/** Writes the registry store again from `published`. */
const writeRegistry = async () => {
	await rm(dirs.registry, { recursive: true, force: true });
	const entries = [...published.values()];
	const records = await addToStore(
		dirs.registry,
		entries.map(({ frozen, key }) => {
			const manifestText = manifestTextOf(frozen.manifest);
			const signatures = [signStoreManifest(manifestText, key)];
			return { manifestText, bundle: frozen.bundle, signatures };
		}),
	);
	const lines = records.map((record, index) => ({ ...record, ...entries[index]?.line }));
	await writeFile(
		path.join(dirs.registry, storeIndexFileOf('demo.echo')),
		lines.map((line) => `${JSON.stringify(line)}\n`).join(''),
	);
};

const publish = async (frozen: FrozenAction, key = privateKey, line?: Published['line']) => {
	published.set(frozen.manifest.semver, { frozen, key, line });
	await writeRegistry();
};

/** Replaces the bytes of a blob in the registry. */
const tamper = async (digest: string) => {
	const file = path.join(dirs.registry, storeBlobFileOf(digest));
	await writeFile(file, Buffer.concat([await readFile(file), Buffer.from([0])]));
};

const listen = async (server: Server) =>
	await new Promise<string>((resolve) =>
		server.listen(0, '127.0.0.1', () =>
			resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
		),
	);

beforeAll(async () => {
	dirs.root = await mkdtemp(path.join(tmpdir(), 'contract-registry-'));
	const entry = path.join(dirs.root, 'echo.ts');
	const freeze = async (minor: number, text: string, last?: string) => {
		await writeFile(entry, echoSource(minor, text));
		const frozen = await freezeAction(entry, 'echo', async () =>
			last === undefined ? undefined : frozenOf(last).manifest,
		);
		versions.set(frozen.manifest.semver, frozen);
	};
	await freeze(0, 'input.text.toUpperCase()');
	await freeze(0, "input.text + '?'", '1.0.0');
	await freeze(1, "input.text + (input.suffix ?? '#')");
	dirs.registry = path.join(dirs.root, 'registry');
	// The registry is static files.
	registry.server.on('request', (request, response) => {
		const file = path.join(dirs.registry, decodeURIComponent(request.url ?? ''));
		void readFile(file).then(
			(data) => response.end(data),
			() => {
				response.statusCode = 404;
				response.end();
			},
		);
	});
	registry.url = await listen(registry.server);
});

beforeEach(async () => {
	dirs.store = await mkdtemp(path.join(dirs.root, 'store-'));
	published.clear();
	['1.0.0', '1.0.1', '1.1.0'].forEach((version) =>
		published.set(version, { frozen: frozenOf(version), key: privateKey }),
	);
	await writeRegistry();
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
			nodeContractRange: '>=2.0.0 <3.0.0',
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
		await publish(frozenOf('1.0.1'), strangerKey);
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('applies no newer patch from an index line without nodeContract', async () => {
		await publish(frozenOf('1.0.1'), privateKey, { nodeContract: undefined, abi: 2 });
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('applies no newer patch outside the Node Contract range of the host', async () => {
		await publish(frozenOf('1.0.1'), privateKey, { nodeContract: '3.0.0' });
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('refuses a tampered bundle', async () => {
		await tamper(`sha256:${lockOf('1.0.0').bundleHash}`);
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'does not match its digest',
		);
	});

	it('refuses an index line that does not match its manifest', async () => {
		await publish(frozenOf('1.0.0'), privateKey, { contractHash: 'a'.repeat(64) });
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'does not match its manifest (contractHash)',
		);
	});

	it('skips a tampered patch and runs the locked version', async () => {
		await tamper(`sha256:${frozenOf('1.0.1').manifest.bundleHash}`);
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
	});

	it('reads a file:// registry', async () => {
		const fetch = vi.fn();
		expect(
			await run(locked('1.0.0'), {
				policy: 'strict',
				registryUrl: `file://${dirs.registry}`,
				fetch,
			}),
		).toEqual(['HELLO']);
		expect(fetch).not.toHaveBeenCalled();
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
		published.delete('1.0.0');
		await writeRegistry();
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
		await publish(frozenOf('1.0.0'), strangerKey);
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

	it('adds a version once and never replaces it', async () => {
		const store = storeOf();
		const { manifest } = await store.locked(lockOf('1.0.0'));
		const index = path.join(dirs.store, storeIndexFileOf('demo.echo'));
		const lines = await readFile(index, 'utf8');
		await storeOf().locked(lockOf('1.0.0'));
		expect(await readFile(index, 'utf8')).toBe(lines);
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
		await rm(path.join(dirs.store, storeBlobFileOf(`sha256:${lockOf('1.0.0').bundleHash}`)));
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

	it('stores a blob by rename when the file system has no hard links', async () => {
		vi.mocked(link).mockRejectedValueOnce(Object.assign(new Error('no links'), { code: 'EPERM' }));
		const { manifest } = await storeOf().locked(lockOf('1.0.0'));
		expect([...(await storeOf().bundleHashes())]).toEqual([manifest.bundleHash]);
		expect(await (await storeOf({ registryUrl: '' }).locked(lockOf('1.0.0'))).readBundle()).toBe(
			frozenOf('1.0.0').bundle,
		);
	});

	it('refuses a bundle whose manifest does not match the lock', async () => {
		const store = storeOf();
		const lock = { ...lockOf('1.0.0'), contractHash: 'a'.repeat(64) };
		await expect(store.locked(lock)).rejects.toThrow('has contractHash');
		expect(await store.bundleHashes()).toEqual(new Set());
		await store.locked(lockOf('1.0.0'));
		await expect(store.locked(lock)).rejects.toThrow('but the lock has');
	});

	it('serves only signed versions when a key is set', async () => {
		await publish(frozenOf('1.0.0'), strangerKey);
		await storeOf({ publicKey: undefined }).locked(lockOf('1.0.0'));
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
		published.delete('1.1.0');
		await writeRegistry();
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
			setNodeContractRange('>=2.0.0 <3.0.0');
		}
	});
});

describe('useContractRegistry', () => {
	const sandboxOptions = {
		sidecar: '',
		guests: '',
		cacheDir: '',
		credentialType: () => undefined,
	};
	const use = (sandbox?: ContractRegistryOptions['sandbox']) =>
		useContractRegistry({
			policy: 'tolerant',
			store: storeOf(),
			metaOf: async () => undefined,
			nodeContractRange: '>=2.0.0 <3.0.0',
			sandbox,
		});
	const inProcessOf = (scope: 'stored' | 'all') => {
		vi.mocked(sandboxExecutorLoader).mockClear();
		use({ options: sandboxOptions, scope });
		const [[, inProcess] = []] = vi.mocked(sandboxExecutorLoader).mock.calls;
		return inProcess;
	};

	beforeEach(() => vi.mocked(warmSandbox).mockClear());

	it('compiles the sandbox guests at start only with a sandbox', () => {
		use();
		expect(warmSandbox).not.toHaveBeenCalled();
		use({ options: sandboxOptions, scope: 'stored' });
		expect(warmSandbox).toHaveBeenCalledWith(sandboxOptions);
	});

	it('logs a failed guest compile at debug and starts', async () => {
		const debug = vi.spyOn(LoggerProxy, 'debug');
		vi.mocked(warmSandbox).mockRejectedValueOnce(new Error('no sidecar'));
		expect(() => use({ options: sandboxOptions, scope: 'stored' })).not.toThrow();
		await vi.waitFor(() =>
			expect(debug).toHaveBeenCalledWith('The sandbox guests did not compile at start: no sidecar'),
		);
		debug.mockRestore();
	});
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
