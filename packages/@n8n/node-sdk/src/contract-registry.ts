/**
 * The store of the contract versions of a host: the embedded stores of its source packages, the
 * store of the instance and the registry. It checks each version before the store takes it, and
 * picks the version that a node pin names.
 */
import { isRecord } from '@n8n/utils/is-record';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
	LoggerProxy,
	UserError,
	type IExecuteFunctions,
	type INode,
	type INodeContractPin,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { bundledCredentialsOf, versionsOf, type DigestedVersion } from './catalog';
import { permissionsOf, type ContractPermissions, type PermissionRefusalListener } from './egress';
import { parseCredentialManifest, type CredentialManifest } from './manifest';
import { npmRegistryOf, npmStoreReader } from './npm';
import type { ContractOrigin, ContractVersionLoader, FrozenVersion } from './runtime';
import { canonicalJson } from './schema';
import {
	addStatusToStore,
	addToStore,
	embeddedStoreDirOf,
	isVersionManifest,
	storeIndexFileOf,
	storeStatusTextOf,
	unresolvedCredentialPinsOf,
	verifyStoreSignature,
	withdrawalOf,
	type SourcePackage,
	type StoreIndex,
	type StoreReader,
	type StoreRecord,
	type StoreRevoke,
	type StoreStatusRecord,
	type StoreVersion,
	type StoreYank,
} from './store';
import {
	addedPermissionsOf,
	compareSemver,
	parseManifest,
	parseNativeManifest,
	parseSemver,
	resolveContractVersion,
	type NodeContractLock,
	type NodeContractsPolicy,
	type NodeContractVersion,
	type VersionManifest,
} from './version';

/** The options of `contractStore`. */
export interface ContractStoreOptions {
	/**
	 * The npm registry of contract packages, e.g. `http://localhost:4873`. Empty: only the bundled
	 * HEAD and stored versions run.
	 */
	readonly registryUrl: string;
	/** The npm scope of contract packages. Default: `DEFAULT_NPM_SCOPE`. */
	readonly npmScope?: string;
	/** The bearer token for the npm registry. */
	readonly npmToken?: string;
	/**
	 * The keys that prove the origin of a version. With one of them, the store takes and serves
	 * only versions that a key of them signs. Without both, the store takes unsigned versions as
	 * `private`, and no patch newer than the node pin applies.
	 */
	readonly keys: ContractKeys;
	/** The store of the instance. Each version that the registry gives goes into it. */
	readonly store: InstanceStore;
	/**
	 * False on a host that only reads the store, e.g. a worker. Then a version that the store
	 * does not have fails. Default: true.
	 */
	readonly mayFetch?: () => boolean;
	/** Reads one registry URL. `signal` ends the request at the timeout. */
	readonly fetch: (
		url: string,
		init: {
			/** The request headers, e.g. the bearer token. */
			headers: Record<string, string>;
			/** Aborts the request. */
			signal: AbortSignal;
		},
	) => Promise<Response>;
	/** For each registry request. */
	readonly fetchTimeoutMs?: number;
	/** Whether the host runs a Node Contract version, see `HostRuntime.runsNodeContract`. */
	readonly runsNodeContract: (version: NodeContractVersion) => boolean;
}

/** The options of `contractVersionLoader`. */
export interface ContractVersionLoaderOptions {
	/** The instance policy. `meta.nodeContractsPolicy` of a workflow overrides it. */
	readonly policy: NodeContractsPolicy;
	/** The store that resolves each pin. */
	readonly store: ContractStore;
	/** The `meta` of the running workflow, from a root node or a sub-node. */
	readonly metaOf: (context: IExecuteFunctions | ISupplyDataFunctions) => Promise<unknown>;
	/** Gets each version that a permission refuses, e.g. for the audit log. */
	readonly onPermissionRefused?: PermissionRefusalListener;
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
 * Whether a status line applies to a version of `origin`. A line from the npm registry applies
 * to every origin: the registry auth decides who deprecates. Else its signer must prove at least
 * that origin. So only the first-party key withdraws a first-party version, and an unsigned line
 * applies only to a private version.
 */
const appliesTo = (status: StoreStatusRecord, origin: ContractOrigin, keys: ContractKeys) =>
	('registry' in status && status.registry !== undefined) ||
	ORIGIN_RANK[originOf(status, storeStatusTextOf(status), keys)] >= ORIGIN_RANK[origin];

/** Inserts the status lines that the store does not have, and returns them. */
async function admitStatuses(
	store: InstanceStore,
	statuses: readonly StoreStatusRecord[],
): Promise<StoreStatusRecord[]> {
	const ids = [...new Set(statuses.map(({ id }) => id))];
	const stored = new Set(
		(await Promise.all(ids.map(async (id) => await store.statuses(id)))).flat().map(canonicalJson),
	);
	const lines = statuses.map(canonicalJson);
	const added = statuses.filter(
		(_, index) => !stored.has(lines[index] ?? '') && lines.indexOf(lines[index] ?? '') === index,
	);
	if (added.length > 0) await store.insertStatuses(added);
	return added;
}

/** The versions and credential manifests in the embedded stores of the source packages of a host. */
export interface EmbeddedContracts {
	/** The embedded versions of an id, newest first. Empty when no package ships the id. */
	versionsOf(id: string): readonly DigestedVersion[];
	/** The embedded credential manifests. n8n registers each one and signs with it. */
	credentials(): readonly CredentialManifest[];
}

/** The embedded contracts of `packages`. A package that ships no index of an id gives no version. */
export const embeddedContractsOf = (packages: readonly SourcePackage[]): EmbeddedContracts => {
	const dirs = packages.map(embeddedStoreDirOf);
	return {
		versionsOf: (id) =>
			dirs.flatMap((dir) =>
				existsSync(path.join(dir, storeIndexFileOf(id))) ? versionsOf(id, dir) : [],
			),
		credentials: () =>
			dirs.flatMap((dir) => bundledCredentialsOf(dir).map(({ manifest }) => manifest)),
	};
};

/**
 * The store of action versions that n8n does not bundle. Each version is checked before the
 * store takes it: the digests of its blobs, the manifest against the lock, and the publisher
 * signature when a key is set. The store records the origin of each version when it takes it.
 */
export interface ContractStore {
	/** The registry URL, see `ContractStoreOptions.registryUrl`. */
	readonly registryUrl: string;
	/** The versions and credential manifests that ship in the release. */
	readonly embedded: EmbeddedContracts;
	/** Whether the host runs a Node Contract version, see `HostRuntime.runsNodeContract`. */
	readonly runsNodeContract: (version: NodeContractVersion) => boolean;
	/** The bundle hashes in the store. */
	bundleHashes(): Promise<ReadonlySet<string>>;
	/**
	 * The version of an action that a node pin names: a bundled version, a stored one, or else
	 * one from the registry into the store. It throws when no source has the pinned digest.
	 */
	locked(actionId: string, pin: INodeContractPin): Promise<FrozenVersion>;
	/**
	 * The pin that the host saves on a node of an action major. `current` stays when it pins
	 * that major and a bundled or stored version has its digest and version. With `keepUnknown`,
	 * it also stays when no bundled or stored version has its digest or its version, so that a
	 * sync can fetch it. Else the newest bundled or stored version of the major that is not
	 * yanked or revoked. `undefined` when the major has no such version.
	 */
	pinOf(
		actionId: string,
		major: number,
		current?: INodeContractPin,
		options?: {
			/** Keeps a pin that no bundled or stored version knows, so that a sync can fetch it. */
			keepUnknown?: boolean;
		},
	): Promise<INodeContractPin | undefined>;
	/** The newest stored version of each major, by action id. A bad version is skipped. */
	versions(): Promise<ReadonlyMap<string, readonly FrozenVersion[]>>;
	/** Signed patches of the pinned major.minor with the pinned contract hash. */
	newerPatches(lock: NodeContractLock): Promise<FrozenVersion[]>;
	/**
	 * The newest stored credential manifest of each n8n type name. A version that the store takes
	 * from the registry brings the credential manifests it pins when a key is set, unless n8n
	 * bundles that id and major.
	 */
	credentials(): Promise<ReadonlyMap<string, CredentialManifest>>;
	/**
	 * The stored yank or revoke line of a version, or `undefined`. A line from the npm registry
	 * applies to every version. Another line applies only when its signer proves at least the
	 * origin of the version.
	 */
	withdrawal(
		version: Pick<FrozenVersion, 'manifest' | 'origin'>,
	): Promise<StoreYank | StoreRevoke | undefined>;
	/**
	 * Adds status lines that this instance writes, e.g. a yank of a version that a user of the
	 * instance published. No key signs them, so they apply to `private` versions only. The next
	 * read sees them.
	 */
	addOwnStatuses(statuses: readonly StoreStatusRecord[]): Promise<void>;
	/**
	 * Puts the status lines of the registry index of each id into the store. It reads an index
	 * again only when it read it before `since` (ms since the epoch).
	 */
	syncStatuses(ids: readonly string[], since: number): Promise<void>;
}

/**
 * A version in the store of an instance: its bytes, the index line fields that identify it, and
 * the origin that the store recorded when it took the version.
 */
export type StoredVersion = StoreVersion &
	Pick<StoreRecord, 'id' | 'version' | 'kind' | 'manifest'> & {
		/** The origin that the store recorded when it took the version. */
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
	/** The versions and credential manifests that ship in the release, see `embeddedContractsOf`. */
	readonly embedded: EmbeddedContracts;
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
	embedded: EmbeddedContracts,
	stored: readonly StoredManifest[],
	added: readonly StoredVersion[],
): ContractInstall[] {
	const fresh = added
		.flatMap((version) => versionManifestOf(version).map((manifest) => ({ ...version, manifest })))
		.sort((a, b) => compareSemver(a.manifest.semver, b.manifest.semver));
	const known = [
		...stored.flatMap(versionManifestOf),
		...[...new Set(fresh.map(({ id }) => id))].flatMap((id) =>
			embedded.versionsOf(id).map(({ manifest }) => manifest),
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

/** Refuses a version when the store has other bytes for its id and version. */
const assertSameBytes = (stored: readonly StoredManifest[], versions: readonly StoredVersion[]) => {
	const conflict = versions.find((version) =>
		stored.some(
			({ id, version: semver, manifest }) =>
				id === version.id && semver === version.version && manifest !== version.manifest,
		),
	);
	if (conflict) {
		throw new UserError(`${conflict.id}@${conflict.version} is in the store with other bytes`);
	}
};

/** The manifest of a stored version that can pin credentials: a version with a bundle or a native version. */
const pinningManifestOf = ({ kind, bundle, manifestText }: StoredVersion) => {
	if (kind === 'credential') return undefined;
	return bundle === undefined ? parseNativeManifest(manifestText) : parseManifest(manifestText);
};

/** The credential manifests of stored rows. A row that does not parse is skipped. */
const parsedCredentialsOf = (rows: ReadonlyArray<Pick<StoredManifest, 'manifestText'>>) =>
	rows.flatMap((row) => {
		try {
			return [parseCredentialManifest(row.manifestText)];
		} catch {
			return [];
		}
	});

/**
 * Refuses the versions whose credential pins resolve to no credential manifest: none in `added`,
 * none in the store and none that n8n bundles. Without it, n8n cannot project the credential
 * type that the version signs with.
 */
async function assertPinsResolve(store: InstanceStore, added: readonly StoredVersion[]) {
	const pinning = added.flatMap((version) => {
		const manifest = pinningManifestOf(version);
		return manifest?.credentials?.length ? [{ version, manifest }] : [];
	});
	if (pinning.length === 0) return;
	const known = [
		...store.embedded.credentials(),
		...parsedCredentialsOf(await store.credentialManifests()),
		...parsedCredentialsOf(added.filter(({ kind }) => kind === 'credential')),
	];
	const unresolved = pinning.flatMap(({ version, manifest }) => {
		const pins = unresolvedCredentialPinsOf(manifest, known);
		return pins.length > 0
			? [`${version.id}@${version.version} pins the credential ${pins.join(', ')}`]
			: [];
	});
	if (unresolved.length > 0) {
		throw new UserError(
			`${unresolved.join('; ')}, but n8n has no credential manifest of that id and major. Add the credential manifest to the store first, e.g. with "n8n contracts:import".`,
		);
	}
}

const storedManifestsOf = async (store: InstanceStore, ids: readonly string[]) =>
	(await Promise.all(ids.map(async (id) => await store.manifests(id)))).flat();

/**
 * Inserts checked versions into the store and returns the versions that it did not have. A
 * stored version stays, and other bytes for its id and version are refused. A version whose
 * credential pins do not resolve is refused, see `assertPinsResolve`.
 */
export async function admitVersions(
	store: InstanceStore,
	versions: readonly StoredVersion[],
): Promise<StoredVersion[]> {
	const ids = [...new Set(versions.map(({ id }) => id))];
	const stored = await storedManifestsOf(store, ids);
	assertSameBytes(stored, versions);
	const added = versions.filter(
		(version, index) =>
			!stored.some(({ manifest }) => manifest === version.manifest) &&
			versions.findIndex(({ manifest }) => manifest === version.manifest) === index,
	);
	if (added.length === 0) return added;
	await assertPinsResolve(store, added);
	await store.insert(added);
	// Another admission can store other bytes after the read above. The table then skips the row.
	assertSameBytes(await storedManifestsOf(store, ids), added);
	const installs = installsOf(store.embedded, stored, added);
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

const isPolicy = (value: unknown): value is NodeContractsPolicy =>
	value === 'strict' || value === 'tolerant';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Whether a value is a node pin with a `major.minor.patch` version and a sha256 digest. */
export const isNodeContractPin = (value: unknown): value is INodeContractPin =>
	isRecord(value) &&
	typeof value.version === 'string' &&
	/^\d+\.\d+\.\d+$/.test(value.version) &&
	typeof value.digest === 'string' &&
	/^sha256:[a-f0-9]{64}$/.test(value.digest);

const lockOf = ({ id, semver, bundleHash, contractHash }: VersionManifest): NodeContractLock => ({
	action: id,
	version: semver,
	bundleHash,
	contractHash,
});

// The digest covers the manifest bytes, and a store checks them, so only the id and version are left.
const assertPinned = (manifest: VersionManifest, actionId: string, pin: INodeContractPin) => {
	if (manifest.id !== actionId || manifest.semver !== pin.version) {
		throw new UserError(
			`The version ${pin.digest} is ${manifest.id}@${manifest.semver}, but the pin names ${actionId}@${pin.version}`,
		);
	}
};

const isPatchOf = (manifest: VersionManifest, lock: NodeContractLock) =>
	manifest.id === lock.action && manifest.contractHash === lock.contractHash;

const bundleDigestOf = (bundleHash: string) => `sha256:${bundleHash}`;

// A registry lookup for each run is too slow, and a new patch may wait this long.
const INDEX_TTL_MS = 60_000;

// An execution waits for a missing bundle, so a dead registry must fail it soon.
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/** A checked version and its origin. */
type CheckedVersion = Pick<FrozenVersion, 'manifest' | 'origin'>;

/** A checked version and the digest of its manifest bytes. */
type PinnableVersion = CheckedVersion & Pick<DigestedVersion, 'digest'>;

/** A version with its bundle, read and checked. */
interface LoadedVersion extends PinnableVersion {
	readonly bundle: string;
}

/** The store of a host over the instance store and the registry, see `ContractStore`. */
export function contractStore(options: ContractStoreOptions): ContractStore {
	const { registryUrl, keys, store } = options;
	const mayFetch = options.mayFetch ?? (() => true);
	const timeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
	const registryReader = registryUrl
		? npmStoreReader(npmRegistryOf(registryUrl), {
				scope: options.npmScope,
				token: options.npmToken,
				fetch: async (url, init) =>
					await options.fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
			})
		: undefined;
	const indexes = new Map<string, { at: number; records: Promise<StoreIndex> }>();
	/** Stored versions by id, so a tolerant run does not read the store each time. */
	const storedById = new Map<string, { at: number; records: Promise<PinnableVersion[]> }>();
	/** Stored status lines by id, so a run does not read the store each time. */
	const statusesById = new Map<
		string,
		{ at: number; records: Promise<readonly StoreStatusRecord[]> }
	>();
	/** Loads in flight by digest, so parallel executions download a version once. */
	const loading = new Map<string, Promise<LoadedVersion>>();
	/** Checked stored versions by digest. A stored version never changes. */
	const stored = new Map<string, PinnableVersion>();

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

	/** The registry index of an id. Each new read puts its status lines into the store. */
	const registryIndexOf = async (id: string) =>
		await cachedFor(indexes, id, async () => {
			const index = await registryOf().index(id);
			const added = await admitStatuses(store, index.statuses);
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
	const storedManifestOf = (entry: StoredManifest): PinnableVersion => {
		const manifest = parseManifest(entry.manifestText);
		const origin = signedOriginOf(
			{ ...entry, bundle: bundleDigestOf(manifest.bundleHash) },
			entry.manifestText,
		);
		const checked = {
			manifest,
			origin: entry.origin === 'first-party' ? origin : entry.origin,
			digest: entry.manifest,
		};
		stored.set(entry.manifest, checked);
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
	 * The credential manifests that a version pins, from the registry, unless n8n bundles the id
	 * and major or the store has them. A pin that the registry lacks fails the admission. A
	 * manifest with a bad signature fails the download. Without a key, nothing comes: the node
	 * pin anchors the version only, not a credential manifest.
	 */
	const pinnedCredentials = async (manifest: VersionManifest): Promise<StoredVersion[]> => {
		if (!hasKey(keys)) return [];
		const known = [...store.embedded.credentials(), ...(await storedCredentials())];
		const missing = unresolvedCredentialPinsOf(manifest, known);
		if (missing.length === 0) return [];
		const registry = registryOf();
		const found = await Promise.all(
			missing.map(async (pin) => {
				const [id = '', major = ''] = pin.split('@');
				const record = (await registry.records(id))
					.filter(({ version }) => parseSemver(version).major === Number(major))
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

	/** The stored version of a digest, or `undefined` when the store does not have it. */
	const fromStore = async (
		actionId: string,
		digest: string,
	): Promise<LoadedVersion | undefined> => {
		const entry = (await store.manifests(actionId)).find(({ manifest }) => manifest === digest);
		if (!entry) return undefined;
		const checked = storedManifestOf(entry);
		const bundle = await store.bundle(entry.manifest);
		return bundle === undefined ? undefined : { ...checked, bundle };
	};

	/** Copies a registry version into the store. The reader checks the bytes against the line. */
	const download = async (record: StoreRecord): Promise<LoadedVersion> => {
		const checked = await registryManifest(record);
		const { manifest, origin } = checked;
		const bundle = await registryOf().blob(bundleDigestOf(manifest.bundleHash));
		if (!bundle) throw new UserError(`The registry has no bundle ${manifest.bundleHash}`);
		const code = bundle.toString('utf8');
		await admitVersions(store, [
			...(await pinnedCredentials(manifest)),
			storedVersionOf(record, checked.text, origin, { bundle: code }),
		]);
		storedById.delete(record.id);
		stored.set(record.manifest, { manifest, origin, digest: record.manifest });
		return { manifest, origin, digest: record.manifest, bundle: code };
	};

	const fromRegistry = async (actionId: string, digest: string) => {
		const record = (await registryRecordsOf(actionId)).find(({ manifest }) => manifest === digest);
		if (!record) throw new UserError('The registry does not have this version');
		return await download(record);
	};

	/** A checked version from the store, or else from the registry. */
	const load = async (actionId: string, pin: INodeContractPin) => {
		const known = loading.get(pin.digest);
		if (known) return await known;
		const loaded = fromStore(actionId, pin.digest)
			.then(async (stored) => stored ?? (await fromRegistry(actionId, pin.digest)))
			.then((version) => {
				assertPinned(version.manifest, actionId, pin);
				return version;
			})
			.catch((error: unknown) => {
				throw new UserError(
					`Cannot get ${actionId}@${pin.version} (${pin.digest}) from the registry ${registryUrl || '(none set)'}: ${errorMessage(error)}`,
					{ cause: error },
				);
			})
			.finally(() => loading.delete(pin.digest));
		loading.set(pin.digest, loaded);
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
	const storedVersion = ({ manifest, origin, digest }: PinnableVersion): DigestedVersion => ({
		manifest,
		origin,
		digest,
		readBundle: async () => (await load(manifest.id, { version: manifest.semver, digest })).bundle,
	});

	const notWithdrawn = async <T extends CheckedVersion>(versions: readonly T[]) => {
		const withdrawn = await Promise.all(versions.map(async (version) => await withdrawal(version)));
		return versions.filter((_, index) => withdrawn[index] === undefined);
	};

	const storedOf = async (actionId: string) =>
		await cachedFor(storedById, actionId, async () => await storedManifests(actionId));

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
			options.runsNodeContract(candidate.nodeContract) &&
			candidate.contractHash === lock.contractHash
		);
	};

	/** On a host that does not fetch: the signed patches in the store. */
	const storedPatches = async (lock: NodeContractLock) => {
		const stored = await storedOf(lock.action).catch(() => []);
		return stored
			.filter(({ manifest }) => isNewerPatch(lock, { ...manifest, version: manifest.semver }))
			.map(storedVersion);
	};

	return {
		registryUrl,
		embedded: store.embedded,
		runsNodeContract: options.runsNodeContract,

		async bundleHashes() {
			return new Set((await storedManifests()).map(({ manifest }) => manifest.bundleHash));
		},

		async locked(actionId, pin) {
			const bundled = store.embedded
				.versionsOf(actionId)
				.find(({ digest }) => digest === pin.digest);
			if (bundled) {
				assertPinned(bundled.manifest, actionId, pin);
				return bundled;
			}
			const known = stored.get(pin.digest);
			if (known && (await store.has(pin.digest))) {
				assertPinned(known.manifest, actionId, pin);
				return storedVersion(known);
			}
			return storedVersion(await load(actionId, pin));
		},

		async pinOf(actionId, major, current, { keepUnknown = false } = {}) {
			const known = [...store.embedded.versionsOf(actionId), ...(await storedOf(actionId))].filter(
				({ manifest }) =>
					manifest.contract.version === major && options.runsNodeContract(manifest.nodeContract),
			);
			const isKnown = (pin: INodeContractPin) =>
				known.some(
					({ manifest, digest }) => manifest.semver === pin.version && digest === pin.digest,
				);
			const isUnknown = (pin: INodeContractPin) =>
				!known.some(
					({ manifest, digest }) => manifest.semver === pin.version || digest === pin.digest,
				);
			const keeps =
				isNodeContractPin(current) &&
				parseSemver(current.version).major === major &&
				(isKnown(current) || (keepUnknown && isUnknown(current)));
			if (keeps) return current;
			const newest = (await notWithdrawn(known)).reduce<PinnableVersion | undefined>(
				(best, version) =>
					best && compareSemver(best.manifest.semver, version.manifest.semver) >= 0
						? best
						: version,
				undefined,
			);
			return newest && { version: newest.manifest.semver, digest: newest.digest };
		},

		async versions() {
			const [all, statuses, credentials] = await Promise.all([
				storedManifests(),
				store.statuses(),
				storedCredentials(),
			]);
			const known = [...store.embedded.credentials(), ...credentials];
			const checked = all.filter(({ manifest }) => {
				const pins = unresolvedCredentialPinsOf(manifest, known);
				if (pins.length === 0) return true;
				LoggerProxy.warn(
					`${manifest.id}@${manifest.semver} is not listed: n8n has no credential manifest of its pin ${pins.join(', ')}`,
				);
				return false;
			});
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
			const isBetter = (best: PinnableVersion, version: PinnableVersion) =>
				withdrawn.has(best) === withdrawn.has(version)
					? compareSemver(best.manifest.semver, version.manifest.semver) >= 0
					: withdrawn.has(version);
			const newest = checked.reduce((byMajor, version) => {
				const { id, contract } = version.manifest;
				const key = `${id}@${contract.version}`;
				const best = byMajor.get(key);
				return best && isBetter(best, version) ? byMajor : new Map(byMajor).set(key, version);
			}, new Map<string, PinnableVersion>());
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
					const isCandidate = ({ manifest }: CheckedVersion) =>
						isPatchOf(manifest, lock) && manifest.semver === record.version;
					const known = stored.get(record.manifest);
					if (known && isCandidate(known)) return [storedVersion(known)];
					// A tampered or unsigned patch never runs; the pinned version runs instead.
					const version =
						(await fromStore(lock.action, record.manifest).catch(() => undefined)) ??
						(await download(record).catch(() => undefined));
					return version && isCandidate(version) ? [storedVersion(version)] : [];
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

		async addOwnStatuses(statuses) {
			await store.insertStatuses(statuses);
			statuses.forEach(({ id }) => statusesById.delete(id));
		},

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
 * Resolves the version a contract node runs from its pin (`INode.contract`). The pinned digest
 * is the trust anchor for the pinned version. The publisher signature is the trust anchor for a
 * newer patch. A node without a pin of its major runs `head`: the bundled HEAD, or the newest
 * stored version of an older major. When no source has the pinned version, a `tolerant` node
 * runs a first-party `head` that is not older than the pin, and n8n logs a warning; else the run
 * fails. A yanked version runs only as the pinned version or `head`.
 * A revoked version does not run unless `revokedAllowed` lists it.
 */
export function contractVersionLoader(
	options: ContractVersionLoaderOptions,
): ContractVersionLoader {
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
		// The loader refuses the versions that it projects. A pin or a patch can resolve to another version.
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
		const node = context.getNode();
		const pin = isNodeContractPin(node.contract) ? node.contract : undefined;
		// A pin of another major is stale: the node changed after its last save.
		if (!pin || parseSemver(pin.version).major !== head.manifest.contract.version) {
			return await runnable(head, node);
		}
		const meta = await options.metaOf(context);
		const override = isRecord(meta) ? meta.nodeContractsPolicy : undefined;
		const policy = isPolicy(override) ? override : options.policy;
		// A release replaces the bundled HEAD. Without the pinned manifest, the contract hash that a
		// patch must keep is not known. Only a first-party HEAD that is not older than the pin may run.
		const pinned = await store.locked(head.manifest.id, pin).catch((error: unknown) => {
			const runsHead =
				policy === 'tolerant' &&
				head.origin === 'first-party' &&
				compareSemver(head.manifest.semver, pin.version) >= 0;
			if (!runsHead) throw error;
			LoggerProxy.warn(
				`Node "${node.name}" runs ${head.manifest.id}@${head.manifest.semver}: ${errorMessage(error)}`,
			);
			return undefined;
		});
		if (!pinned) return await runnable(head, node);
		const locked = pinned.manifest.bundleHash === head.manifest.bundleHash ? head : pinned;
		const lock = lockOf(locked.manifest);
		const newer = policy === 'tolerant' ? await store.newerPatches(lock) : [];
		// A first-party HEAD may be a newer patch of the pinned contract, as a release ships it.
		// Another HEAD may not: only its pin makes it trusted. A signed patch must have the origin
		// of the pinned version, so that a vetting key cannot patch a first-party version.
		const trusted = [
			locked,
			...(await notWithdrawn([
				...(head.origin === 'first-party' && head !== locked ? [head] : []),
				...newer.filter((version) => version.origin === locked.origin),
			])),
		];
		const manifest = resolveContractVersion(
			lock,
			policy,
			trusted.map((version) => version.manifest),
		);
		return await runnable(trusted.find((version) => version.manifest === manifest) ?? locked, node);
	};
}

/**
 * The credential manifest of a name: the bundled one, which n8n registers and signs with, else
 * the newest one in the store, unless another package has a type of that name.
 */
export function credentialManifestsOf(
	store: Pick<ContractStore, 'credentials' | 'embedded'>,
	hasOtherCredentialType: (name: string) => boolean = () => false,
) {
	const bundled = new Map(
		store.embedded.credentials().map((manifest) => [manifest.name, manifest]),
	);
	return async (name: string) =>
		bundled.get(name) ??
		(hasOtherCredentialType(name) ? undefined : (await store.credentials()).get(name));
}

/** A node of a saved workflow, the action that it runs and its pin. */
export interface PinnedNode {
	/** The id of the workflow. */
	readonly workflowId: string;
	/** The name of the workflow. */
	readonly workflowName: string;
	/** The name of the node. */
	readonly node: string;
	/** The action id that the node runs. */
	readonly action: string;
	/** The pin of the node. */
	readonly pin: INodeContractPin;
}

/** What `syncContractStore` did. */
export interface ContractSyncResult {
	/** Versions the store did not have before. */
	readonly added: readonly VersionManifest[];
	/** Nodes whose pinned version the store could not take. */
	readonly failed: ReadonlyArray<
		PinnedNode & {
			/** Why the store did not take the version. */
			readonly error: string;
		}
	>;
	/** Nodes whose pinned version declares a Node Contract version that this host does not run. */
	readonly unsupported: ReadonlyArray<
		PinnedNode & {
			/** The Node Contract version of the pinned version. */
			readonly nodeContract: NodeContractVersion;
		}
	>;
}

/**
 * Puts the pinned version of each node into the store, one version at a time, and checks its
 * Node Contract version. Then it puts the trusted status lines of each pinned id into the
 * store. A sync of many pages gives the same `since` to each page, so that it reads each
 * registry index once. It never throws for one version: it reports the failure.
 */
export async function syncContractStore(
	store: ContractStore,
	nodes: readonly PinnedNode[],
	since = Date.now(),
): Promise<ContractSyncResult> {
	const before = await store.bundleHashes();
	const byDigest = nodes.reduce(
		(groups, node) => groups.set(node.pin.digest, [...(groups.get(node.pin.digest) ?? []), node]),
		new Map<string, readonly PinnedNode[]>(),
	);
	const ids = [...new Set(nodes.map(({ action }) => action))];
	const bundled = new Set(
		ids.flatMap((id) => store.embedded.versionsOf(id).map(({ manifest }) => manifest.bundleHash)),
	);
	const syncPin = async ({ action, pin }: PinnedNode, group: readonly PinnedNode[]) => {
		const manifest = await store.locked(action, pin).then(
			({ manifest: locked }) => locked,
			(error: unknown) => errorMessage(error),
		);
		return { manifest, group };
	};
	const results = await [...byDigest.values()].reduce<
		Promise<ReadonlyArray<Awaited<ReturnType<typeof syncPin>>>>
	>(async (previous, group) => {
		const done = await previous;
		const [first] = group;
		return first ? [...done, await syncPin(first, group)] : done;
	}, Promise.resolve([]));
	await store.syncStatuses(ids, since);
	return {
		added: results.flatMap(({ manifest }) =>
			typeof manifest === 'string' ||
			before.has(manifest.bundleHash) ||
			bundled.has(manifest.bundleHash)
				? []
				: [manifest],
		),
		failed: results.flatMap(({ manifest, group }) =>
			typeof manifest === 'string' ? group.map((node) => ({ ...node, error: manifest })) : [],
		),
		unsupported: results.flatMap(({ manifest, group }) =>
			typeof manifest === 'string' || store.runsNodeContract(manifest.nodeContract)
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
 * Puts each version of a store folder, e.g. of `contracts:export`, into the instance store
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
	// With a key, each line needs the signature of a key of them, also a line with `registry`.
	await admitStatuses(
		store,
		indexes
			.flatMap(({ statuses }) => statuses)
			.filter(
				(status) =>
					!hasKey(keys) || originOf(status, storeStatusTextOf(status), keys) !== 'private',
			),
	);
	return added;
}

/** The `<id>@<major>` pins of the credentials that a stored version uses. */
const credentialPinsOf = (version: StoredVersion) => pinningManifestOf(version)?.credentials ?? [];

const credentialPinOf = ({ manifestText }: StoredVersion) => {
	const { id, semver } = parseCredentialManifest(manifestText);
	return `${id}@${parseSemver(semver).major}`;
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
