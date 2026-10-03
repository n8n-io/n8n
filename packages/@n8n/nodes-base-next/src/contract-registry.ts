import {
	runsNodeContract,
	setContractVersionLoader,
	setCredentialManifests,
	setEgressInputHosts,
	setExecutorLoader,
	setMaxResponseBytes,
	setNodeContractRange,
	setRunProfileListener,
	type ContractOrigin,
	type ContractVersionLoader,
	type FrozenVersion,
	type PayloadCapture,
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
	 * The keys that prove the origin of a version. With one of them, the store takes and serves
	 * only versions that a key of them signs. Without both, the store takes unsigned versions as
	 * `private`, and no patch newer than the lock applies.
	 */
	readonly keys: ContractKeys;
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
	 * Runs bundles in the WASM sandbox. `stored`: every version that is not first-party. `all`:
	 * every version. Without it, every bundle runs in this process.
	 */
	readonly sandbox?: { readonly options: SandboxOptions; readonly scope: 'stored' | 'all' };
	/** Gets the run profile of each node execution, e.g. for traces. Without it, nothing is recorded. */
	readonly onRunProfile?: RunProfileListener;
	/**
	 * Also records the input, the output and the HTTP bodies of each run in the profile. For
	 * development only. Without it, the profile has no payload.
	 */
	readonly tracePayloads?: PayloadCapture;
	/** The host patterns that a URL from input may reach, in-process and in the sandbox. Empty: no limit. */
	readonly egressInputHosts?: readonly string[];
	/**
	 * The most bytes of one HTTP response body, in-process and in the sandbox. `Infinity` is no
	 * limit. Absent: the node-sdk default, 100 MiB.
	 */
	readonly maxResponseBytes?: number;
	/**
	 * Whether another package of n8n has a credential type of this name, e.g. a legacy class. That
	 * type signs, so a stored credential manifest of the name does not apply.
	 */
	readonly hasOtherCredentialType?: (name: string) => boolean;
}

/** PEM of the public keys that prove the origin of a version. */
export interface ContractKeys {
	/** The first-party key of n8n. A version that it signs is `first-party`. */
	readonly firstParty: string | undefined;
	/** The vetting key of n8n. A version that it signs, and the first-party key does not, is `community`. */
	readonly vetting: string | undefined;
}

const hasKey = ({ firstParty, vetting }: ContractKeys) => Boolean(firstParty) || Boolean(vetting);

/**
 * The origin of a version from the keys that sign its manifest bytes. An id has no namespace
 * part, so only the first-party key puts a version in the `n8n` namespace. An id such as
 * `n8n.echo` proves nothing.
 */
export function originOf(
	line: Pick<StoreRecord, 'signatures'>,
	manifestText: string,
	{ firstParty, vetting }: ContractKeys,
): ContractOrigin {
	if (firstParty && verifyStoreSignature(line, manifestText, firstParty)) return 'first-party';
	if (vetting && verifyStoreSignature(line, manifestText, vetting)) return 'community';
	return 'private';
}

/**
 * The store of action versions that n8n does not bundle. Each version is checked before the
 * store takes it: the digests of its blobs, the manifest against the lock, and the publisher
 * signature when a key is set. The store records the origin of each version when it takes it.
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

/**
 * A version in the store of an instance: its bytes, the index line fields that identify it, and
 * the origin that the store recorded when it took the version.
 */
export type StoredVersion = StoreVersion &
	Pick<StoreRecord, 'id' | 'version' | 'kind' | 'manifest'> & {
		readonly origin: ContractOrigin;
	};

/** A stored version without its bundle and fixtures. */
export type StoredManifest = Pick<
	StoredVersion,
	'id' | 'version' | 'kind' | 'manifest' | 'manifestText' | 'signatures' | 'origin'
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

/** A version of a store line, its bytes and its origin. */
const storedVersionOf = (
	{ id, version, kind, manifest, signatures, published }: StoreRecord,
	manifestText: string,
	origin: ContractOrigin,
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
	origin,
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

/** A checked version and its origin. */
type CheckedVersion = Pick<FrozenVersion, 'manifest' | 'origin'>;

/** A version with its bundle, read and checked. */
interface LoadedVersion extends CheckedVersion {
	readonly bundle: string;
}

export function contractStore(options: ContractStoreOptions): ContractStore {
	const { registryUrl, keys, store } = options;
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
	const storedById = new Map<string, { at: number; records: Promise<CheckedVersion[]> }>();
	/** Loads in flight, so parallel executions download a version once. */
	const loading = new Map<string, Promise<LoadedVersion>>();
	/** Checked stored versions and their digests by bundle hash. A stored version never changes. */
	const stored = new Map<string, CheckedVersion & { digest: string }>();

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

	/** The origin of a version. Throws when a key is set and no key of them signs the manifest bytes. */
	const signedOriginOf = (
		line: Pick<StoreRecord, 'id' | 'version' | 'manifest' | 'bundle' | 'signatures'>,
		text: string,
	) => {
		const origin = originOf(line, text, keys);
		if (origin === 'private' && hasKey(keys)) {
			const content = line.bundle ? `bundle ${line.bundle.slice('sha256:'.length)}` : line.manifest;
			throw new UserError(`${line.id}@${line.version} (${content}) is not signed by a trusted key`);
		}
		return origin;
	};

	/** A registry version with a bundle, signed by a trusted key when one is set, and its origin. */
	const registryManifest = async (record: StoreRecord) => {
		const read = await registryOf().readManifest(record);
		if (!read) throw new UserError(`The registry has no manifest ${record.manifest}`);
		const origin = signedOriginOf(record, read.text);
		const { text, manifest } = read;
		if (!isVersionManifest(manifest)) {
			throw new UserError(`${record.id}@${record.version} has no bundle`);
		}
		return { text, manifest, origin };
	};

	/**
	 * A stored version, signed by a trusted key when one is set. The origin is the one that the
	 * store recorded when it took the version. A key change never raises it, but a `first-party`
	 * version that the first-party key no longer proves gets the origin that the keys prove now.
	 */
	const storedManifestOf = (entry: StoredManifest): CheckedVersion => {
		const manifest = parseManifest(entry.manifestText);
		const origin = signedOriginOf(
			{ ...entry, bundle: bundleDigestOf(manifest.bundleHash) },
			entry.manifestText,
		);
		const checked = { manifest, origin: entry.origin === 'first-party' ? origin : entry.origin };
		stored.set(manifest.bundleHash, { ...checked, digest: entry.manifest });
		return checked;
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

	/** The stored credential manifests, signed by a trusted key when one is set. A bad one is skipped. */
	const storedCredentials = async () =>
		(await store.credentialManifests()).flatMap((entry) => {
			try {
				signedOriginOf(entry, entry.manifestText);
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
		if (!hasKey(keys)) return [];
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
				const origin = signedOriginOf(record, read.text);
				if (read.manifest.kind !== 'credential') {
					throw new UserError(`${record.id}@${record.version} is not a credential type`);
				}
				return [storedVersionOf(record, read.text, origin)];
			}),
		);
		return found.flat();
	};

	/** The stored version of the lock, or `undefined` when the store does not have it. */
	const fromStore = async (lock: NodeContractLock): Promise<LoadedVersion | undefined> => {
		const entry = (await store.manifests(lock.action)).find(
			({ version }) => version === lock.version,
		);
		const checked = entry && storedManifestOf(entry);
		if (!entry || checked?.manifest.bundleHash !== lock.bundleHash) return undefined;
		const bundle = await store.bundle(entry.manifest);
		return bundle === undefined ? undefined : { ...checked, bundle };
	};

	/** Copies a registry version into the store when its manifest matches `expected`. */
	const download = async (record: StoreRecord, expected: NodeContractLock) => {
		const checked = await registryManifest(record);
		assertLocked(checked.manifest, expected);
		const bundle = await registryOf().blob(bundleDigestOf(expected.bundleHash));
		if (!bundle) throw new UserError(`The registry has no bundle ${expected.bundleHash}`);
		const code = bundle.toString('utf8');
		const { manifest, origin } = checked;
		await admitVersions(store, [
			...(await pinnedCredentials(manifest)),
			storedVersionOf(record, checked.text, origin, { bundle: code }),
		]);
		storedById.delete(record.id);
		stored.set(manifest.bundleHash, { manifest, origin, digest: record.manifest });
		return { manifest, origin, bundle: code };
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
	const storedVersion = ({ manifest, origin }: CheckedVersion): FrozenVersion => ({
		manifest,
		origin,
		readBundle: async () => (await load(lockOf(manifest))).bundle,
	});

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
			.filter(({ manifest }) => isNewerPatch(lock, { ...manifest, version: manifest.semver }))
			.map(storedVersion);
	};

	return {
		registryUrl,

		async bundleHashes() {
			return new Set((await storedManifests()).map(({ manifest }) => manifest.bundleHash));
		},

		async locked(lock) {
			const known = stored.get(lock.bundleHash);
			if (known && !mismatchOf(known.manifest, lock) && (await store.has(known.digest))) {
				return storedVersion(known);
			}
			return storedVersion(await load(lock));
		},

		async versions() {
			const newest = (await storedManifests()).reduce((byMajor, checked) => {
				const { id, contract, semver } = checked.manifest;
				const key = `${id}@${contract.version}`;
				const best = byMajor.get(key);
				return best && compareSemver(best.manifest.semver, semver) >= 0
					? byMajor
					: new Map(byMajor).set(key, checked);
			}, new Map<string, CheckedVersion>());
			return [...newest.values()].reduce(
				(byAction, checked) =>
					byAction.set(checked.manifest.id, [
						...(byAction.get(checked.manifest.id) ?? []),
						storedVersion(checked),
					]),
				new Map<string, FrozenVersion[]>(),
			);
		},

		async newerPatches(lock) {
			if (!hasKey(keys)) return [];
			if (!registryReader || !mayFetch()) return await storedPatches(lock);
			const records = await registryRecordsOf(lock.action).catch(() => []);
			const candidates = records.filter((record) => isNewerPatch(lock, record));
			const patches = await Promise.all(
				candidates.map(async (record) => {
					if (!record.bundle) return [];
					const bundleHash = record.bundle.slice('sha256:'.length);
					const expected = { ...lock, version: record.version, bundleHash };
					const known = stored.get(bundleHash);
					if (known && !mismatchOf(known.manifest, expected)) return [storedVersion(known)];
					// A tampered or unsigned patch never runs; the locked version runs instead.
					const version =
						(await fromStore(expected).catch(() => undefined)) ??
						(await download(record, expected).catch(() => undefined));
					return version && !mismatchOf(version.manifest, expected) ? [storedVersion(version)] : [];
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
		// A first-party HEAD may be a newer patch of the locked contract, as a release ships it.
		// Another HEAD may not: only its lock makes it trusted. A signed patch must have the origin
		// of the locked version, so that a vetting key cannot patch a first-party version. When the
		// locked version does not load, its origin is not known, so only a first-party patch applies.
		const origin = locked instanceof Error ? 'first-party' : locked.origin;
		const trusted = [
			...(head.origin === 'first-party' ? [head] : []),
			...(locked instanceof Error ? [] : [locked]),
			...newer.filter((version) => version.origin === origin),
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

/** Only n8n vouches for a first-party version, so only it may run in this process. */
const isFirstParty = ({ origin }: FrozenVersion) => origin === 'first-party';

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
 * run profile listener, the input hosts and the response limit of this package's node-sdk, which
 * its nodes run with. With a sandbox, it also starts to compile the sandbox guests and does not
 * wait for the result.
 */
export const useContractRegistry = (options: ContractRegistryOptions) => {
	setNodeContractRange(options.nodeContractRange);
	setContractVersionLoader(contractVersionLoader(options));
	setCredentialManifests(credentialManifestsOf(options.store, options.hasOtherCredentialType));
	setRunProfileListener(options.onRunProfile, options.tracePayloads);
	setEgressInputHosts(options.egressInputHosts ?? []);
	setMaxResponseBytes(options.maxResponseBytes);
	if (options.sandbox) {
		const { scope } = options.sandbox;
		setExecutorLoader(
			sandboxExecutorLoader(options.sandbox.options, scope === 'all' ? () => false : isFirstParty),
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

/**
 * A version of a store and its origin, after its blobs, its index line and, with a key, its
 * signature are checked.
 */
async function verifiedVersionOf(
	source: StoreReader,
	record: StoreRecord,
	keys: ContractKeys,
): Promise<StoredVersion> {
	const at = `${record.id}@${record.version}`;
	const read = await source.readManifest(record);
	if (!read) throw new UserError(`The store has no manifest of ${at}`);
	const origin = originOf(record, read.text, keys);
	if (origin === 'private' && hasKey(keys)) {
		throw new UserError(`${at} is not signed by a trusted key`);
	}
	const textOf = async (digest: string | undefined) => {
		if (digest === undefined) return undefined;
		const bytes = await source.blob(digest);
		if (!bytes) throw new UserError(`The store has no blob ${digest} of ${at}`);
		return bytes.toString('utf8');
	};
	return storedVersionOf(record, read.text, origin, {
		bundle: await textOf(record.bundle),
		fixtures: await textOf(record.fixtures),
	});
}

/**
 * Puts each version of a store, e.g. an export or a registry folder, into the instance store
 * with its origin. It first checks every version: the digest of each blob, the index line
 * against its manifest, and the signature when a key is set. When one check fails, it adds
 * nothing.
 */
export async function importContractStore(
	source: StoreReader,
	store: InstanceStore,
	keys: ContractKeys,
): Promise<StoredVersion[]> {
	const ids = [...new Set((await source.catalog()).map(({ id }) => id))];
	const records = (await Promise.all(ids.map(async (id) => await source.records(id)))).flat();
	const versions = await Promise.all(
		records.map(async (record) => await verifiedVersionOf(source, record, keys)),
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
