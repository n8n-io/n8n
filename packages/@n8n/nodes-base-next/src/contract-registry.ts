import {
	permissionsOf,
	runsNodeContract,
	setContractVersionLoader,
	setCredentialManifests,
	setEgressInputHosts,
	setExecutorLoader,
	setMaxResponseBytes,
	setNodeContractRange,
	setPermissionRefusalListener,
	setRunProfileListener,
	type ContractOrigin,
	type ContractPermissions,
	type ContractVersionLoader,
	type FrozenVersion,
	type PayloadCapture,
	type PermissionRefusalListener,
	type RunProfileListener,
} from '@n8n/node-sdk/host';
import {
	addStatusToStore,
	addedPermissionsOf,
	addToStore,
	canonicalJson,
	compareSemver,
	isVersionManifest,
	parseCredentialManifest,
	parseManifest,
	parseNativeManifest,
	parseSemver,
	resolveContractVersion,
	storeFilesOfUrl,
	storeReader,
	storeStatusTextOf,
	verifyStoreSignature,
	withdrawalOf,
	type CredentialManifest,
	type NodeContractLock,
	type NodeContractsPolicy,
	type NodeContractVersion,
	type StoreIndex,
	type StoreReader,
	type StoreRecord,
	type StoreRevoke,
	type StoreStatusRecord,
	type StoreVersion,
	type StoreYank,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
import { sandboxExecutorLoader, warmSandbox, type SandboxOptions } from '@n8n/node-sdk/sandbox';
import {
	LoggerProxy,
	UserError,
	type IExecuteFunctions,
	type INode,
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
	/** Gets each request or bundle that a permission refuses, e.g. for the audit log. */
	readonly onPermissionRefused?: PermissionRefusalListener;
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
	/**
	 * `<id>@<version>` of each revoked version that may still run, e.g. `gmail.message.get@1.0.4`.
	 * An admin sets it. Without it, a revoked version does not run.
	 */
	readonly revokedAllowed?: readonly string[];
	/**
	 * The permission classes of `N8N_NODE_PERMISSIONS_DENY`, e.g. `code`. A version that has one
	 * of them does not run. Without it, no class is denied.
	 */
	readonly permissionsDeny?: readonly string[];
}

/**
 * A class of `N8N_NODE_PERMISSIONS_DENY` that a contract version can have. `egress-input`: a
 * host from input. `code`: the code import. No contract version has `files` or `full-community`.
 */
export type ContractPermissionClass = 'egress-input' | 'code';

/** The `N8N_NODE_PERMISSIONS_DENY` classes of the permissions of a contract, e.g. for the security audit. */
export const permissionClassesOf = ({
	egress,
	imports,
}: Pick<ContractPermissions, 'egress' | 'imports'>): readonly ContractPermissionClass[] => [
	...(egress.fromInput === undefined ? [] : ['egress-input' as const]),
	...(imports.includes('code') ? ['code' as const] : []),
];

/** The first class of the contract of a version that `deny` has, e.g. to refuse it at load and at run time. */
export const deniedPermissionClassOf = ({ manifest }: FrozenVersion, deny: readonly string[]) =>
	permissionClassesOf(permissionsOf(manifest.contract)).find((name) => deny.includes(name));

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

const ORIGIN_RANK: Record<ContractOrigin, number> = { private: 0, community: 1, 'first-party': 2 };

/**
 * Whether a status line applies to a version of `origin`: its signer must prove at least that
 * origin. So only the first-party key withdraws a first-party version, and an unsigned line
 * applies only to a private version.
 */
const appliesTo = (status: StoreStatusRecord, origin: ContractOrigin, keys: ContractKeys) =>
	ORIGIN_RANK[originOf(status, storeStatusTextOf(status), keys)] >= ORIGIN_RANK[origin];

/**
 * Inserts the status lines that the store may take and does not have, and returns them. With a
 * key, a line needs the signature of a key of them. Without a key, every line goes in.
 */
async function admitStatuses(
	store: InstanceStore,
	statuses: readonly StoreStatusRecord[],
	keys: ContractKeys,
): Promise<StoreStatusRecord[]> {
	const ids = [...new Set(statuses.map(({ id }) => id))];
	const stored = new Set(
		(await Promise.all(ids.map(async (id) => await store.statuses(id)))).flat().map(canonicalJson),
	);
	const lines = statuses.map(canonicalJson);
	const added = statuses.filter(
		(status, index) =>
			!stored.has(lines[index] ?? '') &&
			lines.indexOf(lines[index] ?? '') === index &&
			(!hasKey(keys) || originOf(status, storeStatusTextOf(status), keys) !== 'private'),
	);
	if (added.length > 0) await store.insertStatuses(added);
	return added;
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
	/**
	 * The stored yank or revoke line of a version that a trusted key signs, or `undefined`. A
	 * line applies only when its signer proves at least the origin of the version.
	 */
	withdrawal(
		version: Pick<FrozenVersion, 'manifest' | 'origin'>,
	): Promise<StoreYank | StoreRevoke | undefined>;
	/**
	 * Puts the trusted status lines of the registry index of each id into the store. It reads an
	 * index again only when it read it before `since` (ms since the epoch).
	 */
	syncStatuses(ids: readonly string[], since: number): Promise<void>;
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
	/** The stored status lines of one id, or of every id. */
	statuses(id?: string): Promise<readonly StoreStatusRecord[]>;
	/** Inserts status lines. It skips each line that it has. */
	insertStatuses(statuses: readonly StoreStatusRecord[]): Promise<void>;
	/** Gets the versions of each insert that bring a new major, e.g. for the audit log. */
	installed?(installs: readonly ContractInstall[]): void;
}

/** A version that brings a major that n8n did not have, and the permissions that the major adds. */
export interface ContractInstall {
	/** The action, trigger or provider id, e.g. `httpRequest.get`. */
	readonly id: string;
	/** The first version of the new major in the insert, e.g. `2.0.0`. */
	readonly version: string;
	/** The newest version of a lower major, e.g. `1.4.0`. Absent when no lower major is known. */
	readonly previousVersion?: string;
	/** Who vouches for the version. */
	readonly origin: ContractOrigin;
	/**
	 * The permissions that the version has and the previous version does not, as
	 * `addedPermissionsOf` names them, e.g. `egress api.example.com`. Without a previous version,
	 * every permission.
	 */
	readonly addedPermissions: readonly string[];
}

/** The manifest of a stored version with a bundle. A native or a bad version gives none. */
const versionManifestOf = ({ kind, manifestText }: StoredManifest) => {
	if (kind === 'credential') return [];
	try {
		return [parseManifest(manifestText)];
	} catch {
		return [];
	}
};

/**
 * The versions of `added` that bring a new major: no version of `stored` and no bundled version
 * has it. Each one with the permissions that it adds to the newest version of a lower major.
 */
function installsOf(
	stored: readonly StoredManifest[],
	added: readonly StoredVersion[],
): ContractInstall[] {
	const fresh = added
		.flatMap((version) => versionManifestOf(version).map((manifest) => ({ ...version, manifest })))
		.sort((a, b) => compareSemver(a.manifest.semver, b.manifest.semver));
	const known = [
		...stored.flatMap(versionManifestOf),
		...[...new Set(fresh.map(({ id }) => id))].flatMap((id) =>
			bundledVersionsOf(id).map(({ manifest }) => manifest),
		),
	];
	const all = [...known, ...fresh.map(({ manifest }) => manifest)];
	const majorOf = (manifest: VersionManifest) => manifest.contract.version;
	return fresh.flatMap(({ id, manifest, origin }, index) => {
		const sameMajor = (other: VersionManifest) =>
			other.id === id && majorOf(other) === majorOf(manifest);
		const isFirst = fresh.findIndex((other) => sameMajor(other.manifest)) === index;
		if (!isFirst || known.some(sameMajor)) return [];
		const previous = all
			.filter((other) => other.id === id && majorOf(other) < majorOf(manifest))
			.sort((a, b) => compareSemver(a.semver, b.semver))
			.at(-1);
		return [
			{
				id,
				version: manifest.semver,
				...(previous ? { previousVersion: previous.semver } : {}),
				origin,
				addedPermissions: addedPermissionsOf(previous?.contract, manifest.contract),
			},
		];
	});
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
	if (added.length === 0) return added;
	await store.insert(added);
	const installs = installsOf(stored, added);
	try {
		if (installs.length > 0) store.installed?.(installs);
	} catch (error) {
		// The rows are in the store: a failed report must not fail the admission.
		LoggerProxy.warn(`The contract installs were not reported: ${errorMessage(error)}`);
	}
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
	const indexes = new Map<string, { at: number; records: Promise<StoreIndex> }>();
	/** Stored versions by id, so a tolerant run does not read the store each time. */
	const storedById = new Map<string, { at: number; records: Promise<CheckedVersion[]> }>();
	/** Stored status lines by id, so a run does not read the store each time. */
	const statusesById = new Map<
		string,
		{ at: number; records: Promise<readonly StoreStatusRecord[]> }
	>();
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
		cache: Map<string, { at: number; records: Promise<T> }>,
		id: string,
		read: () => Promise<T>,
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

	/** The registry index of an id. Each new read puts its trusted status lines into the store. */
	const registryIndexOf = async (id: string) =>
		await cachedFor(indexes, id, async () => {
			const index = await registryOf().index(id);
			const added = await admitStatuses(store, index.statuses, keys);
			if (added.length > 0) statusesById.delete(id);
			return index;
		});

	const registryRecordsOf = async (id: string) => (await registryIndexOf(id)).versions;

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

	const withdrawal = async ({ manifest, origin }: CheckedVersion) => {
		const statuses = await cachedFor(
			statusesById,
			manifest.id,
			async () => await store.statuses(manifest.id),
		);
		return withdrawalOf(
			statuses.filter((status) => appliesTo(status, origin, keys)),
			manifest.semver,
		);
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
			const [checked, statuses] = await Promise.all([storedManifests(), store.statuses()]);
			const withdrawn = new Set(
				checked.flatMap((version) => {
					const applying = statuses.filter(
						(status) =>
							status.id === version.manifest.id && appliesTo(status, version.origin, keys),
					);
					return withdrawalOf(applying, version.manifest.semver) ? [version] : [];
				}),
			);
			// A major keeps its newest withdrawn version when it has no other, so pinned nodes still load.
			const isBetter = (best: CheckedVersion, version: CheckedVersion) =>
				withdrawn.has(best) === withdrawn.has(version)
					? compareSemver(best.manifest.semver, version.manifest.semver) >= 0
					: withdrawn.has(version);
			const newest = checked.reduce((byMajor, version) => {
				const { id, contract } = version.manifest;
				const key = `${id}@${contract.version}`;
				const best = byMajor.get(key);
				return best && isBetter(best, version) ? byMajor : new Map(byMajor).set(key, version);
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

		withdrawal,

		async syncStatuses(ids, since) {
			if (!registryReader || !mayFetch()) return;
			for (const id of ids) {
				// A sync reads the newest index, also when a run read it a short time before the sync.
				if ((indexes.get(id)?.at ?? 0) < since) indexes.delete(id);
				await registryIndexOf(id).catch((error: unknown) =>
					LoggerProxy.warn(
						`Cannot read the status lines of ${id} from the registry: ${errorMessage(error)}`,
					),
				);
			}
		},
	};
}

/**
 * Resolves the version a contract node runs from its lock in `meta.nodeContracts`. A locked
 * bundle hash is the trust anchor for the locked version. The publisher signature is the
 * trust anchor for a newer patch. A node without a lock runs `head`: the bundled HEAD, or the
 * newest stored version of an older major. A yanked version runs only as the locked version or
 * `head`. A revoked version does not run unless `revokedAllowed` lists it.
 */
export function contractVersionLoader(options: ContractRegistryOptions): ContractVersionLoader {
	const { store } = options;
	const allowed = new Set(options.revokedAllowed ?? []);
	const deny = options.permissionsDeny ?? [];
	const runnable = async (version: FrozenVersion, node: INode) => {
		const withdrawn = await store.withdrawal(version);
		const { id, semver } = version.manifest;
		const at = `${id}@${semver}`;
		if (withdrawn && 'revoke' in withdrawn && !allowed.has(at)) {
			throw new UserError(
				`${at} is revoked: ${withdrawn.reason}. An admin can allow it in N8N_NODE_CONTRACTS_REVOKED_ALLOW.`,
			);
		}
		// The loader refuses the versions that it projects. A lock or a patch can resolve to another version.
		const denied = deniedPermissionClassOf(version, deny);
		if (denied !== undefined) {
			const message = `${at} does not run: N8N_NODE_PERMISSIONS_DENY denies its permission class "${denied}"`;
			options.onPermissionRefused?.({
				action: id,
				version: semver,
				node,
				permission: denied,
				message,
			});
			throw new UserError(message);
		}
		return version;
	};
	const notWithdrawn = async (versions: readonly FrozenVersion[]) => {
		const withdrawn = await Promise.all(
			versions.map(async (version) => await store.withdrawal(version)),
		);
		return versions.filter((_, index) => withdrawn[index] === undefined);
	};
	return async (context, head) => {
		const meta = await options.metaOf(context);
		const node = context.getNode();
		const lock = locksOf(meta).find(([name]) => name === node.name)?.[1];
		// A lock of another action or major is stale: the node changed after the build.
		if (
			lock?.action !== head.manifest.id ||
			parseSemver(lock.version).major !== head.manifest.contract.version
		) {
			return await runnable(head, node);
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
			...(locked instanceof Error ? [] : [locked]),
			...(await notWithdrawn([
				...(head.origin === 'first-party' ? [head] : []),
				...newer.filter((version) => version.origin === origin),
			])),
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
		return await runnable(trusted.find((version) => version.manifest === manifest) ?? head, node);
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
 * run profile listener, the permission refusal listener, the input hosts and the response limit
 * of this package's node-sdk, which its nodes run with. With a sandbox, it also starts to compile
 * the sandbox guests and does not wait for the result.
 */
export const useContractRegistry = (options: ContractRegistryOptions) => {
	setNodeContractRange(options.nodeContractRange);
	setContractVersionLoader(contractVersionLoader(options));
	setCredentialManifests(credentialManifestsOf(options.store, options.hasOtherCredentialType));
	setRunProfileListener(options.onRunProfile, options.tracePayloads);
	setPermissionRefusalListener(options.onPermissionRefused);
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
 * Node Contract version. Then it puts the trusted status lines of each locked id into the
 * store. A sync of many pages gives the same `since` to each page, so that it reads each
 * registry index once. It never throws for one bundle: it reports the failure.
 */
export async function syncContractStore(
	store: ContractStore,
	nodes: readonly LockedNode[],
	since = Date.now(),
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
	await store.syncStatuses([...heads.keys()], since);
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
 * nothing. Then it puts the status lines that a trusted key signs into the store.
 */
export async function importContractStore(
	source: StoreReader,
	store: InstanceStore,
	keys: ContractKeys,
): Promise<StoredVersion[]> {
	const ids = await source.ids();
	const indexes = await Promise.all(ids.map(async (id) => await source.index(id)));
	const versions = await Promise.all(
		indexes
			.flatMap(({ versions: records }) => records)
			.map(async (record) => await verifiedVersionOf(source, record, keys)),
	);
	const added = await admitVersions(store, versions);
	await admitStatuses(
		store,
		indexes.flatMap(({ statuses }) => statuses),
		keys,
	);
	return added;
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
 * stored credential manifests that they pin, and the status lines of the written versions. The
 * index of each id lists its versions in semver order, then its status lines in the order of
 * their canonical JSON, so the same rows give the same bytes.
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
	const records = await addToStore(dir, versions);
	const written = new Set(versions.map(({ id, version }) => `${id}@${version}`));
	const ids = new Set(versions.map(({ id }) => id));
	const statuses = (await store.statuses()).filter((status) => {
		const target = 'yank' in status ? status.yank : 'revoke' in status ? status.revoke : undefined;
		return target === undefined ? ids.has(status.id) : written.has(`${status.id}@${target}`);
	});
	const ordered = statuses
		.map((status) => [canonicalJson(status), status] as const)
		.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
		.map(([, status]) => status);
	if (ordered.length > 0) await addStatusToStore(dir, ordered);
	return records;
}
