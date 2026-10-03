import {
	setContractVersionLoader,
	setNodeContractRange,
	toNodeType,
	toVersionedNodeType,
	type FrozenVersion,
} from '@n8n/node-sdk/host';
import {
	addToStore,
	manifestTextOf,
	signStoreManifest,
	storeBlobFileOf,
	storeFilesOfDir,
	storeIndexFileOf,
	storeReader,
	type NodeContractLock,
} from '@n8n/node-sdk/registry';
import { defineNode, t } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';
import {
	freezeAction,
	freezeCredential,
	freezeNative,
	type FrozenAction,
} from '@n8n/node-sdk/freeze';
import { sandboxExecutorLoader, warmSandbox } from '@n8n/node-sdk/sandbox';
import { generateKeyPairSync } from 'node:crypto';
import { link, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
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
	admitVersions,
	contractStore,
	contractVersionLoader,
	credentialManifestsOf,
	exportContractStore,
	importContractStore,
	syncContractStore,
	useContractRegistry,
	originOf,
	type ContractKeys,
	type ContractRegistryOptions,
	type ContractStoreOptions,
	type InstanceStore,
	type StoredVersion,
} from '../contract-registry';
import { getRequest } from '../nodes/http-request/actions/get';
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

const pingToken = defineCredential({
	id: 'ping.token',
	legacyName: 'pingApi',
	displayName: 'Ping API',
	fields: { token: field.secret('Token') },
	auth: (a) => a.bearer('token'),
	baseUrl: 'https://api.ping.test',
});

const pingSource = `
import { defineNode, t } from '@n8n/node-sdk';
import { credential, defineCredential, field } from '@n8n/node-sdk/credentials';

const pingToken = defineCredential({
	id: 'ping.token',
	legacyName: 'pingApi',
	displayName: 'Ping API',
	fields: { token: field.secret('Token') },
	auth: (a) => a.bearer('token'),
	baseUrl: 'https://api.ping.test',
});

export const pinged = defineNode({
	id: 'ping',
	displayName: 'Ping',
	credential: credential({ types: [pingToken] }),
}).trigger('pinged', {
	trigger: 'On ping',
	summary: 'Starts when the service posts a ping.',
	input: {},
	output: t.obj({ id: t.str() }),
	webhook: { emit: ({ body }) => [{ id: String(body.id) }] },
});
`;

const keyPair = () =>
	generateKeyPairSync('ed25519', {
		publicKeyEncoding: { type: 'spki', format: 'pem' },
		privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	});
const { privateKey, publicKey } = keyPair();
const strangerKey = keyPair().privateKey;
const firstParty = keyPair();
const vettingKeys = { firstParty: undefined, vetting: publicKey };
const noKeys = { firstParty: undefined, vetting: undefined };
const bothKeys = { firstParty: firstParty.publicKey, vetting: publicKey };

interface Published {
	readonly frozen: FrozenAction;
	readonly key: string;
	/** Replaces fields of the index line. */
	readonly line?: Readonly<Record<string, unknown>>;
}

/** An instance store in memory, as the database table of the cli keeps it. */
const memoryStore = () => {
	const rows = new Map<string, StoredVersion>();
	const store: InstanceStore = {
		manifests: async (id) => [...rows.values()].filter((row) => id === undefined || row.id === id),
		credentialManifests: async () => [...rows.values()].filter(({ kind }) => kind === 'credential'),
		has: async (manifest) => rows.has(manifest),
		bundle: async (manifest) => rows.get(manifest)?.bundle,
		versions: async () => [...rows.values()],
		insert: async (versions) => {
			versions.forEach(
				(version) => rows.has(version.manifest) || rows.set(version.manifest, version),
			);
		},
	};
	return { rows, store };
};

/** The versions in the fake registry, by version. A test may replace one. */
const published = new Map<string, Published>();
const dirs = { root: '', registry: '' };
const instance = { current: memoryStore() };
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
		const frozen = await freezeAction(entry, 'echo', async () => {
			const manifest = last === undefined ? undefined : frozenOf(last).manifest;
			return (
				manifest && {
					version: manifest.semver,
					manifest: '',
					bundle: `sha256:${manifest.bundleHash}`,
				}
			);
		});
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
	instance.current = memoryStore();
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
	origin: 'first-party',
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
		keys: vettingKeys,
		store: instance.current.store,
		fetch: async (url, init) => await fetch(url, init),
		...options,
	});

const run = async (
	meta: unknown,
	options: Partial<
		Omit<ContractRegistryOptions, 'store'> & Omit<ContractStoreOptions, 'store'>
	> = {},
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
		expect(await run(locked('1.0.0'), { keys: noKeys })).toEqual(['HELLO']);
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
			'is not signed by a trusted key',
		);
		expect(await run(locked('1.0.0'), { policy: 'strict', keys: noKeys })).toEqual(['HELLO']);
	});

	it('adds a version once and never replaces it', async () => {
		const store = storeOf();
		const { manifest } = await store.locked(lockOf('1.0.0'));
		const [row] = instance.current.rows.values();
		await storeOf().locked(lockOf('1.0.0'));
		expect([...instance.current.rows.values()]).toEqual([row]);
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

	it('fetches a version again when the store no longer has it', async () => {
		const store = storeOf();
		await store.locked(lockOf('1.0.0'));
		instance.current.rows.clear();
		await store.locked(lockOf('1.0.0'));
		expect([...instance.current.rows.values()].map(({ version }) => version)).toEqual(['1.0.0']);
	});

	it('reads only the store on a host that may not fetch', async () => {
		await storeOf().locked(lockOf('1.0.1'));
		const fetchRegistry = vi.fn(async () => new Response(null, { status: 500 }));
		const worker = storeOf({ mayFetch: () => false, fetch: fetchRegistry });
		expect(await (await worker.locked(lockOf('1.0.1'))).readBundle()).toBe(
			frozenOf('1.0.1').bundle,
		);
		expect(
			(await worker.newerPatches(lockOf('1.0.0'))).map(({ manifest }) => manifest.semver),
		).toEqual(['1.0.1']);
		await expect(worker.locked(lockOf('1.0.0'))).rejects.toThrow(
			'only the leader main fetches from the registry',
		);
		expect(fetchRegistry).not.toHaveBeenCalled();
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
		await storeOf({ keys: noKeys }).locked(lockOf('1.0.0'));
		expect((await storeOf({ keys: noKeys }).versions()).has('demo.echo')).toBe(true);
		expect((await storeOf().versions()).has('demo.echo')).toBe(false);
		await expect(storeOf().locked(lockOf('1.0.0'))).rejects.toThrow(
			'is not signed by a trusted key',
		);
	});

	it('runs a stored version as a newer patch only when its lock or signature allows it', async () => {
		const store = storeOf();
		const stored = await store.locked(lockOf('1.0.1'));
		expect(await run(locked('1.0.0'), { keys: noKeys }, [], stored)).toEqual(['HELLO']);
	});
});

describe('origin', () => {
	const originsOfRows = () =>
		[...instance.current.rows.values()].map(({ version, origin }) => [version, origin]);

	it('takes the origin of a version from the key that signs it', () => {
		const text = manifestTextOf(frozenOf('1.0.0').manifest);
		const signedBy = (key: string) => ({ signatures: [signStoreManifest(text, key)] });
		expect(originOf(signedBy(firstParty.privateKey), text, bothKeys)).toBe('first-party');
		expect(originOf(signedBy(privateKey), text, bothKeys)).toBe('community');
		expect(originOf(signedBy(strangerKey), text, bothKeys)).toBe('private');
		expect(originOf({}, text, noKeys)).toBe('private');
		expect(originOf(signedBy(firstParty.privateKey), text, vettingKeys)).toBe('private');
	});

	it('does not take the n8n namespace from an id', () => {
		const text = manifestTextOf(frozenOf('1.0.0').manifest);
		const line = { id: 'n8n.echo', signatures: [signStoreManifest(text, privateKey)] };
		expect(originOf(line, text, bothKeys)).toBe('community');
	});

	it('records the origin at admission and serves it from the store', async () => {
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		const store = storeOf({ keys: bothKeys });
		expect((await store.locked(lockOf('1.0.0'))).origin).toBe('first-party');
		expect((await store.locked(lockOf('1.0.1'))).origin).toBe('community');
		expect(originsOfRows()).toEqual([
			['1.0.0', 'first-party'],
			['1.0.1', 'community'],
		]);
		const reread = storeOf({ keys: bothKeys });
		expect((await reread.versions()).get('demo.echo')?.map(({ origin }) => origin)).toEqual([
			'community',
		]);
		expect((await reread.locked(lockOf('1.0.0'))).origin).toBe('first-party');
	});

	it('serves a first-party version with the origin that the keys prove now', async () => {
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		await storeOf({ keys: bothKeys }).locked(lockOf('1.0.0'));
		const [[digest, row] = []] = [...instance.current.rows];
		if (!digest || !row) throw new Error('no stored row');
		const vettingSignature = signStoreManifest(row.manifestText, privateKey);
		instance.current.rows.set(digest, {
			...row,
			signatures: [...(row.signatures ?? []), vettingSignature],
		});
		expect((await storeOf({ keys: bothKeys }).locked(lockOf('1.0.0'))).origin).toBe('first-party');
		expect((await storeOf({ keys: vettingKeys }).locked(lockOf('1.0.0'))).origin).toBe('community');
		expect((await storeOf({ keys: noKeys }).locked(lockOf('1.0.0'))).origin).toBe('private');
	});

	it('takes an unsigned version as private only without a key', async () => {
		await publish(frozenOf('1.0.0'), strangerKey);
		expect((await storeOf({ keys: noKeys }).locked(lockOf('1.0.0'))).origin).toBe('private');
		instance.current = memoryStore();
		await expect(storeOf({ keys: bothKeys }).locked(lockOf('1.0.0'))).rejects.toThrow(
			'is not signed by a trusted key',
		);
	});

	it('records the origin of each imported version', async () => {
		const dir = await mkdtemp(path.join(dirs.root, 'origin-'));
		await addToStore(
			dir,
			[
				['1.0.0', firstParty.privateKey],
				['1.0.1', privateKey],
			].map(([version = '', key = '']) => {
				const { manifest, bundle } = frozenOf(version);
				const manifestText = manifestTextOf(manifest);
				return { manifestText, bundle, signatures: [signStoreManifest(manifestText, key)] };
			}),
		);
		await importContractStore(storeReader(storeFilesOfDir(dir)), instance.current.store, bothKeys);
		expect(originsOfRows()).toEqual([
			['1.0.0', 'first-party'],
			['1.0.1', 'community'],
		]);
	});

	it('applies a newer patch only from the origin of the locked version', async () => {
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		expect(await run(locked('1.0.0'), { keys: bothKeys })).toEqual(['HELLO']);
		instance.current = memoryStore();
		await publish(frozenOf('1.0.1'), firstParty.privateKey);
		expect(await run(locked('1.0.0'), { keys: bothKeys })).toEqual(['hello?']);
	});

	it('applies only a first-party patch when the locked version does not load', async () => {
		published.delete('1.0.0');
		await writeRegistry();
		const head: FrozenVersion = { ...bundled('1.0.1'), origin: 'community' };
		await expect(run(locked('1.0.0'), { keys: bothKeys }, [], head)).rejects.toThrow(
			'Cannot get demo.echo@1.0.0',
		);
		instance.current = memoryStore();
		await publish(frozenOf('1.0.1'), firstParty.privateKey);
		expect(await run(locked('1.0.0'), { keys: bothKeys }, [], head)).toEqual(['hello?']);
	});
});

describe('importContractStore and exportContractStore', () => {
	/** Every file of a directory and its bytes. */
	const treeOf = async (dir: string) => {
		const entries = await readdir(dir, { recursive: true, withFileTypes: true });
		const files = entries
			.filter((entry) => entry.isFile())
			.map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
			.sort();
		return Object.fromEntries(
			await Promise.all(
				files.map(async (file) => [file, (await readFile(path.join(dir, file))).toString('hex')]),
			),
		);
	};

	/** A store folder with fixtures and publish dates, as `publish:contracts` writes it. */
	const sourceDir = async (key = privateKey) => {
		const dir = await mkdtemp(path.join(dirs.root, 'source-'));
		await addToStore(
			dir,
			['1.0.0', '1.0.1', '1.1.0'].map((version) => {
				const { manifest, bundle } = frozenOf(version);
				const manifestText = manifestTextOf(manifest);
				return {
					manifestText,
					bundle,
					fixtures: `{"executions":[],"version":"${version}"}\n`,
					signatures: [signStoreManifest(manifestText, key)],
					published: '2026-10-02T12:00:00.000Z',
				};
			}),
		);
		return dir;
	};

	const importDir = async (dir: string, keys: ContractKeys = vettingKeys) =>
		await importContractStore(storeReader(storeFilesOfDir(dir)), instance.current.store, keys);

	it('exports the same layout bytes that it imported', async () => {
		const dir = await sourceDir();
		expect((await importDir(dir)).map(({ version }) => version)).toEqual([
			'1.0.0',
			'1.0.1',
			'1.1.0',
		]);
		expect(await importDir(dir)).toEqual([]);
		const out = await mkdtemp(path.join(dirs.root, 'export-'));
		await exportContractStore(instance.current.store, out);
		expect(await treeOf(out)).toEqual(await treeOf(dir));
	});

	it('adds nothing when a blob does not match its digest', async () => {
		const dir = await sourceDir();
		const file = path.join(dir, storeBlobFileOf(`sha256:${lockOf('1.0.1').bundleHash}`));
		await writeFile(file, Buffer.concat([await readFile(file), Buffer.from([0])]));
		await expect(importDir(dir)).rejects.toThrow('does not match its digest');
		expect(instance.current.rows.size).toBe(0);
	});

	it('adds nothing without the trusted signature', async () => {
		await expect(importDir(await sourceDir(strangerKey))).rejects.toThrow(
			'is not signed by a trusted key',
		);
		expect(instance.current.rows.size).toBe(0);
	});

	it('refuses other bytes for a stored version', async () => {
		await importDir(await sourceDir());
		const [row] = instance.current.rows.values();
		if (!row) throw new Error('nothing imported');
		await expect(
			admitVersions(instance.current.store, [{ ...row, manifest: `sha256:${'f'.repeat(64)}` }]),
		).rejects.toThrow('demo.echo@1.0.0 is in the store with other bytes');
	});

	it('exports blobs by rename when the file system has no hard links', async () => {
		await storeOf().locked(lockOf('1.0.0'));
		vi.mocked(link).mockRejectedValueOnce(Object.assign(new Error('no links'), { code: 'EPERM' }));
		const out = await mkdtemp(path.join(dirs.root, 'export-'));
		await exportContractStore(instance.current.store, out);
		instance.current = memoryStore();
		expect((await importDir(out)).map(({ version }) => version)).toEqual(['1.0.0']);
	});

	/** A store folder with a credential manifest and a native version that pins it. */
	const credentialAndNativeDir = async () => {
		const dir = await sourceDir();
		const pingCredential = await freezeCredential(pingToken);
		if (!pingCredential) throw new Error('ping.token has no manifest');
		const called = defineNode({
			id: 'ping',
			displayName: 'Ping',
			credential: credential({ types: [pingToken] }),
		}).trigger('called', {
			trigger: 'On call',
			summary: 'Starts on a call.',
			input: { path: t.str() },
			output: t.obj({ body: t.str() }),
			native: { type: 'n8n-nodes-base.webhook', version: 2.2, on: 'webhook' },
		});
		await addToStore(
			dir,
			[pingCredential, await freezeNative(called)].map((manifest) => {
				const manifestText = manifestTextOf(manifest);
				return { manifestText, signatures: [signStoreManifest(manifestText, privateKey)] };
			}),
		);
		return dir;
	};

	it('exports the same credential and native lines that it imported', async () => {
		const dir = await credentialAndNativeDir();
		const added = await importDir(dir);
		expect(added.map(({ id, kind, bundle }) => [id, kind, bundle])).toEqual(
			expect.arrayContaining([
				['ping.token', 'credential', undefined],
				['ping.called', 'trigger', undefined],
			]),
		);
		const out = await mkdtemp(path.join(dirs.root, 'export-'));
		await exportContractStore(instance.current.store, out);
		expect(await treeOf(out)).toEqual(await treeOf(dir));
	});

	it('exports the credential manifests that the exported versions pin', async () => {
		await importDir(await credentialAndNativeDir());
		const exported = async (id: string) =>
			(
				await exportContractStore(
					instance.current.store,
					await mkdtemp(path.join(dirs.root, 'export-')),
					(version) => version.id === id,
				)
			).map((record) => record.id);
		expect(await exported('ping.called')).toEqual(['ping.called', 'ping.token']);
		expect(await exported('demo.echo')).toEqual(['demo.echo', 'demo.echo', 'demo.echo']);
	});

	it('exports only the versions that the filter takes', async () => {
		await importDir(await sourceDir());
		const out = await mkdtemp(path.join(dirs.root, 'export-'));
		const records = await exportContractStore(
			instance.current.store,
			out,
			({ version }) => version === '1.0.1',
		);
		expect(records.map(({ version }) => version)).toEqual(['1.0.1']);
	});
});

describe('contractStore with triggers and credentials', () => {
	const ping = async () => {
		const entry = path.join(dirs.root, 'ping.ts');
		await writeFile(entry, pingSource);
		const credential = await freezeCredential(pingToken);
		if (!credential) throw new Error('ping.token has no manifest');
		return { trigger: await freezeAction(entry, 'pinged'), credential };
	};

	const publishPing = async (credentialKey = privateKey) => {
		const { trigger, credential } = await ping();
		const triggerText = manifestTextOf(trigger.manifest);
		const credentialText = manifestTextOf(credential);
		await addToStore(dirs.registry, [
			{
				manifestText: credentialText,
				signatures: [signStoreManifest(credentialText, credentialKey)],
			},
			{
				manifestText: triggerText,
				bundle: trigger.bundle,
				signatures: [signStoreManifest(triggerText, privateKey)],
			},
		]);
		const { id, semver, bundleHash, contractHash } = trigger.manifest;
		return { trigger, credential, lock: { action: id, version: semver, bundleHash, contractHash } };
	};

	it('takes a trigger version and the credential manifest it pins from the registry', async () => {
		const { trigger, credential, lock } = await publishPing();
		expect(trigger.manifest).toMatchObject({ kind: 'trigger', credentials: ['pingApi@1'] });
		const store = storeOf();
		expect((await store.locked(lock)).manifest).toEqual(trigger.manifest);

		const reread = storeOf();
		expect((await reread.versions()).get('ping.pinged')?.[0]?.manifest).toEqual(trigger.manifest);
		expect((await reread.credentials()).get('pingApi')).toEqual(credential);
		const manifestOf = credentialManifestsOf(reread);
		expect(await manifestOf('pingApi')).toEqual(credential);
		expect((await manifestOf('notionApi'))?.id).toBe('notion.token');
		expect(await manifestOf('unknownApi')).toBeUndefined();
		const legacy = credentialManifestsOf(reread, (name) => name === 'pingApi');
		expect(await legacy('pingApi')).toBeUndefined();
	});

	it('takes no credential manifest from the registry without a key', async () => {
		const { trigger, lock } = await publishPing();
		const store = storeOf({ keys: noKeys });
		expect((await store.locked(lock)).manifest).toEqual(trigger.manifest);
		expect((await store.credentials()).has('pingApi')).toBe(false);
	});

	it('refuses a pinned credential manifest without the trusted signature', async () => {
		const { lock } = await publishPing(strangerKey);
		await expect(storeOf().locked(lock)).rejects.toThrow('ping.token@1.0.0 (sha256:');
		expect((await storeOf({ keys: noKeys }).credentials()).has('pingApi')).toBe(false);
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
	const [embedded] = versionsOf('httpRequest.send');

	it('runs only first-party versions in this process with the stored scope', () => {
		const inProcess = inProcessOf('stored');
		if (!embedded) throw new Error('httpRequest.send is not bundled');
		expect(embedded.origin).toBe('first-party');
		expect(inProcess?.(embedded)).toBe(true);
		expect(inProcess?.({ ...embedded, origin: 'community' })).toBe(false);
		expect(inProcess?.({ ...embedded, origin: 'private' })).toBe(false);
	});

	it('runs every version in the sandbox with the all scope', () => {
		if (!embedded) throw new Error('httpRequest.send is not bundled');
		expect(inProcessOf('all')?.(embedded)).toBe(false);
	});

	it('runs a first-party version from the registry in this process with the stored scope', async () => {
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		const version = await storeOf({ keys: bothKeys }).locked(lockOf('1.0.0'));
		expect(inProcessOf('stored')?.(version)).toBe(true);
	});

	it('refuses a URL from input outside the input hosts in a node run', async () => {
		useContractRegistry({
			policy: 'tolerant',
			store: storeOf(),
			metaOf: async () => undefined,
			nodeContractRange: '>=2.0.0 <3.0.0',
			egressInputHosts: [' Allowed.test'],
		});
		const httpRequest = vi.fn();
		const context = {
			getInputData: () => [{ json: {} }],
			getNode: () => ({ name: 'GET', credentials: {} }),
			getNodeParameter: (name: string) => (name === 'url' ? 'https://other.test/x' : undefined),
			continueOnFail: () => false,
			helpers: { httpRequest },
		} as unknown as IExecuteFunctions;
		const NodeType = toNodeType(getRequest);

		await expect(new NodeType().execute?.call(context)).rejects.toThrow(
			'this n8n instance lets a URL from input reach only allowed.test, not other.test',
		);
		expect(httpRequest).not.toHaveBeenCalled();
		use();
	});
});
