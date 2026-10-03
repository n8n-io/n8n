import {
	runsNodeContract,
	setContractVersionLoader,
	setCredentialManifests,
	setEgressInputHosts,
	setExecutorLoader,
	setNodeContractRange,
	setRunProfileListener,
	type ContractVersionLoader,
	type FrozenVersion,
	type RunProfileListener,
} from '@n8n/node-sdk/host';
import {
	addToStore,
	compareSemver,
	isVersionManifest,
	parseCredentialManifest,
	parseManifest,
	parseNativeManifest,
	parseSemver,
	resolveContractVersion,
	storeFilesOfUrl,
	storeReader,
	verifyStoreSignature,
	type CredentialManifest,
	type NodeContractLock,
	type NodeContractsPolicy,
	type NodeContractVersion,
	type StoreReader,
	type StoreRecord,
	type StoreVersion,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
import { sandboxExecutorLoader, warmSandbox, type SandboxOptions } from '@n8n/node-sdk/sandbox';
import {
	LoggerProxy,
	UserError,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { bundledCredentialsOf, versionsOf } from './registry';

export interface ContractStoreOptions {
	/**
	 * The registry: a static store at `https://…` or `file://…`. Empty: only the bundled HEAD and
	 * stored versions run.
	 */
	readonly registryUrl: string;
	/**
	 * PEM of the trusted publisher key. With it, the store takes and serves only signed versions.
	 * Without it, no patch newer than the lock applies.
	 */
	readonly publicKey: string | undefined;
	/** The store of the instance. Each version that the registry gives goes into it. */
	readonly store: InstanceStore;
	/**
	 * False on a host that only reads the store, e.g. a worker. Then a version that the store
	 * does not have fails. Default: true.
	 */
	readonly mayFetch?: () => boolean;
	readonly fetch: (url: string, init: { signal: AbortSignal }) => Promise<Response>;
	/** For each registry request. */
	readonly fetchTimeoutMs?: number;
}

export interface ContractRegistryOptions {
	/** The instance policy. `meta.nodeContractsPolicy` of a workflow overrides it. */
	readonly policy: NodeContractsPolicy;
	readonly store: ContractStore;
	/** The `meta` of the running workflow, from a root node or a sub-node. */
	readonly metaOf: (context: IExecuteFunctions | ISupplyDataFunctions) => Promise<unknown>;
	/** The Node Contract versions a bundle may declare, e.g. `>=2.0.0 <3.0.0`. */
	readonly nodeContractRange: string;
	/**
	 * Runs bundles in the WASM sandbox. `stored`: the versions that this package does not bundle.
	 * `all`: every version. Without it, every bundle runs in this process.
	 */
	readonly sandbox?: { readonly options: SandboxOptions; readonly scope: 'stored' | 'all' };
	/** Gets the run profile of each node execution, e.g. for traces. Without it, nothing is recorded. */
	readonly onRunProfile?: RunProfileListener;
	/** The host patterns that a URL from input may reach, in-process and in the sandbox. Empty: no limit. */
	readonly egressInputHosts?: readonly string[];
	/**
	 * Whether another package of n8n has a credential type of this name, e.g. a legacy class. That
	 * type signs, so a stored credential manifest of the name does not apply.
	 */
	readonly hasOtherCredentialType?: (name: string) => boolean;
}

/**
 * The store of action versions that n8n does not bundle. Each version is checked before the
 * store takes it: the digests of its blobs, the manifest against the lock, and the publisher
 * signature when a key is set.
 */
export interface ContractStore {
	readonly registryUrl: string;
	/** The bundle hashes in the store. */
	bundleHashes(): Promise<ReadonlySet<string>>;
	/** The locked version, from the store or else from the registry into the store. */
	locked(lock: NodeContractLock): Promise<FrozenVersion>;
	/** The newest stored version of each major, by action id. A bad version is skipped. */
	versions(): Promise<ReadonlyMap<string, readonly FrozenVersion[]>>;
	/** Signed patches of the locked major.minor with the locked contract hash. */
	newerPatches(lock: NodeContractLock): Promise<FrozenVersion[]>;
	/**
	 * The newest stored credential manifest of each n8n type name. A version that the store takes
	 * from the registry brings the credential manifests it pins when a key is set, unless n8n
	 * bundles that name.
	 */
	credentials(): Promise<ReadonlyMap<string, CredentialManifest>>;
}

/** A version in the store of an instance: its bytes and the index line fields that identify it. */
export type StoredVersion = StoreVersion &
	Pick<StoreRecord, 'id' | 'version' | 'kind' | 'manifest'>;

/** A stored version without its bundle and fixtures. */
export type StoredManifest = Pick<
	StoredVersion,
	'id' | 'version' | 'kind' | 'manifest' | 'manifestText' | 'signatures'
>;

/**
 * The store of an instance, e.g. a database table that every main and worker reads. It keeps
 * whole versions: each version that it lists has its bundle when its manifest has one. It does
 * not check the versions: `admitVersions` checks them before they go in.
 */
export interface InstanceStore {
	/** The stored versions of one id, or of every id. */
	manifests(id?: string): Promise<readonly StoredManifest[]>;
	/** The stored credential manifests. */
	credentialManifests(): Promise<readonly StoredManifest[]>;
	/** Whether the store has the version of a manifest digest. */
	has(manifest: string): Promise<boolean>;
	/** The bundle of a stored version by its manifest digest, or `undefined`. */
	bundle(manifest: string): Promise<string | undefined>;
	/** Every stored version with its bundle and fixtures. */
	versions(): Promise<readonly StoredVersion[]>;
	/** Inserts versions. It skips each manifest digest that it has. */
	insert(versions: readonly StoredVersion[]): Promise<void>;
}

/**
 * Inserts checked versions into the store and returns the versions that it did not have. A
 * stored version stays, and other bytes for its id and version are refused.
 */
export async function admitVersions(
	store: InstanceStore,
	versions: readonly StoredVersion[],
): Promise<StoredVersion[]> {
	const ids = [...new Set(versions.map(({ id }) => id))];
	const stored = (await Promise.all(ids.map(async (id) => await store.manifests(id)))).flat();
	const conflict = versions.find((version) =>
		stored.some(
			({ id, version: semver, manifest }) =>
				id === version.id && semver === version.version && manifest !== version.manifest,
		),
	);
	if (conflict) {
		throw new UserError(`${conflict.id}@${conflict.version} is in the store with other bytes`);
	}
	const added = versions.filter(
		(version, index) =>
			!stored.some(({ manifest }) => manifest === version.manifest) &&
			versions.findIndex(({ manifest }) => manifest === version.manifest) === index,
	);
	if (added.length > 0) await store.insert(added);
	return added;
}

/** A version of a store line and its bytes. */
const storedVersionOf = (
	{ id, version, kind, manifest, signatures, published }: StoreRecord,
	manifestText: string,
	blobs: Pick<StoredVersion, 'bundle' | 'fixtures'> = {},
): StoredVersion => ({
	id,
	version,
	kind,
	manifest,
	manifestText,
	...blobs,
	signatures,
	published,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isPolicy = (value: unknown): value is NodeContractsPolicy =>
	value === 'strict' || value === 'tolerant';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const HASH = /^[a-f0-9]{64}$/;

const isLock = (value: unknown): value is NodeContractLock =>
	isRecord(value) &&
	typeof value.action === 'string' &&
	typeof value.version === 'string' &&
	/^\d+\.\d+\.\d+$/.test(value.version) &&
	typeof value.bundleHash === 'string' &&
	HASH.test(value.bundleHash) &&
	typeof value.contractHash === 'string';

/** The valid locks of a workflow `meta`, by node name. */
export const locksOf = (meta: unknown): ReadonlyArray<readonly [string, NodeContractLock]> =>
	Object.entries(isRecord(meta) && isRecord(meta.nodeContracts) ? meta.nodeContracts : {}).flatMap(
		([node, lock]) => (isLock(lock) ? [[node, lock] as const] : []),
	);

const lockOf = ({ id, semver, bundleHash, contractHash }: VersionManifest): NodeContractLock => ({
	action: id,
	version: semver,
	bundleHash,
	contractHash,
});

// The bundle hash covers only the code. Without a key, the lock is the anchor of the manifest.
const mismatchOf = (manifest: VersionManifest, lock: NodeContractLock) => {
	const found = lockOf(manifest);
	return (['action', 'version', 'bundleHash', 'contractHash'] as const).find(
		(key) => found[key] !== lock[key],
	);
};

const assertLocked = (manifest: VersionManifest, lock: NodeContractLock) => {
	const field = mismatchOf(manifest, lock);
	if (field) {
		throw new UserError(
			`The bundle ${lock.bundleHash} has ${field} ${lockOf(manifest)[field]}, but the lock has ${lock[field]}`,
		);
	}
};

const bundleDigestOf = (bundleHash: string) => `sha256:${bundleHash}`;

// A registry lookup for each run is too slow, and a new patch may wait this long.
const INDEX_TTL_MS = 60_000;

// An execution waits for a missing bundle, so a dead registry must fail it soon.
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/** Versions that came from the store and not from the n8n release. */
const storedVersions = new WeakSet<FrozenVersion>();

/** A version with its bundle, read and checked. */
interface LoadedVersion {
	readonly manifest: VersionManifest;
	readonly bundle: string;
}

export function contractStore(options: ContractStoreOptions): ContractStore {
	const { registryUrl, publicKey, store } = options;
	const mayFetch = options.mayFetch ?? (() => true);
	const timeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
	const registryReader = registryUrl
		? storeReader(
				storeFilesOfUrl(
					registryUrl,
					async (url) => await options.fetch(url, { signal: AbortSignal.timeout(timeoutMs) }),
				),
			)
		: undefined;
	const indexes = new Map<string, { at: number; records: Promise<StoreRecord[]> }>();
	/** Stored versions by id, so a tolerant run does not read the store each time. */
	const storedById = new Map<string, { at: number; records: Promise<VersionManifest[]> }>();
	/** Loads in flight, so parallel executions download a version once. */
	const loading = new Map<string, Promise<LoadedVersion>>();
	/** Checked stored manifests and their digests by bundle hash. A stored version never changes. */
	const stored = new Map<string, { manifest: VersionManifest; digest: string }>();

	const registryOf = () => {
		if (!registryReader) throw new UserError('No registry is set');
		if (!mayFetch()) {
			throw new UserError(
				'The node contracts store does not have this version, and only the leader main fetches from the registry. Run "n8n contracts:sync" or "n8n contracts:import".',
			);
		}
		return registryReader;
	};

	const cachedFor = async <T>(
		cache: Map<string, { at: number; records: Promise<T[]> }>,
		id: string,
		read: () => Promise<T[]>,
	) => {
		const cached = cache.get(id);
		if (cached && Date.now() - cached.at < INDEX_TTL_MS) return await cached.records;
		const records = read();
		cache.set(id, { at: Date.now(), records });
		return await records.catch((error: unknown) => {
			cache.delete(id);
			throw error;
		});
	};

	const registryRecordsOf = async (id: string) =>
		await cachedFor(indexes, id, async () => await registryOf().records(id));

	/** Throws when a key is set and no signature of it covers the manifest bytes. */
	const assertSigned = (
		line: Pick<StoreRecord, 'id' | 'version' | 'manifest' | 'bundle' | 'signatures'>,
		text: string,
	) => {
		if (publicKey && !verifyStoreSignature(line, text, publicKey)) {
			const content = line.bundle ? `bundle ${line.bundle.slice('sha256:'.length)}` : line.manifest;
			throw new UserError(
				`${line.id}@${line.version} (${content}) is not signed by the trusted key`,
			);
		}
	};

	/** The manifest of a registry version with a bundle, signed by the trusted key when one is set. */
	const registryManifest = async (record: StoreRecord) => {
		const read = await registryOf().readManifest(record);
		if (!read) throw new UserError(`The registry has no manifest ${record.manifest}`);
		assertSigned(record, read.text);
		const { text, manifest } = read;
		if (!isVersionManifest(manifest)) {
			throw new UserError(`${record.id}@${record.version} has no bundle`);
		}
		return { text, manifest };
	};

	/** The manifest of a stored version, signed by the trusted key when one is set. */
	const storedManifestOf = (entry: StoredManifest) => {
		const manifest = parseManifest(entry.manifestText);
		assertSigned({ ...entry, bundle: bundleDigestOf(manifest.bundleHash) }, entry.manifestText);
		stored.set(manifest.bundleHash, { manifest, digest: entry.manifest });
		return manifest;
	};

	/**
	 * The checked stored versions with a bundle, of one id or of all ids. A credential, a native
	 * or a bad version is skipped.
	 */
	const storedManifests = async (id?: string) =>
		(await store.manifests(id)).flatMap((entry) => {
			if (entry.kind === 'credential') return [];
			try {
				return [storedManifestOf(entry)];
			} catch {
				return [];
			}
		});

	/** The stored credential manifests, signed by the trusted key when one is set. A bad one is skipped. */
	const storedCredentials = async () =>
		(await store.credentialManifests()).flatMap((entry) => {
			try {
				assertSigned(entry, entry.manifestText);
				return [parseCredentialManifest(entry.manifestText)];
			} catch {
				return [];
			}
		});

	/**
	 * The credential manifests that a version pins, from the registry, unless n8n bundles the
	 * name or the store has the major. A pin that the registry lacks stays: n8n may have a legacy
	 * type of that name. A manifest with a bad signature fails the download. Without a key,
	 * nothing comes: the lock anchors the bundle only, not a credential manifest.
	 */
	const pinnedCredentials = async (manifest: VersionManifest): Promise<StoredVersion[]> => {
		if (!publicKey) return [];
		const bundled = new Set(bundledCredentialsOf().map((entry) => entry.manifest.name));
		const have = await storedCredentials();
		const missing = (manifest.credentials ?? []).flatMap((pin) => {
			const [name = '', major = ''] = pin.split('@');
			const has = have.some(
				(credential) =>
					credential.name === name && parseSemver(credential.semver).major === Number(major),
			);
			return bundled.has(name) || has ? [] : [{ name, major: Number(major) }];
		});
		if (missing.length === 0) return [];
		const registry = registryOf();
		const catalog = await registry.catalog();
		const found = await Promise.all(
			missing.map(async ({ name, major }) => {
				const ids = catalog.flatMap((line) =>
					line.kind === 'credential' && line.name === name ? [line.id] : [],
				);
				const record = (await Promise.all(ids.map(async (id) => await registry.records(id))))
					.flat()
					.filter(({ version }) => parseSemver(version).major === major)
					.sort((a, b) => compareSemver(a.version, b.version))
					.at(-1);
				const read = record && (await registry.readManifest(record));
				if (!record || !read) return [];
				assertSigned(record, read.text);
				if (read.manifest.kind !== 'credential') {
					throw new UserError(`${record.id}@${record.version} is not a credential type`);
				}
				return [storedVersionOf(record, read.text)];
			}),
		);
		return found.flat();
	};

	/** The stored version of the lock, or `undefined` when the store does not have it. */
	const fromStore = async (lock: NodeContractLock): Promise<LoadedVersion | undefined> => {
		const entry = (await store.manifests(lock.action)).find(
			({ version }) => version === lock.version,
		);
		const manifest = entry && storedManifestOf(entry);
		if (!entry || manifest?.bundleHash !== lock.bundleHash) return undefined;
		const bundle = await store.bundle(entry.manifest);
		return bundle === undefined ? undefined : { manifest, bundle };
	};

	/** Copies a registry version into the store when its manifest matches `expected`. */
	const download = async (record: StoreRecord, expected: NodeContractLock) => {
		const checked = await registryManifest(record);
		assertLocked(checked.manifest, expected);
		const bundle = await registryOf().blob(bundleDigestOf(expected.bundleHash));
		if (!bundle) throw new UserError(`The registry has no bundle ${expected.bundleHash}`);
		const code = bundle.toString('utf8');
		await admitVersions(store, [
			...(await pinnedCredentials(checked.manifest)),
			storedVersionOf(record, checked.text, { bundle: code }),
		]);
		storedById.delete(record.id);
		stored.set(checked.manifest.bundleHash, {
			manifest: checked.manifest,
			digest: record.manifest,
		});
		return { manifest: checked.manifest, bundle: code };
	};

	const fromRegistry = async (lock: NodeContractLock) => {
		const record = (await registryRecordsOf(lock.action)).find(
			({ bundle }) => bundle === bundleDigestOf(lock.bundleHash),
		);
		if (!record) throw new UserError('The registry does not have this bundle');
		return await download(record, lock);
	};

	/** A checked version from the store, or else from the registry. */
	const load = async (lock: NodeContractLock) => {
		const known = loading.get(lock.bundleHash);
		if (known) return await known;
		const loaded = fromStore(lock)
			.then(async (stored) => stored ?? (await fromRegistry(lock)))
			.then((version) => {
				assertLocked(version.manifest, lock);
				return version;
			})
			.catch((error: unknown) => {
				const { action, version, bundleHash } = lock;
				throw new UserError(
					`Cannot get ${action}@${version} (bundle ${bundleHash}) from the registry ${registryUrl || '(none set)'}: ${errorMessage(error)}`,
					{ cause: error },
				);
			})
			.finally(() => loading.delete(lock.bundleHash));
		loading.set(lock.bundleHash, loaded);
		return await loaded;
	};

	/** The bundle loads on the first execution. */
	const storedVersion = (manifest: VersionManifest): FrozenVersion => {
		const version = {
			manifest,
			readBundle: async () => (await load(lockOf(manifest))).bundle,
		};
		storedVersions.add(version);
		return version;
	};

	const isNewerPatch = (
		lock: NodeContractLock,
		candidate: Pick<StoreRecord, 'version' | 'nodeContract' | 'contractHash'>,
	) => {
		const locked = parseSemver(lock.version);
		const { major, minor, patch } = parseSemver(candidate.version);
		return (
			major === locked.major &&
			minor === locked.minor &&
			patch > locked.patch &&
			runsNodeContract(candidate.nodeContract) &&
			candidate.contractHash === lock.contractHash
		);
	};

	/** On a host that does not fetch: the signed patches in the store. */
	const storedPatches = async (lock: NodeContractLock) => {
		const stored = await cachedFor(
			storedById,
			lock.action,
			async () => await storedManifests(lock.action),
		).catch(() => []);
		return stored
			.filter((manifest) => isNewerPatch(lock, { ...manifest, version: manifest.semver }))
			.map(storedVersion);
	};

	return {
		registryUrl,

		async bundleHashes() {
			return new Set((await storedManifests()).map(({ bundleHash }) => bundleHash));
		},

		async locked(lock) {
			const known = stored.get(lock.bundleHash);
			if (known && !mismatchOf(known.manifest, lock) && (await store.has(known.digest))) {
				return storedVersion(known.manifest);
			}
			return storedVersion((await load(lock)).manifest);
		},

		async versions() {
			const newest = (await storedManifests()).reduce((byMajor, manifest) => {
				const key = `${manifest.id}@${manifest.contract.version}`;
				const best = byMajor.get(key);
				return best && compareSemver(best.semver, manifest.semver) >= 0
					? byMajor
					: new Map(byMajor).set(key, manifest);
			}, new Map<string, VersionManifest>());
			return [...newest.values()].reduce(
				(byAction, manifest) =>
					byAction.set(manifest.id, [
						...(byAction.get(manifest.id) ?? []),
						storedVersion(manifest),
					]),
				new Map<string, FrozenVersion[]>(),
			);
		},

		async newerPatches(lock) {
			if (!publicKey) return [];
			if (!registryReader || !mayFetch()) return await storedPatches(lock);
			const records = await registryRecordsOf(lock.action).catch(() => []);
			const candidates = records.filter((record) => isNewerPatch(lock, record));
			const patches = await Promise.all(
				candidates.map(async (record) => {
					if (!record.bundle) return [];
					const bundleHash = record.bundle.slice('sha256:'.length);
					const expected = { ...lock, version: record.version, bundleHash };
					const known = stored.get(bundleHash)?.manifest;
					if (known && !mismatchOf(known, expected)) return [storedVersion(known)];
					// A tampered or unsigned patch never runs; the locked version runs instead.
					const version =
						(await fromStore(expected).catch(() => undefined)) ??
						(await download(record, expected).catch(() => undefined));
					return version && !mismatchOf(version.manifest, expected)
						? [storedVersion(version.manifest)]
						: [];
				}),
			);
			return patches.flat();
		},

		async credentials() {
			return (await storedCredentials()).reduce((byName, manifest) => {
				const best = byName.get(manifest.name);
				return best && compareSemver(best.semver, manifest.semver) >= 0
					? byName
					: new Map(byName).set(manifest.name, manifest);
			}, new Map<string, CredentialManifest>());
		},
	};
}

/**
 * Resolves the version a contract node runs from its lock in `meta.nodeContracts`. A locked
 * bundle hash is the trust anchor for the locked version. The publisher signature is the
 * trust anchor for a newer patch. A node without a lock runs `head`: the bundled HEAD, or the
 * newest stored version of an older major.
 */
export function contractVersionLoader(options: ContractRegistryOptions): ContractVersionLoader {
	const { store } = options;
	return async (context, head) => {
		const meta = await options.metaOf(context);
		const lock = locksOf(meta).find(([node]) => node === context.getNode().name)?.[1];
		// A lock of another action or major is stale: the node changed after the build.
		if (
			lock?.action !== head.manifest.id ||
			parseSemver(lock.version).major !== head.manifest.contract.version
		) {
			return head;
		}
		const override = isRecord(meta) ? meta.nodeContractsPolicy : undefined;
		const policy = isPolicy(override) ? override : options.policy;
		const newer = policy === 'tolerant' ? await store.newerPatches(lock) : [];
		const locked =
			head.manifest.bundleHash === lock.bundleHash
				? head
				: await store
						.locked(lock)
						.catch((error: unknown) =>
							error instanceof Error ? error : new UserError(String(error)),
						);
		// The bundled HEAD may be a newer patch of the locked contract. A stored version may
		// not: without a signature check, only its lock makes it trusted.
		const trusted = [
			...(storedVersions.has(head) ? [] : [head]),
			...(locked instanceof Error ? [] : [locked]),
			...newer,
		];
		const manifests = trusted.map((version) => version.manifest);
		const manifest = (() => {
			try {
				return resolveContractVersion(lock, policy, manifests);
			} catch (error) {
				// The fetch error names the registry, so it explains more than "no match".
				throw locked instanceof Error ? locked : error;
			}
		})();
		return trusted.find((version) => version.manifest === manifest) ?? head;
	};
}

const bundledVersionsOf = (actionId: string) => {
	try {
		return versionsOf(actionId);
	} catch {
		// Not an action of this package, or a build without frozen versions.
		return [];
	}
};

const bundledHead = (actionId: string) => bundledVersionsOf(actionId)[0];

/** n8n builds and ships a bundled version with this package, so it may run in this process. */
const isBundled = (manifest: VersionManifest) =>
	bundledVersionsOf(manifest.id).some(
		(version) => version.manifest.bundleHash === manifest.bundleHash,
	);

/**
 * The credential manifest of a name: the bundled one, which n8n registers and signs with, else
 * the newest one in the store, unless another package has a type of that name.
 */
export function credentialManifestsOf(
	store: Pick<ContractStore, 'credentials'>,
	hasOtherCredentialType: (name: string) => boolean = () => false,
) {
	const bundled = new Map(bundledCredentialsOf().map(({ manifest }) => [manifest.name, manifest]));
	return async (name: string) =>
		bundled.get(name) ??
		(hasOtherCredentialType(name) ? undefined : (await store.credentials()).get(name));
}

/**
 * Sets the Node Contract range, the version loader, the credential manifests, the sandbox, the
 * run profile listener and the input hosts of this package's node-sdk, which its nodes run with. With a sandbox, it also
 * starts to compile the sandbox guests and does not wait for the result.
 */
export const useContractRegistry = (options: ContractRegistryOptions) => {
	setNodeContractRange(options.nodeContractRange);
	setContractVersionLoader(contractVersionLoader(options));
	setCredentialManifests(credentialManifestsOf(options.store, options.hasOtherCredentialType));
	setRunProfileListener(options.onRunProfile);
	setEgressInputHosts(options.egressInputHosts ?? []);
	if (options.sandbox) {
		const { scope } = options.sandbox;
		setExecutorLoader(
			sandboxExecutorLoader(options.sandbox.options, scope === 'all' ? () => false : isBundled),
		);
		// Without the warm-up, the first sandboxed run compiles the guest, so a failure only costs time.
		void warmSandbox(options.sandbox.options).catch((error: unknown) =>
			LoggerProxy.debug(`The sandbox guests did not compile at start: ${errorMessage(error)}`),
		);
	}
};

/** A workflow node and its lock. */
export interface LockedNode {
	readonly workflowId: string;
	readonly workflowName: string;
	readonly node: string;
	readonly lock: NodeContractLock;
}

export interface ContractSyncResult {
	/** Versions the store did not have before. */
	readonly added: readonly VersionManifest[];
	readonly failed: ReadonlyArray<LockedNode & { readonly error: string }>;
	/** Nodes whose locked bundle declares a Node Contract version that this host does not run. */
	readonly unsupported: ReadonlyArray<LockedNode & { readonly nodeContract: NodeContractVersion }>;
}

/**
 * Puts the locked bundle of each node into the store, one bundle at a time, and checks its
 * Node Contract version. It never throws for one bundle: it reports the failure.
 */
export async function syncContractStore(
	store: ContractStore,
	nodes: readonly LockedNode[],
): Promise<ContractSyncResult> {
	const before = await store.bundleHashes();
	const byBundle = nodes.reduce(
		(groups, node) =>
			groups.set(node.lock.bundleHash, [...(groups.get(node.lock.bundleHash) ?? []), node]),
		new Map<string, readonly LockedNode[]>(),
	);
	const heads = new Map(
		[...new Set(nodes.map(({ lock }) => lock.action))].map((id) => [id, bundledHead(id)] as const),
	);
	const syncBundle = async (lock: NodeContractLock, group: readonly LockedNode[]) => {
		const head = heads.get(lock.action);
		if (head?.manifest.bundleHash === lock.bundleHash) return { manifest: head.manifest, group };
		const manifest = await store.locked(lock).then(
			({ manifest: locked }) => locked,
			(error: unknown) => errorMessage(error),
		);
		return { manifest, group };
	};
	const results = await [...byBundle.values()].reduce<
		Promise<ReadonlyArray<Awaited<ReturnType<typeof syncBundle>>>>
	>(async (previous, group) => {
		const done = await previous;
		const [first] = group;
		return first ? [...done, await syncBundle(first.lock, group)] : done;
	}, Promise.resolve([]));
	return {
		added: results.flatMap(({ manifest }) =>
			typeof manifest === 'string' ||
			before.has(manifest.bundleHash) ||
			heads.get(manifest.id)?.manifest.bundleHash === manifest.bundleHash
				? []
				: [manifest],
		),
		failed: results.flatMap(({ manifest, group }) =>
			typeof manifest === 'string' ? group.map((node) => ({ ...node, error: manifest })) : [],
		),
		unsupported: results.flatMap(({ manifest, group }) =>
			typeof manifest === 'string' || runsNodeContract(manifest.nodeContract)
				? []
				: group.map((node) => ({ ...node, nodeContract: manifest.nodeContract })),
		),
	};
}

/** A version of a store, after its blobs, its index line and, with a key, its signature are checked. */
async function verifiedVersionOf(
	source: StoreReader,
	record: StoreRecord,
	publicKey: string | undefined,
): Promise<StoredVersion> {
	const at = `${record.id}@${record.version}`;
	const read = await source.readManifest(record);
	if (!read) throw new UserError(`The store has no manifest of ${at}`);
	if (publicKey && !verifyStoreSignature(record, read.text, publicKey)) {
		throw new UserError(`${at} is not signed by the trusted key`);
	}
	const textOf = async (digest: string | undefined) => {
		if (digest === undefined) return undefined;
		const bytes = await source.blob(digest);
		if (!bytes) throw new UserError(`The store has no blob ${digest} of ${at}`);
		return bytes.toString('utf8');
	};
	return storedVersionOf(record, read.text, {
		bundle: await textOf(record.bundle),
		fixtures: await textOf(record.fixtures),
	});
}

/**
 * Puts each version of a store, e.g. an export or a registry folder, into the instance store.
 * It first checks every version: the digest of each blob, the index line against its manifest,
 * and the signature when a key is set. When one check fails, it adds nothing.
 */
export async function importContractStore(
	source: StoreReader,
	store: InstanceStore,
	publicKey: string | undefined,
): Promise<StoredVersion[]> {
	const ids = [...new Set((await source.catalog()).map(({ id }) => id))];
	const records = (await Promise.all(ids.map(async (id) => await source.records(id)))).flat();
	const versions = await Promise.all(
		records.map(async (record) => await verifiedVersionOf(source, record, publicKey)),
	);
	return await admitVersions(store, versions);
}

/** The `<name>@<major>` pins of the credentials that a stored version uses. */
const credentialPinsOf = ({ kind, bundle, manifestText }: StoredVersion) => {
	if (kind === 'credential') return [];
	const manifest =
		bundle === undefined ? parseNativeManifest(manifestText) : parseManifest(manifestText);
	return manifest.credentials ?? [];
};

const credentialPinOf = ({ manifestText }: StoredVersion) => {
	const { name, semver } = parseCredentialManifest(manifestText);
	return `${name}@${parseSemver(semver).major}`;
};

/**
 * Writes the stored versions that `include` accepts to `dir`, in the store layout, with the
 * stored credential manifests that they pin. The index of each id lists its versions in semver
 * order, so the same rows give the same bytes.
 */
export async function exportContractStore(
	store: InstanceStore,
	dir: string,
	include: (version: StoredVersion) => boolean = () => true,
): Promise<StoreRecord[]> {
	const all = await store.versions();
	const included = all.filter(include);
	const pins = new Set(included.flatMap(credentialPinsOf));
	const pinned = all.filter(
		(version) =>
			version.kind === 'credential' &&
			!included.includes(version) &&
			pins.has(credentialPinOf(version)),
	);
	const versions = [...included, ...pinned].sort(
		(a, b) => a.id.localeCompare(b.id) || compareSemver(a.version, b.version),
	);
	return await addToStore(dir, versions);
}
