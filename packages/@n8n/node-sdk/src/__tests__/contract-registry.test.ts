import { hostRuntime, toVersionedNodeType, type FrozenVersion } from '../entry/host';
import {
	addStatusToStore,
	addToStore,
	canonicalJson,
	manifestTextOf,
	signStoreManifest,
	signStoreStatus,
	storeBlobFileOf,
	storeFilesOfDir,
	storeIndexFileOf,
	storeReader,
	type NodeContractLock,
	type StoreStatusRecord,
} from '../entry/registry';
import { defineNode, t } from '../index';
import { credential, defineCredential, field } from '../entry/credentials';
import { freezeAction, freezeCredential, freezeNative, type FrozenAction } from '../freeze';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { link, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	LoggerProxy,
	type IExecuteFunctions,
	type INodeContractPin,
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
	embeddedContractsOf,
	syncContractStore,
	originOf,
	type ContractInstall,
	type ContractKeys,
	type ContractStoreOptions,
	type ContractVersionLoaderOptions,
	type InstanceStore,
	type StoredVersion,
} from '../contract-registry';

// The built embedded stores of the first-party packages.
const embedded = embeddedContractsOf(
	['nodes-core', 'nodes-integrations'].map((name) => ({
		name: `@n8n/${name}`,
		dir: path.resolve(__dirname, '../../..', name),
	})),
);
const versionsOf = (id: string) => embedded.versionsOf(id);

vi.mock('node:fs/promises', async (importOriginal) => {
	const fs = await importOriginal<typeof import('node:fs/promises')>();
	return { ...fs, link: vi.fn(fs.link) };
});

const echoSource = (minor: number, text: string, imports = '') => `
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
	${imports}
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

/** A native trigger that pins `ping.token@1`. */
const pingCalled = defineNode({
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
	const statuses = new Map<string, StoreStatusRecord>();
	const store: InstanceStore = {
		embedded,
		statuses: async (id) =>
			[...statuses.values()].filter((status) => id === undefined || status.id === id),
		insertStatuses: async (lines) => {
			lines.forEach((line) => statuses.set(canonicalJson(line), line));
		},
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
	return { rows, statuses, store };
};

/** The versions in the fake registry, by version. A test may replace one. */
const published = new Map<string, Published>();
const dirs = { root: '', registry: '' };
const instance = { current: memoryStore() };
const registry = { url: '', server: createServer() };
const versions = new Map<string, FrozenAction>();
/** The status lines of `demo.echo` in the fake registry. */
const registryStatuses: StoreStatusRecord[] = [];

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
		[...lines, ...registryStatuses].map((line) => `${JSON.stringify(line)}\n`).join(''),
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
	const freeze = async (minor: number, text: string, last?: string, imports?: string) => {
		await writeFile(entry, echoSource(minor, text, imports));
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
	await freeze(2, 'input.text', undefined, "imports: ['code'],");
	await freeze(2, "input.text + '!'", '1.2.0', "imports: ['code'],");
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
	registryStatuses.length = 0;
	['1.0.0', '1.0.1', '1.1.0'].forEach((version) =>
		published.set(version, { frozen: frozenOf(version), key: privateKey }),
	);
	await writeRegistry();
});

afterAll(async () => {
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

const pinOf = (version: string): INodeContractPin => {
	const { manifest } = frozenOf(version);
	const digest = createHash('sha256').update(manifestTextOf(manifest)).digest('hex');
	return { version: manifest.semver, digest: `sha256:${digest}` };
};

/** The pin on the node and the `meta` of its workflow. */
interface Target {
	readonly contract?: INodeContractPin;
	readonly meta?: unknown;
}

const contextOf = (metadata: ITaskMetadata[] = [], contract?: INodeContractPin) =>
	({
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Echo', credentials: {}, contract }),
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
		runsNodeContract: hostRuntime().runsNodeContract,
		...options,
	});

const run = async (
	{ contract, meta }: Target,
	options: Partial<
		Omit<ContractVersionLoaderOptions, 'store'> & Omit<ContractStoreOptions, 'store'>
	> = {},
	metadata: ITaskMetadata[] = [],
	head = bundled('1.1.0'),
) => {
	const versionLoader = contractVersionLoader({
		policy: 'tolerant',
		store: storeOf(options),
		metaOf: async () => meta,
		...options,
	});
	const NodeType = toVersionedNodeType([head], hostRuntime({ versionLoader }));
	const result = await new NodeType().getNodeType(1).execute?.call(contextOf(metadata, contract));
	const [items = []]: INodeExecutionData[][] = Array.isArray(result) ? result : [];
	return items.map((item) => item.json.text);
};

const locked = (version: string, policy?: string): Target => ({
	contract: pinOf(version),
	meta: policy ? { nodeContractsPolicy: policy } : {},
});

describe('contractVersionLoader', () => {
	it('runs the bundled HEAD for a node without a pin or with a pin of another major', async () => {
		expect(await run({})).toEqual(['hello#']);
		expect(await run({ contract: { ...pinOf('1.0.0'), version: '2.0.0' } })).toEqual(['hello#']);
	});

	it('runs the pin of the node and reads the workflow meta only for the policy', async () => {
		const metaOf = vi.fn(async () => ({ nodeContractsPolicy: 'strict' }));
		expect(await run({}, { metaOf })).toEqual(['hello#']);
		expect(metaOf).not.toHaveBeenCalled();
		expect(await run({ contract: pinOf('1.0.0') }, { metaOf })).toEqual(['HELLO']);
		expect(await run({ contract: pinOf('1.0.1') }, { metaOf })).toEqual(['hello?']);
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

	it('names the action, version and digest when the pinned version does not load', async () => {
		const { digest } = pinOf('1.0.0');
		await expect(run(locked('1.0.0'), { registryUrl: '', policy: 'strict' })).rejects.toThrow(
			`Cannot get demo.echo@1.0.0 (${digest}) from the registry (none set)`,
		);
		published.delete('1.0.0');
		await writeRegistry();
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			`Cannot get demo.echo@1.0.0 (${digest}) from the registry ${registry.url}: The registry does not have this version`,
		);
	});

	it('refuses a locked version or its patch that a denied permission class has', async () => {
		await publish(frozenOf('1.2.0'));
		await publish(frozenOf('1.2.1'));
		const onPermissionRefused = vi.fn();
		const deny = { permissionsDeny: ['code'], onPermissionRefused };

		expect(await run({}, deny)).toEqual(['hello#']);
		await expect(run(locked('1.2.0'), { ...deny, policy: 'strict' })).rejects.toThrow(
			'demo.echo@1.2.0 does not run: N8N_NODE_PERMISSIONS_DENY denies its permission class "code"',
		);
		await expect(run(locked('1.2.0'), deny)).rejects.toThrow(
			'demo.echo@1.2.1 does not run: N8N_NODE_PERMISSIONS_DENY denies its permission class "code"',
		);
		expect(onPermissionRefused).toHaveBeenCalledWith({
			action: 'demo.echo',
			version: '1.2.0',
			node: expect.objectContaining({ name: 'Echo' }),
			permission: 'code',
			message:
				'demo.echo@1.2.0 does not run: N8N_NODE_PERMISSIONS_DENY denies its permission class "code"',
		});
		expect(await run(locked('1.2.0'), { policy: 'strict', permissionsDeny: ['files'] })).toEqual([
			'hello',
		]);
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
		const { manifest } = await store.locked('demo.echo', pinOf('1.0.0'));
		const [row] = instance.current.rows.values();
		await storeOf().locked('demo.echo', pinOf('1.0.0'));
		expect([...instance.current.rows.values()]).toEqual([row]);
		expect([...(await store.bundleHashes())]).toEqual([manifest.bundleHash]);
	});

	it('lists the newest stored version of each major', async () => {
		const store = storeOf();
		await Promise.all(
			['1.0.0', '1.0.1'].map(async (version) => await store.locked('demo.echo', pinOf(version))),
		);
		const versions = await storeOf().versions();
		expect(versions.get('demo.echo')?.map(({ manifest }) => manifest.semver)).toEqual(['1.0.1']);
	});

	it('pins the newest version of a major that is not yanked, and keeps a pin of that major', async () => {
		const store = storeOf();
		for (const version of ['1.0.0', '1.0.1', '1.1.0'])
			await store.locked('demo.echo', pinOf(version));
		expect(await storeOf().pinOf('demo.echo', 1)).toEqual(pinOf('1.1.0'));
		expect(await storeOf().pinOf('demo.echo', 1, pinOf('1.0.0'))).toEqual(pinOf('1.0.0'));
		const unknown = { version: '1.0.7', digest: `sha256:${'b'.repeat(64)}` };
		const keepUnknown = { keepUnknown: true };
		expect(await storeOf().pinOf('demo.echo', 1, unknown)).toEqual(pinOf('1.1.0'));
		expect(await storeOf().pinOf('demo.echo', 1, unknown, keepUnknown)).toEqual(unknown);
		const otherBytes = { ...pinOf('1.0.1'), version: '1.0.0' };
		expect(await storeOf().pinOf('demo.echo', 1, otherBytes, keepUnknown)).toEqual(pinOf('1.1.0'));
		const sameVersion = { ...unknown, version: '1.0.1' };
		expect(await storeOf().pinOf('demo.echo', 1, sameVersion, keepUnknown)).toEqual(pinOf('1.1.0'));
		expect(await storeOf().pinOf('demo.echo', 1, { version: '1.0', digest: 'x' })).toEqual(
			pinOf('1.1.0'),
		);
		expect(await storeOf().pinOf('demo.echo', 2, pinOf('1.0.0'))).toBeUndefined();
		const yank = { id: 'demo.echo', yank: '1.1.0', reason: 'wrong output', at: '2026-10-02' };
		await instance.current.store.insertStatuses([
			{ ...yank, signatures: [signStoreStatus(yank, privateKey)] },
		]);
		expect(await storeOf().pinOf('demo.echo', 1)).toEqual(pinOf('1.0.1'));
	});

	it('pins and resolves a bundled version without a registry', async () => {
		const [head] = versionsOf('httpRequest.send');
		if (!head) throw new Error('no bundled version');
		const store = storeOf({ registryUrl: '' });
		const pin = await store.pinOf('httpRequest.send', head.manifest.contract.version);
		expect(pin).toEqual({ version: head.manifest.semver, digest: head.digest });
		if (!pin) throw new Error('no pin');
		expect((await store.locked('httpRequest.send', pin)).manifest).toEqual(head.manifest);
		await expect(store.locked('httpRequest.send', { ...pin, version: '9.9.9' })).rejects.toThrow(
			'but the pin names httpRequest.send@9.9.9',
		);
	});

	it('fetches a version again when the store no longer has it', async () => {
		const store = storeOf();
		await store.locked('demo.echo', pinOf('1.0.0'));
		instance.current.rows.clear();
		await store.locked('demo.echo', pinOf('1.0.0'));
		expect([...instance.current.rows.values()].map(({ version }) => version)).toEqual(['1.0.0']);
	});

	it('reads only the store on a host that may not fetch', async () => {
		await storeOf().locked('demo.echo', pinOf('1.0.1'));
		const fetchRegistry = vi.fn(async () => new Response(null, { status: 500 }));
		const worker = storeOf({ mayFetch: () => false, fetch: fetchRegistry });
		expect(await (await worker.locked('demo.echo', pinOf('1.0.1'))).readBundle()).toBe(
			frozenOf('1.0.1').bundle,
		);
		expect(
			(await worker.newerPatches(lockOf('1.0.0'))).map(({ manifest }) => manifest.semver),
		).toEqual(['1.0.1']);
		await expect(worker.locked('demo.echo', pinOf('1.0.0'))).rejects.toThrow(
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
		await expect(store.locked('demo.echo', pinOf('1.0.0'))).rejects.toThrow(
			`Cannot get demo.echo@1.0.0 (${pinOf('1.0.0').digest}) from the registry ${registry.url}`,
		);
	});

	it('refuses a version whose manifest does not match the pin', async () => {
		const store = storeOf();
		const pin = { ...pinOf('1.0.0'), version: '1.0.5' };
		const message = `The version ${pin.digest} is demo.echo@1.0.0, but the pin names demo.echo@1.0.5`;
		await expect(store.locked('demo.echo', pin)).rejects.toThrow(message);
		await store.locked('demo.echo', pinOf('1.0.0'));
		await expect(store.locked('demo.echo', pin)).rejects.toThrow(message);
		await expect(store.locked('demo.other', pinOf('1.0.0'))).rejects.toThrow(
			'but the pin names demo.other@1.0.0',
		);
		await expect(storeOf().locked('demo.other', pinOf('1.0.0'))).rejects.toThrow(
			'The registry does not have this version',
		);
	});

	it('serves only signed versions when a key is set', async () => {
		await publish(frozenOf('1.0.0'), strangerKey);
		await storeOf({ keys: noKeys }).locked('demo.echo', pinOf('1.0.0'));
		expect((await storeOf({ keys: noKeys }).versions()).has('demo.echo')).toBe(true);
		expect((await storeOf().versions()).has('demo.echo')).toBe(false);
		await expect(storeOf().locked('demo.echo', pinOf('1.0.0'))).rejects.toThrow(
			'is not signed by a trusted key',
		);
	});

	it('runs a stored version as a newer patch only when its pin or signature allows it', async () => {
		const store = storeOf();
		const stored = await store.locked('demo.echo', pinOf('1.0.1'));
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
		expect((await store.locked('demo.echo', pinOf('1.0.0'))).origin).toBe('first-party');
		expect((await store.locked('demo.echo', pinOf('1.0.1'))).origin).toBe('community');
		expect(originsOfRows()).toEqual([
			['1.0.0', 'first-party'],
			['1.0.1', 'community'],
		]);
		const reread = storeOf({ keys: bothKeys });
		expect((await reread.versions()).get('demo.echo')?.map(({ origin }) => origin)).toEqual([
			'community',
		]);
		expect((await reread.locked('demo.echo', pinOf('1.0.0'))).origin).toBe('first-party');
	});

	it('serves a first-party version with the origin that the keys prove now', async () => {
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		await storeOf({ keys: bothKeys }).locked('demo.echo', pinOf('1.0.0'));
		const [[digest, row] = []] = [...instance.current.rows];
		if (!digest || !row) throw new Error('no stored row');
		const vettingSignature = signStoreManifest(row.manifestText, privateKey);
		instance.current.rows.set(digest, {
			...row,
			signatures: [...(row.signatures ?? []), vettingSignature],
		});
		expect((await storeOf({ keys: bothKeys }).locked('demo.echo', pinOf('1.0.0'))).origin).toBe(
			'first-party',
		);
		expect((await storeOf({ keys: vettingKeys }).locked('demo.echo', pinOf('1.0.0'))).origin).toBe(
			'community',
		);
		expect((await storeOf({ keys: noKeys }).locked('demo.echo', pinOf('1.0.0'))).origin).toBe(
			'private',
		);
	});

	it('takes an unsigned version as private only without a key', async () => {
		await publish(frozenOf('1.0.0'), strangerKey);
		expect((await storeOf({ keys: noKeys }).locked('demo.echo', pinOf('1.0.0'))).origin).toBe(
			'private',
		);
		instance.current = memoryStore();
		await expect(storeOf({ keys: bothKeys }).locked('demo.echo', pinOf('1.0.0'))).rejects.toThrow(
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

	it('applies a newer patch only from the origin of the pinned version', async () => {
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		expect(await run(locked('1.0.0'), { keys: bothKeys })).toEqual(['HELLO']);
		instance.current = memoryStore();
		await publish(frozenOf('1.0.1'), firstParty.privateKey);
		expect(await run(locked('1.0.0'), { keys: bothKeys })).toEqual(['hello?']);
	});

	it('runs a first-party HEAD that is not older than the pin only when tolerant and the pinned version does not load', async () => {
		const warn = vi.spyOn(LoggerProxy, 'warn');
		const options = { keys: bothKeys, registryUrl: '' };
		expect(await run(locked('1.0.0'), options, [], bundled('1.0.1'))).toEqual(['hello?']);
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('Node "Echo" runs demo.echo@1.0.1: Cannot get demo.echo@1.0.0'),
		);
		await expect(
			run(locked('1.0.0'), { ...options, policy: 'strict' }, [], bundled('1.0.1')),
		).rejects.toThrow('Cannot get demo.echo@1.0.0');
		await expect(run(locked('1.1.0'), options, [], bundled('1.0.1'))).rejects.toThrow(
			'Cannot get demo.echo@1.1.0',
		);
		const community = { ...bundled('1.0.1'), origin: 'community' as const };
		await expect(run(locked('1.0.0'), options, [], community)).rejects.toThrow(
			'Cannot get demo.echo@1.0.0',
		);
		warn.mockRestore();
	});
});

describe('status lines', () => {
	const at = '2026-10-02T12:00:00.000Z';
	const signed = (status: StoreStatusRecord, key = privateKey): StoreStatusRecord => ({
		...status,
		signatures: [signStoreStatus(status, key)],
	});
	const yankOf = (version: string, key?: string) =>
		signed({ id: 'demo.echo', yank: version, reason: 'wrong output', at }, key);
	const revokeOf = (version: string, key?: string) =>
		signed({ id: 'demo.echo', revoke: version, reason: 'leaks the token', at }, key);
	const inRegistry = async (...statuses: StoreStatusRecord[]) => {
		registryStatuses.push(...statuses);
		await writeRegistry();
	};

	it('runs a pinned yanked version and takes no yanked version as a newer patch', async () => {
		await inRegistry(yankOf('1.0.1'));
		expect(await run(locked('1.0.0'))).toEqual(['HELLO']);
		expect(await run(locked('1.0.1'))).toEqual(['hello?']);
		expect(await run(locked('1.0.1'), { policy: 'strict' })).toEqual(['hello?']);
	});

	it('lists no yanked version as the newest of its major while another one is there', async () => {
		const store = storeOf();
		await store.locked('demo.echo', pinOf('1.0.0'));
		await store.locked('demo.echo', pinOf('1.0.1'));
		const newest = async () =>
			(await storeOf().versions()).get('demo.echo')?.map(({ manifest }) => manifest.semver);
		expect(await newest()).toEqual(['1.0.1']);
		await inRegistry(yankOf('1.0.1'));
		await syncContractStore(store, [
			{
				workflowId: 'wf',
				workflowName: 'wf',
				node: 'Echo',
				action: 'demo.echo',
				pin: pinOf('1.0.0'),
			},
		]);
		expect(await newest()).toEqual(['1.0.0']);
		await inRegistry(yankOf('1.0.0'));
		await storeOf().syncStatuses(['demo.echo'], Date.now());
		expect(await newest()).toEqual(['1.0.1']);
	});

	it('refuses a pinned revoked version unless the admin allows it', async () => {
		await inRegistry(revokeOf('1.0.0'));
		await expect(run(locked('1.0.0'), { policy: 'strict' })).rejects.toThrow(
			'demo.echo@1.0.0 is revoked: leaks the token. An admin can allow it in N8N_NODE_CONTRACTS_REVOKED_ALLOW',
		);
		expect(
			await run(locked('1.0.0'), { policy: 'strict', revokedAllowed: ['demo.echo@1.0.0'] }),
		).toEqual(['HELLO']);
		expect(await run(locked('1.0.0'))).toEqual(['hello?']);
	});

	it('ignores a status line that no trusted key signs', async () => {
		await inRegistry(yankOf('1.0.1', strangerKey), {
			id: 'demo.echo',
			revoke: '1.0.1',
			reason: 'unsigned',
			at,
		});
		expect(await run(locked('1.0.0'))).toEqual(['hello?']);
		expect(await run(locked('1.0.1'), { policy: 'strict' })).toEqual(['hello?']);
		expect(instance.current.statuses.size).toBe(0);
	});

	it('takes a status line of a first-party version only from the first-party key', async () => {
		const store = storeOf({ keys: bothKeys });
		await instance.current.store.insertStatuses([revokeOf('1.1.0')]);
		expect(await run({}, { keys: bothKeys })).toEqual(['hello#']);
		await instance.current.store.insertStatuses([revokeOf('1.1.0', firstParty.privateKey)]);
		await expect(run({}, { keys: bothKeys })).rejects.toThrow('demo.echo@1.1.0 is revoked');
		expect((await store.withdrawal(bundled('1.1.0')))?.signatures).toEqual(
			revokeOf('1.1.0', firstParty.privateKey).signatures,
		);
	});

	it('takes unsigned status lines only of private versions without a key', async () => {
		const unsigned: StoreStatusRecord = { id: 'demo.echo', revoke: '1.0.0', reason: 'r', at };
		await inRegistry(unsigned, { ...unsigned, revoke: '1.1.0' });
		await expect(run(locked('1.0.0'), { policy: 'strict', keys: noKeys })).rejects.toThrow(
			'demo.echo@1.0.0 is revoked',
		);
		await storeOf({ keys: noKeys }).syncStatuses(['demo.echo'], Date.now());
		expect(await run({}, { keys: noKeys })).toEqual(['hello#']);
	});

	it('keeps the status lines through import and export', async () => {
		const dir = await mkdtemp(path.join(dirs.root, 'statuses-'));
		await addToStore(
			dir,
			['1.0.0', '1.0.1'].map((version) => {
				const { manifest, bundle } = frozenOf(version);
				const manifestText = manifestTextOf(manifest);
				return { manifestText, bundle, signatures: [signStoreManifest(manifestText, privateKey)] };
			}),
		);
		const deprecation = signed({ id: 'demo.echo', deprecate: '1', message: 'Use major 2', at });
		await addStatusToStore(dir, [yankOf('1.0.1'), deprecation, revokeOf('1.0.0', strangerKey)]);
		await importContractStore(
			storeReader(storeFilesOfDir(dir)),
			instance.current.store,
			vettingKeys,
		);
		expect([...instance.current.statuses.values()]).toEqual([yankOf('1.0.1'), deprecation]);
		const out = await mkdtemp(path.join(dirs.root, 'export-'));
		await exportContractStore(instance.current.store, out);
		expect((await storeReader(storeFilesOfDir(out)).index('demo.echo')).statuses).toEqual([
			deprecation,
			yankOf('1.0.1'),
		]);
		const pinned = await mkdtemp(path.join(dirs.root, 'export-'));
		await exportContractStore(instance.current.store, pinned, ({ version }) => version === '1.0.0');
		expect((await storeReader(storeFilesOfDir(pinned)).index('demo.echo')).statuses).toEqual([
			deprecation,
		]);
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

	it('refuses a version whose pinned credential manifest n8n does not have', async () => {
		const dir = await sourceDir();
		await addToStore(dir, [
			{
				manifestText: manifestTextOf(await freezeNative(pingCalled)),
				signatures: [],
			},
		]);
		await expect(importDir(dir, noKeys)).rejects.toThrow(
			'ping.called@1.0.0 pins the credential ping.token@1',
		);
		expect(instance.current.rows.size).toBe(0);
	});

	it('admits a version whose pinned credential manifest n8n bundles', async () => {
		const [head] = versionsOf('notion.user.get');
		if (!head) throw new Error('notion.user.get is not bundled');
		expect(head.manifest.credentials).toContain('notion.token@1');
		const manifestText = manifestTextOf(head.manifest);
		const admitted = await admitVersions(instance.current.store, [
			{
				id: head.manifest.id,
				version: head.manifest.semver,
				kind: head.manifest.kind,
				manifest: 'sha256:notion',
				manifestText,
				bundle: await head.readBundle(),
				origin: 'private',
			},
		]);
		expect(admitted).toHaveLength(1);
	});

	it('refuses other bytes for a stored credential version', async () => {
		await importDir(await credentialAndNativeDir());
		const row = [...instance.current.rows.values()].find(({ kind }) => kind === 'credential');
		if (!row) throw new Error('no credential imported');
		await expect(
			admitVersions(instance.current.store, [{ ...row, manifest: `sha256:${'f'.repeat(64)}` }]),
		).rejects.toThrow('ping.token@1.0.0 is in the store with other bytes');
	});

	it('refuses other bytes that another admission stored after the check', async () => {
		await importDir(await sourceDir());
		const [row] = instance.current.rows.values();
		if (!row) throw new Error('nothing imported');
		const reads = { count: 0 };
		// The table skips a second row of one id and version, as its unique index does.
		const racing: InstanceStore = {
			...instance.current.store,
			manifests: async (id) => {
				reads.count += 1;
				return reads.count === 1 ? [] : await instance.current.store.manifests(id);
			},
			insert: async () => {},
		};
		await expect(
			admitVersions(racing, [{ ...row, manifest: `sha256:${'f'.repeat(64)}` }]),
		).rejects.toThrow('demo.echo@1.0.0 is in the store with other bytes');
	});

	it('refuses other bytes for a stored version', async () => {
		await importDir(await sourceDir());
		const [row] = instance.current.rows.values();
		if (!row) throw new Error('nothing imported');
		await expect(
			admitVersions(instance.current.store, [{ ...row, manifest: `sha256:${'f'.repeat(64)}` }]),
		).rejects.toThrow('demo.echo@1.0.0 is in the store with other bytes');
	});

	it('reports each new major with the permissions that it adds to the major below it', async () => {
		const entry = path.join(dirs.root, 'echo-two.ts');
		await writeFile(
			entry,
			echoSource(0, 'input.text')
				.replace('version: 1', 'version: 2')
				.replace('flow:', "egress: { hosts: ['api.echo.test'] },\n\tflow:"),
		);
		const two = await freezeAction(entry, 'echo');
		const storedOf = ({ manifest, bundle }: FrozenAction): StoredVersion => ({
			id: manifest.id,
			version: manifest.semver,
			kind: manifest.kind,
			manifest: `sha256:${manifest.semver}`,
			manifestText: manifestTextOf(manifest),
			bundle,
			origin: 'community',
		});
		const installs: ContractInstall[] = [];
		const store: InstanceStore = {
			...instance.current.store,
			installed: (added) => installs.push(...added),
		};
		await admitVersions(store, [storedOf(frozenOf('1.0.0')), storedOf(frozenOf('1.1.0'))]);
		await admitVersions(store, [storedOf(frozenOf('1.0.1'))]);
		await admitVersions(store, [storedOf(two)]);
		expect(installs).toEqual([
			{ id: 'demo.echo', version: '1.0.0', origin: 'community', addedPermissions: [] },
			{
				id: 'demo.echo',
				version: '2.0.0',
				previousVersion: '1.1.0',
				origin: 'community',
				addedPermissions: ['egress api.echo.test'],
			},
		]);
	});

	it('admits the versions when the install report throws', async () => {
		const store: InstanceStore = {
			...instance.current.store,
			installed: () => {
				throw new Error('listener failed');
			},
		};
		const { manifest, bundle } = frozenOf('1.0.0');
		const admitted = await admitVersions(store, [
			{
				id: manifest.id,
				version: manifest.semver,
				kind: manifest.kind,
				manifest: 'sha256:1.0.0',
				manifestText: manifestTextOf(manifest),
				bundle,
				origin: 'community',
			},
		]);
		expect(admitted.map(({ version }) => version)).toEqual(['1.0.0']);
		expect(await store.has('sha256:1.0.0')).toBe(true);
	});

	it('exports blobs by rename when the file system has no hard links', async () => {
		await storeOf().locked('demo.echo', pinOf('1.0.0'));
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
		await addToStore(
			dir,
			[pingCredential, await freezeNative(pingCalled)].map((manifest) => {
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
		const digest = createHash('sha256').update(triggerText).digest('hex');
		const pin = { version: trigger.manifest.semver, digest: `sha256:${digest}` };
		return { trigger, credential, pin };
	};

	it('takes a trigger version and the credential manifest it pins from the registry', async () => {
		const { trigger, credential, pin } = await publishPing();
		expect(trigger.manifest).toMatchObject({ kind: 'trigger', credentials: ['ping.token@1'] });
		const store = storeOf();
		expect((await store.locked('ping.pinged', pin)).manifest).toEqual(trigger.manifest);

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
		const { pin } = await publishPing();
		const store = storeOf({ keys: noKeys });
		await expect(store.locked('ping.pinged', pin)).rejects.toThrow(
			'ping.pinged@1.0.0 pins the credential ping.token@1',
		);
		expect(instance.current.rows.size).toBe(0);
		expect((await store.credentials()).has('pingApi')).toBe(false);
	});

	it('takes the version without a key when the store has its pinned credential manifest', async () => {
		const { trigger, credential, pin } = await publishPing();
		const manifestText = manifestTextOf(credential);
		await admitVersions(instance.current.store, [
			{
				id: credential.id,
				version: credential.semver,
				kind: 'credential',
				manifest: 'sha256:ping-token',
				manifestText,
				origin: 'private',
			},
		]);
		expect((await storeOf({ keys: noKeys }).locked('ping.pinged', pin)).manifest).toEqual(
			trigger.manifest,
		);
	});

	it('does not list a stored version whose pinned credential manifest it does not have', async () => {
		const { trigger } = await ping();
		instance.current.rows.set('sha256:pinged', {
			id: trigger.manifest.id,
			version: trigger.manifest.semver,
			kind: 'trigger',
			manifest: 'sha256:pinged',
			manifestText: manifestTextOf(trigger.manifest),
			bundle: trigger.bundle,
			origin: 'private',
		});
		expect((await storeOf({ keys: noKeys }).versions()).has('ping.pinged')).toBe(false);
	});

	it('refuses a pinned credential manifest without the trusted signature', async () => {
		const { pin } = await publishPing(strangerKey);
		await expect(storeOf().locked('ping.pinged', pin)).rejects.toThrow('ping.token@1.0.0 (sha256:');
		expect((await storeOf({ keys: noKeys }).credentials()).has('pingApi')).toBe(false);
	});
});

describe('syncContractStore', () => {
	const nodeOf = (version: string, workflowId = 'wf') => ({
		workflowId,
		workflowName: workflowId,
		node: 'Echo',
		action: 'demo.echo',
		pin: pinOf(version),
	});

	it('adds each missing pinned version once and reports what it cannot get', async () => {
		const store = storeOf();
		await store.locked('demo.echo', pinOf('1.0.0'));
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
			['wf', expect.stringContaining('Cannot get demo.echo@1.1.0 (sha256:')],
		]);
		expect(result.unsupported).toEqual([]);
	});

	it('reads each registry index once in the pages of one sync', async () => {
		const fetchRegistry = vi.fn<ContractStoreOptions['fetch']>(
			async (url, init) => await fetch(url, init),
		);
		const store = storeOf({ fetch: fetchRegistry });
		const since = Date.now();
		await syncContractStore(store, [nodeOf('1.0.1')], since);
		await syncContractStore(store, [nodeOf('1.0.0')], since);
		const indexReads = fetchRegistry.mock.calls.filter(([url]) =>
			url.endsWith(storeIndexFileOf('demo.echo')),
		);
		expect(indexReads).toHaveLength(1);
	});

	it('reports nodes whose pinned version needs a Node Contract version the host does not run', async () => {
		const { runsNodeContract } = hostRuntime({ nodeContractRange: '>=3.0.0 <4.0.0' });
		const result = await syncContractStore(storeOf({ runsNodeContract }), [nodeOf('1.0.0')]);
		expect(result.unsupported).toEqual([{ ...nodeOf('1.0.0'), nodeContract: '2.1.0' }]);
	});
});

describe('embedded contracts', () => {
	it('give a bundled version and a version that the first-party key signs the first-party origin', async () => {
		const [version] = versionsOf('httpRequest.send');
		expect(version?.origin).toBe('first-party');
		await publish(frozenOf('1.0.0'), firstParty.privateKey);
		const signed = await storeOf({ keys: bothKeys }).locked('demo.echo', pinOf('1.0.0'));
		expect(signed.origin).toBe('first-party');
	});

	it('give no version of an id that no package ships', () => {
		expect(versionsOf('demo.echo')).toEqual([]);
	});
});
