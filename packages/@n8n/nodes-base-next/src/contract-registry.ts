import {
	integrityOf,
	NODE_CONTRACT_ABI,
	openContractPackage,
	packageNameOf,
	parseSemver,
	resolveContractVersion,
	setContractVersionLoader,
	verifyManifestSignature,
	type ContractPackage,
	type ContractVersionLoader,
	type FrozenVersion,
	type NodeContractLock,
	type NodeContractsPolicy,
} from '@n8n/node-sdk';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { UserError, type IExecuteFunctions } from 'n8n-workflow';

export interface ContractRegistryOptions {
	/** The instance policy. `meta.nodeContractsPolicy` of a workflow overrides it. */
	readonly policy: NodeContractsPolicy;
	/** Empty: only the bundled HEAD and cached versions run. */
	readonly registryUrl: string;
	/** PEM of the trusted publisher key. Without it, no patch newer than the lock applies. */
	readonly publicKey: string | undefined;
	/** Verified tarballs, by bundle hash. */
	readonly cacheDir: string;
	readonly fetch: (url: string) => Promise<Response>;
	/** The `meta` of the running workflow. */
	readonly metaOf: (context: IExecuteFunctions) => Promise<unknown>;
}

interface PublishedVersion {
	readonly version: string;
	readonly abi: unknown;
	readonly contractHash: unknown;
	readonly bundleHash: unknown;
	readonly tarball: string;
	readonly integrity: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const isPolicy = (value: unknown): value is NodeContractsPolicy =>
	value === 'strict' || value === 'tolerant';

const HASH = /^[a-f0-9]{64}$/;

const isLock = (value: unknown): value is NodeContractLock =>
	isRecord(value) &&
	typeof value.action === 'string' &&
	typeof value.version === 'string' &&
	/^\d+\.\d+\.\d+$/.test(value.version) &&
	typeof value.bundleHash === 'string' &&
	HASH.test(value.bundleHash) &&
	typeof value.contractHash === 'string';

const publishedVersions = (packument: unknown): PublishedVersion[] =>
	Object.entries(
		isRecord(packument) && isRecord(packument.versions) ? packument.versions : {},
	).flatMap(([version, entry]) => {
		const contract = isRecord(entry) ? entry.n8nContract : undefined;
		const dist = isRecord(entry) ? entry.dist : undefined;
		if (!isRecord(contract) || !isRecord(dist)) return [];
		const { tarball, integrity } = dist;
		if (typeof tarball !== 'string' || typeof integrity !== 'string') return [];
		const { abi, contractHash, bundleHash } = contract;
		return [{ version, abi, contractHash, bundleHash, tarball, integrity }];
	});

const toVersion = ({ manifest, bundle }: ContractPackage): FrozenVersion => ({
	manifest,
	readBundle: async () => bundle,
});

// A registry lookup for each run is too slow, and a new patch may wait this long.
const PACKUMENT_TTL_MS = 60_000;

/**
 * Resolves the version a contract node runs from its lock in `meta.nodeContracts`. A locked
 * bundle hash is the trust anchor for the locked version. The publisher signature is the
 * trust anchor for a newer patch. A node without a lock runs the bundled HEAD.
 */
export function contractVersionLoader(options: ContractRegistryOptions): ContractVersionLoader {
	const { registryUrl, publicKey, cacheDir, fetch } = options;
	const packuments = new Map<string, { at: number; versions: Promise<PublishedVersion[]> }>();
	const packages = new Map<string, Promise<ContractPackage | undefined>>();

	const fetchPackument = async (name: string) => {
		// npm addresses a scoped package as `@scope%2fname`.
		const response = await fetch(`${registryUrl.replace(/\/$/, '')}/${name.replace('/', '%2f')}`);
		if (response.status === 404) return [];
		if (!response.ok) {
			throw new UserError(`The contract registry returned ${response.status} for ${name}`);
		}
		return publishedVersions(await response.json());
	};

	const versionsOf = async (name: string) => {
		const cached = packuments.get(name);
		if (cached && Date.now() - cached.at < PACKUMENT_TTL_MS) return await cached.versions;
		const versions = fetchPackument(name);
		packuments.set(name, { at: Date.now(), versions });
		return await versions.catch((error: unknown) => {
			packuments.delete(name);
			throw error;
		});
	};

	const cacheFile = (bundleHash: string) => path.join(cacheDir, `${bundleHash}.tgz`);

	const readCached = async (bundleHash: string) => {
		const data = await readFile(cacheFile(bundleHash)).catch(() => undefined);
		if (!data) return undefined;
		const pkg = openContractPackage(data, integrityOf(data));
		return pkg.manifest.bundleHash === bundleHash ? pkg : undefined;
	};

	const download = async (entry: PublishedVersion, bundleHash: string) => {
		const response = await fetch(entry.tarball);
		if (!response.ok) {
			throw new UserError(`The contract registry returned ${response.status} for ${entry.tarball}`);
		}
		const data = Buffer.from(await response.arrayBuffer());
		const pkg = openContractPackage(data, entry.integrity);
		if (pkg.manifest.bundleHash !== bundleHash || pkg.manifest.semver !== entry.version) {
			throw new UserError(`The tarball of ${entry.version} does not hold bundle ${bundleHash}`);
		}
		const file = cacheFile(bundleHash);
		await mkdir(cacheDir, { recursive: true });
		// Rename is atomic, so a parallel reader never sees a part of the file.
		await writeFile(`${file}.${process.pid}.tmp`, data);
		await rename(`${file}.${process.pid}.tmp`, file);
		return pkg;
	};

	/** A verified package from the disk cache or the registry, by bundle hash. */
	const packageOf = async (bundleHash: string, entry: PublishedVersion | undefined) => {
		const known = packages.get(bundleHash);
		if (known) return await known;
		const opened = readCached(bundleHash).then(
			async (cached) => cached ?? (entry ? await download(entry, bundleHash) : undefined),
		);
		packages.set(bundleHash, opened);
		// Keep only hits, so a later call with a registry entry can still download.
		const pkg = await opened.catch((error: unknown) => {
			packages.delete(bundleHash);
			throw error;
		});
		if (!pkg) packages.delete(bundleHash);
		return pkg;
	};

	const lockedVersion = async (lock: NodeContractLock) => {
		const cached = await packageOf(lock.bundleHash, undefined);
		if (cached || !registryUrl) return cached && toVersion(cached);
		const versions = await versionsOf(packageNameOf(lock.action));
		const entry = versions.find(({ bundleHash }) => bundleHash === lock.bundleHash);
		const pkg = entry && (await packageOf(lock.bundleHash, entry));
		return pkg && toVersion(pkg);
	};

	/** Signed patches of the locked major.minor with the locked contract hash. */
	const newerPatches = async (lock: NodeContractLock): Promise<FrozenVersion[]> => {
		if (!registryUrl || !publicKey) return [];
		const locked = parseSemver(lock.version);
		const versions = await versionsOf(packageNameOf(lock.action)).catch(() => []);
		const candidates = versions.filter(({ version, abi, contractHash }) => {
			const { major, minor, patch } = parseSemver(version);
			return (
				major === locked.major &&
				minor === locked.minor &&
				patch > locked.patch &&
				abi === NODE_CONTRACT_ABI &&
				contractHash === lock.contractHash
			);
		});
		const verified = await Promise.all(
			candidates.map(async (entry) => {
				if (typeof entry.bundleHash !== 'string' || !HASH.test(entry.bundleHash)) return [];
				// A tampered or unsigned patch never runs; the locked version runs instead.
				const pkg = await packageOf(entry.bundleHash, entry).catch(() => undefined);
				return pkg && verifyManifestSignature(pkg, publicKey) ? [toVersion(pkg)] : [];
			}),
		);
		return verified.flat();
	};

	return async (context, head) => {
		const meta = await options.metaOf(context);
		const locks = isRecord(meta) && isRecord(meta.nodeContracts) ? meta.nodeContracts : {};
		const lock = locks[context.getNode().name];
		// A lock of another action or major is stale: the node changed after the build.
		if (
			!isLock(lock) ||
			lock.action !== head.manifest.id ||
			parseSemver(lock.version).major !== head.manifest.contract.version
		) {
			return head;
		}
		const override = isRecord(meta) ? meta.nodeContractsPolicy : undefined;
		const policy = isPolicy(override) ? override : options.policy;
		const newer = policy === 'tolerant' ? await newerPatches(lock) : [];
		const locked = head.manifest.bundleHash === lock.bundleHash ? head : await lockedVersion(lock);
		// The bundled HEAD is trusted: it may be a newer patch of the locked contract.
		const trusted = [head, ...(locked ? [locked] : []), ...newer];
		const manifest = resolveContractVersion(
			lock,
			policy,
			trusted.map((version) => version.manifest),
		);
		return trusted.find((version) => version.manifest === manifest) ?? head;
	};
}

/** Sets the contract version loader of this package's node-sdk, which its nodes run with. */
export const useContractRegistry = (options: ContractRegistryOptions) =>
	setContractVersionLoader(contractVersionLoader(options));
