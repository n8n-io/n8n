import {
	runsNodeContract,
	setContractVersionLoader,
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
	parseSemver,
	resolveContractVersion,
	storeBlobFileOf,
	storeFilesOfDir,
	storeFilesOfUrl,
	storeReader,
	verifyStoreSignature,
	type NodeContractLock,
	type NodeContractsPolicy,
	type NodeContractVersion,
	type StoreReader,
	type StoreRecord,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
import { sandboxExecutorLoader, warmSandbox, type SandboxOptions } from '@n8n/node-sdk/sandbox';
import { access } from 'node:fs/promises';
import path from 'node:path';
import {
	LoggerProxy,
	UserError,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { versionsOf } from './registry';

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
	/** The instance store, in the store layout. It adds versions and never removes one. */
	readonly storeDir: string;
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
}

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
	const { registryUrl, publicKey, storeDir } = options;
	const timeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
	const local = storeReader(storeFilesOfDir(storeDir));
	const registry = registryUrl
		? storeReader(
				storeFilesOfUrl(
					registryUrl,
					async (url) => await options.fetch(url, { signal: AbortSignal.timeout(timeoutMs) }),
				),
			)
		: undefined;
	const indexes = new Map<string, { at: number; records: Promise<StoreRecord[]> }>();
	/** Loads in flight, so parallel executions download a version once. */
	const loading = new Map<string, Promise<LoadedVersion>>();
	/** Checked manifests by bundle hash. A stored blob never changes, so they stay valid. */
	const manifests = new Map<string, VersionManifest>();

	const registryRecordsOf = async (id: string) => {
		if (!registry) throw new UserError('No registry is set');
		const cached = indexes.get(id);
		if (cached && Date.now() - cached.at < INDEX_TTL_MS) return await cached.records;
		const records = registry.records(id);
		indexes.set(id, { at: Date.now(), records });
		return await records.catch((error: unknown) => {
			indexes.delete(id);
			throw error;
		});
	};

	/** The manifest of a line, signed by the trusted key when one is set, or `undefined` when its blob is missing. */
	const checkedManifest = async (store: StoreReader, record: StoreRecord) => {
		const read = await store.readManifest(record);
		if (!read) return undefined;
		const { text, manifest } = read;
		if (manifest.kind === 'credential') {
			throw new UserError(`${manifest.id}@${manifest.semver} is a credential type`);
		}
		if (publicKey && !verifyStoreSignature(record, text, publicKey)) {
			throw new UserError(
				`${manifest.id}@${manifest.semver} (bundle ${manifest.bundleHash}) is not signed by the trusted key`,
			);
		}
		manifests.set(manifest.bundleHash, manifest);
		return { text, manifest };
	};

	/** The stored version of the lock, or `undefined` when a line or blob is missing. */
	const fromStore = async (lock: NodeContractLock): Promise<LoadedVersion | undefined> => {
		const record = (await local.records(lock.action)).find(
			({ version, bundle }) =>
				version === lock.version && bundle === bundleDigestOf(lock.bundleHash),
		);
		const checked = record && (await checkedManifest(local, record));
		const bundle = checked && (await local.blob(bundleDigestOf(lock.bundleHash)));
		return checked && bundle && { manifest: checked.manifest, bundle: bundle.toString('utf8') };
	};

	/** Copies a registry version into the store when its manifest matches `expected`. */
	const download = async (record: StoreRecord, expected: NodeContractLock) => {
		if (!registry) throw new UserError('No registry is set');
		const checked = await checkedManifest(registry, record);
		if (!checked) throw new UserError(`The registry has no manifest ${record.manifest}`);
		assertLocked(checked.manifest, expected);
		const bundle = await registry.blob(bundleDigestOf(expected.bundleHash));
		if (!bundle) throw new UserError(`The registry has no bundle ${expected.bundleHash}`);
		const { signatures, published } = record;
		await addToStore(storeDir, [
			{ manifestText: checked.text, bundle: bundle.toString('utf8'), signatures, published },
		]);
		return { manifest: checked.manifest, bundle: bundle.toString('utf8') };
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

	/** The bundle loads on the first execution. When its blob is gone, it loads from the registry again. */
	const storedVersion = (manifest: VersionManifest): FrozenVersion => {
		const version = {
			manifest,
			readBundle: async () => (await load(lockOf(manifest))).bundle,
		};
		storedVersions.add(version);
		return version;
	};

	const hasBlob = async (bundleHash: string) =>
		await access(path.join(storeDir, storeBlobFileOf(bundleDigestOf(bundleHash)))).then(
			() => true,
			() => false,
		);

	/** The stored versions whose bundle blob is there. */
	const storedManifests = async () => {
		const records = await Promise.all(
			(await local.catalog()).map(async ({ id }) => await local.records(id)),
		);
		const manifestsOf = await Promise.all(
			records.flat().map(async (record) => {
				const manifest = (await checkedManifest(local, record).catch(() => undefined))?.manifest;
				return manifest && (await hasBlob(manifest.bundleHash)) ? [manifest] : [];
			}),
		);
		return manifestsOf.flat();
	};

	return {
		registryUrl,

		async bundleHashes() {
			return new Set((await storedManifests()).map(({ bundleHash }) => bundleHash));
		},

		async locked(lock) {
			const known = manifests.get(lock.bundleHash);
			if (known && (await hasBlob(lock.bundleHash)) && !mismatchOf(known, lock)) {
				return storedVersion(known);
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
			if (!registry || !publicKey) return [];
			const locked = parseSemver(lock.version);
			const records = await registryRecordsOf(lock.action).catch(() => []);
			const candidates = records.filter(({ version, nodeContract, contractHash }) => {
				const { major, minor, patch } = parseSemver(version);
				return (
					major === locked.major &&
					minor === locked.minor &&
					patch > locked.patch &&
					runsNodeContract(nodeContract) &&
					contractHash === lock.contractHash
				);
			});
			const patches = await Promise.all(
				candidates.map(async (record) => {
					if (!record.bundle) return [];
					const bundleHash = record.bundle.slice('sha256:'.length);
					const expected = { ...lock, version: record.version, bundleHash };
					const known = manifests.get(bundleHash);
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
 * Sets the Node Contract range, the version loader, the sandbox and the run profile listener of
 * this package's node-sdk, which its nodes run with. With a sandbox, it also starts to compile
 * the sandbox guests and does not wait for the result.
 */
export const useContractRegistry = (options: ContractRegistryOptions) => {
	setNodeContractRange(options.nodeContractRange);
	setContractVersionLoader(contractVersionLoader(options));
	setRunProfileListener(options.onRunProfile);
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
