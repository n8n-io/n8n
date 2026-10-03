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
	compareSemver,
	integrityOf,
	isNodeContractVersion,
	openContractPackage,
	packageNameOf,
	parseSemver,
	resolveContractVersion,
	verifyManifestSignature,
	type ContractPackage,
	type NodeContractLock,
	type NodeContractsPolicy,
	type NodeContractVersion,
	type VersionManifest,
} from '@n8n/node-sdk/registry';
import { sandboxExecutorLoader, warmSandbox, type SandboxOptions } from '@n8n/node-sdk/sandbox';
import { access, link, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
	LoggerProxy,
	UserError,
	type IExecuteFunctions,
	type ISupplyDataFunctions,
} from 'n8n-workflow';

import { versionsOf } from './registry';

export interface ContractStoreOptions {
	/** Empty: only the bundled HEAD and stored versions run. */
	readonly registryUrl: string;
	/**
	 * PEM of the trusted publisher key. With it, the store takes and serves only signed bundles.
	 * Without it, no patch newer than the lock applies.
	 */
	readonly publicKey: string | undefined;
	/** Verified tarballs, `<bundleHash>.tgz`. The store adds files and never removes one. */
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
 * The content-addressed store of action versions that n8n does not bundle. Each bundle is
 * checked before the store takes it: the npm integrity, the bundle hash, the manifest, and the
 * publisher signature when a key is set.
 */
export interface ContractStore {
	readonly registryUrl: string;
	/** The bundle hashes in the store. */
	bundleHashes(): Promise<ReadonlySet<string>>;
	/** The locked version, from the store or else from the registry into the store. */
	locked(lock: NodeContractLock): Promise<FrozenVersion>;
	/** Adds a tarball from another source, for example a directory of an air-gapped host. */
	add(tarball: Buffer): Promise<VersionManifest>;
	/** The newest stored version of each major, by action id. A bad file is skipped. */
	versions(): Promise<ReadonlyMap<string, readonly FrozenVersion[]>>;
	/** Signed patches of the locked major.minor with the locked contract hash. */
	newerPatches(lock: NodeContractLock): Promise<FrozenVersion[]>;
}

interface PublishedVersion {
	readonly version: string;
	readonly nodeContract: NodeContractVersion | undefined;
	readonly contractHash: unknown;
	readonly bundleHash: unknown;
	readonly tarball: string;
	readonly integrity: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isPolicy = (value: unknown): value is NodeContractsPolicy =>
	value === 'strict' || value === 'tolerant';

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const HASH = /^[a-f0-9]{64}$/;
const STORE_FILE = /^([a-f0-9]{64})\.tgz$/;

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

const isFsError = (error: unknown, codes: readonly string[]) =>
	isRecord(error) && typeof error.code === 'string' && codes.includes(error.code);

// Some network file systems have no hard links.
const NO_LINK = ['EPERM', 'ENOTSUP', 'ENOSYS'];

const publishedVersions = (packument: unknown): PublishedVersion[] =>
	Object.entries(
		isRecord(packument) && isRecord(packument.versions) ? packument.versions : {},
	).flatMap(([version, entry]) => {
		const contract = isRecord(entry) ? entry.n8nContract : undefined;
		const dist = isRecord(entry) ? entry.dist : undefined;
		if (!isRecord(contract) || !isRecord(dist)) return [];
		const { tarball, integrity } = dist;
		if (typeof tarball !== 'string' || typeof integrity !== 'string') return [];
		const { contractHash, bundleHash } = contract;
		const nodeContract = isNodeContractVersion(contract.nodeContract)
			? contract.nodeContract
			: undefined;
		return [{ version, nodeContract, contractHash, bundleHash, tarball, integrity }];
	});

// A registry lookup for each run is too slow, and a new patch may wait this long.
const PACKUMENT_TTL_MS = 60_000;

// An execution waits for a missing bundle, so a dead registry must fail it soon.
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/** Versions that came from the store and not from the n8n release. */
const storedVersions = new WeakSet<FrozenVersion>();

export function contractStore(options: ContractStoreOptions): ContractStore {
	const { registryUrl, publicKey, storeDir } = options;
	const timeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
	const packuments = new Map<string, { at: number; versions: Promise<PublishedVersion[]> }>();
	/** Loads in flight, so parallel executions download a bundle once. */
	const loading = new Map<string, Promise<ContractPackage>>();
	/** Verified manifests by bundle hash. A stored file never changes, so they stay valid. */
	const manifests = new Map<string, VersionManifest>();
	/** Bundle hashes whose manifest signature the trusted key verified. */
	const signed = new Set<string>();

	const fetch = async (url: string) =>
		await options.fetch(url, { signal: AbortSignal.timeout(timeoutMs) });

	const fetchPackument = async (name: string) => {
		// npm addresses a scoped package as `@scope%2fname`.
		const response = await fetch(`${registryUrl.replace(/\/$/, '')}/${name.replace('/', '%2f')}`);
		if (response.status === 404) return [];
		if (!response.ok) throw new UserError(`The registry returned ${response.status} for ${name}`);
		return publishedVersions(await response.json());
	};

	const packumentOf = async (name: string) => {
		const cached = packuments.get(name);
		if (cached && Date.now() - cached.at < PACKUMENT_TTL_MS) return await cached.versions;
		const versions = fetchPackument(name);
		packuments.set(name, { at: Date.now(), versions });
		return await versions.catch((error: unknown) => {
			packuments.delete(name);
			throw error;
		});
	};

	const storeFile = (bundleHash: string) => path.join(storeDir, `${bundleHash}.tgz`);

	const isSigned = (pkg: ContractPackage) => {
		if (!publicKey || !verifyManifestSignature(pkg, publicKey)) return false;
		signed.add(pkg.manifest.bundleHash);
		return true;
	};

	const verified = (pkg: ContractPackage) => {
		if (publicKey && !isSigned(pkg)) {
			const { id, semver, bundleHash } = pkg.manifest;
			throw new UserError(
				`${id}@${semver} (bundle ${bundleHash}) is not signed by the trusted key`,
			);
		}
		manifests.set(pkg.manifest.bundleHash, pkg.manifest);
		return pkg;
	};

	/** The stored package without the signature check. */
	const readFileOf = async (bundleHash: string) => {
		const data = await readFile(storeFile(bundleHash)).catch(() => undefined);
		if (!data) return undefined;
		const pkg = openContractPackage(data, integrityOf(data));
		if (pkg.manifest.bundleHash !== bundleHash) {
			throw new UserError(`The store file ${bundleHash}.tgz holds another bundle`);
		}
		return pkg;
	};

	/** With a key, the store serves only signed files, also files stored before the key was set. */
	const readStored = async (bundleHash: string) => {
		const pkg = await readFileOf(bundleHash);
		return pkg && verified(pkg);
	};

	const write = async (bundleHash: string, data: Buffer) => {
		await mkdir(storeDir, { recursive: true });
		const file = storeFile(bundleHash);
		const part = `${file}.${process.pid}.${Date.now()}.tmp`;
		await writeFile(part, data);
		// A link never replaces a file, and a parallel reader never sees a part of one.
		await link(part, file).catch(async (error: unknown) => {
			if (isFsError(error, ['EEXIST'])) return;
			if (!isFsError(error, NO_LINK)) throw error;
			// The bundle is verified and its hash names the file, so a rename keeps the same code.
			const present = await access(file).then(
				() => true,
				() => false,
			);
			if (!present) await rename(part, file);
		});
		await rm(part, { force: true });
	};

	/** Downloads the tarball of `entry` and stores it when its manifest matches `expected`. */
	const download = async (entry: PublishedVersion, expected: NodeContractLock) => {
		const response = await fetch(entry.tarball);
		if (!response.ok) {
			throw new UserError(`The registry returned ${response.status} for ${entry.tarball}`);
		}
		const data = Buffer.from(await response.arrayBuffer());
		const pkg = verified(openContractPackage(data, entry.integrity));
		assertLocked(pkg.manifest, expected);
		await write(expected.bundleHash, data);
		return pkg;
	};

	const fromRegistry = async (lock: NodeContractLock) => {
		if (!registryUrl) throw new UserError('No registry is set');
		const versions = await packumentOf(packageNameOf(lock.action));
		const entry = versions.find(({ bundleHash }) => bundleHash === lock.bundleHash);
		if (!entry) throw new UserError('The registry does not have this bundle');
		return await download(entry, lock);
	};

	/** A verified package from the store, or else from the registry. */
	const load = async (lock: NodeContractLock) => {
		const known = loading.get(lock.bundleHash);
		if (known) return await known;
		const loaded = readStored(lock.bundleHash)
			.then(async (stored) => stored ?? (await fromRegistry(lock)))
			.then((pkg) => {
				assertLocked(pkg.manifest, lock);
				return pkg;
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

	/** The bundle loads on the first execution. When the file is gone, it loads from the registry again. */
	const storedVersion = (manifest: VersionManifest): FrozenVersion => {
		const version = {
			manifest,
			readBundle: async () => (await load(lockOf(manifest))).bundle,
		};
		storedVersions.add(version);
		return version;
	};

	const bundleHashes = async () =>
		new Set(
			(await readdir(storeDir).catch(() => [])).flatMap((file) => STORE_FILE.exec(file)?.[1] ?? []),
		);

	return {
		registryUrl,
		bundleHashes,

		async locked(lock) {
			const known = manifests.get(lock.bundleHash);
			const present = await access(storeFile(lock.bundleHash)).then(
				() => true,
				() => false,
			);
			if (known && present && !mismatchOf(known, lock)) return storedVersion(known);
			return storedVersion((await load(lock)).manifest);
		},

		async add(tarball) {
			const { manifest } = verified(openContractPackage(tarball, integrityOf(tarball)));
			await write(manifest.bundleHash, tarball);
			return manifest;
		},

		async versions() {
			const stored = await Promise.all(
				[...(await bundleHashes())].map(
					async (bundleHash) =>
						manifests.get(bundleHash) ??
						(await readStored(bundleHash).catch(() => undefined))?.manifest,
				),
			);
			const newest = stored.reduce((byMajor, manifest) => {
				if (!manifest) return byMajor;
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
			if (!registryUrl || !publicKey) return [];
			const locked = parseSemver(lock.version);
			const versions = await packumentOf(packageNameOf(lock.action)).catch(() => []);
			const candidates = versions.filter(({ version, nodeContract, contractHash }) => {
				const { major, minor, patch } = parseSemver(version);
				return (
					major === locked.major &&
					minor === locked.minor &&
					patch > locked.patch &&
					nodeContract !== undefined &&
					runsNodeContract(nodeContract) &&
					contractHash === lock.contractHash
				);
			});
			const patches = await Promise.all(
				candidates.map(async (entry) => {
					const { bundleHash } = entry;
					if (typeof bundleHash !== 'string' || !HASH.test(bundleHash)) return [];
					const expected = { ...lock, version: entry.version, bundleHash };
					const known = manifests.get(bundleHash);
					if (known && signed.has(bundleHash) && !mismatchOf(known, expected)) {
						return [storedVersion(known)];
					}
					// A tampered or unsigned patch never runs; the locked version runs instead.
					const pkg =
						(await readFileOf(bundleHash).catch(() => undefined)) ??
						(await download(entry, expected).catch(() => undefined));
					return pkg && isSigned(pkg) && !mismatchOf(pkg.manifest, expected)
						? [storedVersion(verified(pkg).manifest)]
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
