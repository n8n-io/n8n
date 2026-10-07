/**
 * The store layout of contract versions. The embedded store of a release and the folder of
 * `contracts:export` use the same layout:
 * - `catalog.json`: the index line of the newest version of each id that is not yanked or
 *   revoked.
 * - `index/<id>.ndjson`: one line for each version and one line for each status (yank, revoke or
 *   deprecation), append only.
 * - `blobs/sha256/<hex>`: manifest, bundle and fixtures bytes, by their SHA-256.
 */
import { isRecord } from '@n8n/utils/is-record';
import { createHash, createPublicKey, randomUUID, sign, verify } from 'node:crypto';
import {
	access,
	appendFile,
	link,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError, UserError } from 'n8n-workflow';

import {
	parseCredentialManifest,
	storeRecordSchema,
	storeStatusRecordSchema,
	type CredentialManifest,
	type NativeManifest,
} from './manifest';
import { canonicalJson } from './schema';
import { matches } from './validate';
import {
	compareSemver,
	parseManifest,
	parseNativeManifest,
	parseSemver,
	type NodeContractVersion,
	type VersionManifest,
} from './version';

/** A manifest that a store holds: a bundled version, a credential type, or a native version. */
export type StoreManifest = VersionManifest | CredentialManifest | NativeManifest;

/** True for the manifest of a version with a bundle: an action, trigger or provider that the SDK runs. */
export const isVersionManifest = (manifest: StoreManifest): manifest is VersionManifest =>
	manifest.kind !== 'credential' && !('native' in manifest);

/**
 * The credential pins of a manifest that none of `credentials` resolves, e.g. to refuse the
 * version when a store takes it. A pin `<id>@<major>` needs a credential manifest of that id and
 * major whose n8n type name the contract lists.
 */
export function unresolvedCredentialPinsOf(
	manifest: Pick<VersionManifest | NativeManifest, 'credentials' | 'contract'>,
	credentials: readonly CredentialManifest[],
): string[] {
	return (manifest.credentials ?? []).filter(
		(pin) =>
			!credentials.some(
				({ id, semver, name }) =>
					pin === `${id}@${parseSemver(semver).major}` &&
					manifest.contract.credentials.includes(name),
			),
	);
}

/** One version line of `index/<id>.ndjson`. The build writes the fields up to `name`. */
export interface StoreRecord {
	/** The contract or credential id, e.g. `notion.databasePage.getAll`. */
	readonly id: string;
	/** `major.minor.patch` of the version. */
	readonly version: string;
	/** What the manifest describes. */
	readonly kind: VersionManifest['kind'] | CredentialManifest['kind'];
	/** The lowest Node Contract version that the version needs. */
	readonly nodeContract: NodeContractVersion;
	/** `sha256:<hex>` of the manifest bytes. It identifies the version. */
	readonly manifest: string;
	/** `sha256:<hex>` of the bundle bytes. A credential and a native version have no bundle. */
	readonly bundle?: string;
	/** The contract hash of the manifest. A credential has none. */
	readonly contractHash?: string;
	/** `<id>@<major>` of each credential type that the version pins. */
	readonly credentials?: readonly string[];
	/** What the version may reach, sorted, so that a host can decide before it downloads. */
	readonly permissions?: {
		/** The hosts of the contract. */
		readonly egress: readonly string[];
		/** The host imports of the contract. */
		readonly imports: readonly string[];
	};
	/** The legacy node type that runs a native version, e.g. `n8n-nodes-base.webhook`. */
	readonly native?: string;
	/** The n8n type name of a credential, e.g. `notionApi`. */
	readonly name?: string;
	/** `sha256:<hex>` of the fixtures that publish replayed. */
	readonly fixtures?: string;
	/** Publisher signatures of the manifest bytes. */
	readonly signatures?: readonly StoreSignature[];
	/** When publish added the version, as an ISO date. */
	readonly published?: string;
}

/** One publisher signature of the manifest bytes. */
export interface StoreSignature {
	/** `sha256:<hex>` of the SPKI DER of the publisher key. */
	readonly key: string;
	/** The base64 ed25519 signature. */
	readonly sig: string;
}

/**
 * A status line of `index/<id>.ndjson` that yanks a version. A host pins no node to it and runs
 * it as no newer patch, but a node that has a pin of it still runs it.
 */
export interface StoreYank {
	/** The contract or credential id. */
	readonly id: string;
	/** `major.minor.patch` of the yanked version. */
	readonly yank: string;
	/** Why the publisher yanked the version. */
	readonly reason: string;
	/** When the publisher yanked the version, as an ISO date. */
	readonly at: string;
	/** The npm registry of a deprecation that the line comes from. Such a line applies to every origin. */
	readonly registry?: string;
	/** Publisher signatures of `storeStatusTextOf` of the line. */
	readonly signatures?: readonly StoreSignature[];
}

/**
 * A status line of `index/<id>.ndjson` that revokes a version, e.g. for a security issue. It is a
 * yank, and a host also refuses to run the version unless an admin allows it.
 */
export interface StoreRevoke {
	/** The contract or credential id. */
	readonly id: string;
	/** `major.minor.patch` of the revoked version. */
	readonly revoke: string;
	/** Why the publisher revoked the version. */
	readonly reason: string;
	/** When the publisher revoked the version, as an ISO date. */
	readonly at: string;
	/** The npm registry of a deprecation that the line comes from. Such a line applies to every origin. */
	readonly registry?: string;
	/** Publisher signatures of `storeStatusTextOf` of the line. */
	readonly signatures?: readonly StoreSignature[];
}

/**
 * A status line of `index/<id>.ndjson` that deprecates versions. The versions still get pins
 * and run. A host can show the message.
 */
export interface StoreDeprecation {
	/** The contract or credential id. */
	readonly id: string;
	/** `major`, `major.minor` or `major.minor.patch` of the deprecated versions, e.g. `1`. */
	readonly deprecate: string;
	/** What the user must know, e.g. `Use major 2`. */
	readonly message: string;
	/** The replacement, e.g. `gmail.message.get@2`. */
	readonly use?: string;
	/** When the publisher deprecated the versions, as an ISO date. */
	readonly at: string;
	/** Publisher signatures of `storeStatusTextOf` of the line. */
	readonly signatures?: readonly StoreSignature[];
}

/** A status line of `index/<id>.ndjson`. It never changes a version line: it is a new line. */
export type StoreStatusRecord = StoreYank | StoreRevoke | StoreDeprecation;

/** The lines of one index file. */
export interface StoreIndex {
	/** The version lines, in the order of the index. */
	readonly versions: StoreRecord[];
	/** The status lines, in the order of the index. */
	readonly statuses: StoreStatusRecord[];
}

/** One version that `addToStore` adds. */
export interface StoreVersion {
	/** The exact manifest bytes, see `manifestTextOf`. */
	readonly manifestText: string;
	/** The bundle code. A credential has none. */
	readonly bundle?: string;
	/** The fixtures that publish replayed, as JSON. */
	readonly fixtures?: string;
	/** Publisher signatures of `manifestText`. */
	readonly signatures?: readonly StoreSignature[];
	/** When publish added the version, as an ISO date. */
	readonly published?: string;
}

/** Gives the bytes of a store file by its path in the store, or `undefined` when it is missing. */
export type StoreFiles = (file: string) => Promise<Uint8Array | undefined>;

/** Reads a store. It checks each blob against its digest. */
export interface StoreReader {
	/** The index line of the newest version of each id. Empty when the store has no catalog. */
	catalog(): Promise<StoreRecord[]>;
	/**
	 * Each id that the store has versions of: the ids of the catalog, and the ids whose every
	 * version is yanked or revoked. Empty when the store has no catalog.
	 */
	ids(): Promise<string[]>;
	/** The version lines of one id, in the order of the index. */
	records(id: string): Promise<StoreRecord[]>;
	/** The version lines and the status lines of one id, from one read of its index. */
	index(id: string): Promise<StoreIndex>;
	/**
	 * The manifest of a version line and its exact bytes, or `undefined` when the blob is
	 * missing. It throws when the bytes do not match the digest or the line.
	 */
	readManifest(record: StoreRecord): Promise<
		| {
				/** The manifest bytes, which signatures cover. */
				readonly text: string;
				/** The parsed manifest. */
				readonly manifest: StoreManifest;
		  }
		| undefined
	>;
	/** The bytes of a blob, or `undefined` when it is missing. It throws when they do not match. */
	blob(digest: string): Promise<Buffer | undefined>;
}

/** The file with the index line of the newest version of each id. */
export const STORE_CATALOG_FILE = 'catalog.json';

const ID = /^[\w-]+(\.[\w-]+)*$/;
const DIGEST = /^sha256:([0-9a-f]{64})$/;

/** `index/<id>.ndjson`. The id can come from a workflow, so it must be a plain file name. */
export function storeIndexFileOf(id: string) {
	if (!ID.test(id)) throw new UserError(`${id} is not a contract id`);
	return `index/${id}.ndjson`;
}

/** `blobs/sha256/<hex>` of a `sha256:<hex>` digest. */
export function storeBlobFileOf(digest: string) {
	const hex = DIGEST.exec(digest)?.[1];
	if (!hex) throw new UserError(`${digest} is not a sha256 digest`);
	return `blobs/sha256/${hex}`;
}

const digestOf = (bytes: string | Uint8Array) =>
	`sha256:${createHash('sha256').update(bytes).digest('hex')}`;

/** The manifest bytes that a store holds. The manifest digest covers exactly these bytes. */
export const manifestTextOf = (manifest: StoreManifest) =>
	`${JSON.stringify(manifest, null, '\t')}\n`;

const parseAnyManifest = (text: string): StoreManifest => {
	const value: unknown = JSON.parse(text);
	if (isRecord(value) && value.kind === 'credential') return parseCredentialManifest(text);
	return isRecord(value) && 'native' in value ? parseNativeManifest(text) : parseManifest(text);
};

const sorted = (values: readonly string[] = []) => [...values].sort();

/** The index line fields that follow from a manifest. */
function recordOf(manifest: StoreManifest, digest: string): StoreRecord {
	const { id, semver: version, kind, nodeContract } = manifest;
	const head = { id, version, kind, nodeContract, manifest: digest };
	if (manifest.kind === 'credential') return { ...head, name: manifest.name };
	const { contract, contractHash, credentials } = manifest;
	const pins = credentials ? { credentials } : {};
	// A legacy node runs a native version, so its line has no bundle and no permissions.
	if ('native' in manifest) {
		return { ...head, contractHash, ...pins, native: manifest.native.type };
	}
	return {
		...head,
		bundle: `sha256:${manifest.bundleHash}`,
		contractHash,
		...pins,
		permissions: { egress: sorted(contract.egress?.hosts), imports: sorted(contract.imports) },
	};
}

const DERIVED = [
	'id',
	'version',
	'kind',
	'nodeContract',
	'manifest',
	'bundle',
	'contractHash',
	'credentials',
	'permissions',
	'native',
	'name',
] as const;

const checkedBlob = (bytes: Uint8Array, digest: string) => {
	storeBlobFileOf(digest);
	if (digestOf(bytes) !== digest) {
		throw new UnexpectedError(`The blob ${digest} does not match its digest`);
	}
	return Buffer.from(bytes);
};

/**
 * The manifest of a version line, from the bytes of its blob. It checks the digest, and that the
 * line states what the manifest states.
 */
export function storeManifestOf(bytes: Uint8Array, record: StoreRecord) {
	const text = checkedBlob(bytes, record.manifest).toString('utf8');
	const manifest = parseAnyManifest(text);
	const expected = recordOf(manifest, record.manifest);
	const field = DERIVED.find((key) => canonicalJson(record[key]) !== canonicalJson(expected[key]));
	if (field) {
		throw new UnexpectedError(
			`The index line of ${record.id}@${record.version} does not match its manifest (${field})`,
		);
	}
	return { text, manifest };
}

// `matches` takes `undefined` as a value of any schema.
const isStoreRecord = (value: unknown): value is StoreRecord =>
	isRecord(value) && matches(storeRecordSchema, value);

const parseLine = (line: string): unknown => {
	try {
		return JSON.parse(line);
	} catch {
		return undefined;
	}
};

/**
 * The version lines of one id in an index file. It skips each other line, e.g. a record type
 * of a newer writer, and a later line for a version that it has.
 */
export function parseStoreIndex(text: string, id: string): StoreRecord[] {
	const records = text
		.split('\n')
		.map(parseLine)
		.filter(isStoreRecord)
		.filter((record) => record.id === id);
	return records.filter(
		(record, index) => records.findIndex(({ version }) => version === record.version) === index,
	);
}

/** True for a valid status line. */
export const isStoreStatusRecord = (value: unknown): value is StoreStatusRecord =>
	isRecord(value) && matches(storeStatusRecordSchema, value);

/** The status lines of one id in an index file. It skips each other line. */
function parseStoreStatuses(text: string, id: string): StoreStatusRecord[] {
	return text
		.split('\n')
		.map(parseLine)
		.filter(isStoreStatusRecord)
		.filter((status) => status.id === id);
}

/**
 * The yank or revoke line of a version among status lines, or `undefined`. A revoke comes
 * before a yank.
 */
export function withdrawalOf(
	statuses: readonly StoreStatusRecord[],
	version: string,
): StoreYank | StoreRevoke | undefined {
	return (
		statuses.find(
			(status): status is StoreRevoke => 'revoke' in status && status.revoke === version,
		) ?? statuses.find((status): status is StoreYank => 'yank' in status && status.yank === version)
	);
}

/**
 * The bytes that the signatures of a status line cover: its canonical JSON without
 * `signatures`. A manifest has other bytes (tabs and a final newline), so a signature of one
 * never verifies as the other.
 */
export const storeStatusTextOf = ({ signatures: _, ...status }: StoreStatusRecord) =>
	canonicalJson(status);

/** The index lines of `catalog.json`. */
export function parseStoreCatalog(text: string): StoreRecord[] {
	const value: unknown = JSON.parse(text);
	return (isRecord(value) && Array.isArray(value.versions) ? value.versions : []).filter(
		isStoreRecord,
	);
}

const hasCode = (error: unknown, codes: readonly string[]) =>
	isRecord(error) && typeof error.code === 'string' && codes.includes(error.code);

/** The files of a store directory. */
export const storeFilesOfDir =
	(dir: string): StoreFiles =>
	async (file) => {
		try {
			return await readFile(path.join(dir, file));
		} catch (error) {
			if (hasCode(error, ['ENOENT'])) return undefined;
			throw error;
		}
	};

/** Reads the store whose files `files` gives. */
export function storeReader(files: StoreFiles): StoreReader {
	const text = async (file: string) => {
		const bytes = await files(file);
		return bytes && Buffer.from(bytes).toString('utf8');
	};
	const index = async (id: string): Promise<StoreIndex> => {
		const lines = (await text(storeIndexFileOf(id))) ?? '';
		return { versions: parseStoreIndex(lines, id), statuses: parseStoreStatuses(lines, id) };
	};
	return {
		async catalog() {
			const catalog = await text(STORE_CATALOG_FILE);
			return catalog === undefined ? [] : parseStoreCatalog(catalog);
		},
		async ids() {
			const catalog = await text(STORE_CATALOG_FILE);
			if (catalog === undefined) return [];
			const value: unknown = JSON.parse(catalog);
			const withdrawn =
				isRecord(value) && Array.isArray(value.withdrawn)
					? value.withdrawn.filter((id): id is string => typeof id === 'string')
					: [];
			return [...new Set([...parseStoreCatalog(catalog).map(({ id }) => id), ...withdrawn])];
		},
		async records(id) {
			return (await index(id)).versions;
		},
		index,
		async readManifest(record) {
			const bytes = await files(storeBlobFileOf(record.manifest));
			return bytes && storeManifestOf(bytes, record);
		},
		async blob(digest) {
			const bytes = await files(storeBlobFileOf(digest));
			return bytes && checkedBlob(bytes, digest);
		},
	};
}

const exists = async (file: string) =>
	await access(file).then(
		() => true,
		() => false,
	);

// Some network file systems have no hard links.
const NO_LINK = ['EPERM', 'ENOTSUP', 'ENOSYS'];

const partOf = (file: string) => `${file}.${process.pid}.${randomUUID()}.tmp`;

/** Writes a blob once. A link never replaces a file, and a reader never sees a part of one. */
async function writeBlob(dir: string, bytes: string, digest: string) {
	const file = path.join(dir, storeBlobFileOf(digest));
	if (await exists(file)) return;
	await mkdir(path.dirname(file), { recursive: true });
	const part = partOf(file);
	await writeFile(part, bytes);
	try {
		await link(part, file).catch(async (error: unknown) => {
			if (hasCode(error, ['EEXIST'])) return;
			if (!hasCode(error, NO_LINK)) throw error;
			// The digest names the file, so a rename keeps the same bytes.
			if (!(await exists(file))) await rename(part, file);
		});
	} finally {
		await rm(part, { force: true });
	}
}

const readText = async (file: string) => {
	try {
		return await readFile(file, 'utf8');
	} catch (error) {
		if (hasCode(error, ['ENOENT'])) return '';
		throw error;
	}
};

/**
 * The index line of a version. `manifest` is the digest that the line states. Default: the
 * digest of `manifestText`.
 */
export function storeRecordOf(
	{ manifestText, fixtures, signatures, published }: StoreVersion,
	manifest = digestOf(manifestText),
): StoreRecord {
	return {
		...recordOf(parseAnyManifest(manifestText), manifest),
		...(fixtures === undefined ? {} : { fixtures: digestOf(fixtures) }),
		...(signatures?.length ? { signatures } : {}),
		...(published === undefined ? {} : { published }),
	};
}

async function addVersion(dir: string, version: StoreVersion): Promise<StoreRecord> {
	const { manifestText, bundle, fixtures } = version;
	const record = storeRecordOf(version);
	const at = `${record.id}@${record.version}`;
	if (record.bundle !== (bundle === undefined ? undefined : digestOf(bundle))) {
		throw new UserError(`The bundle of ${at} is missing or does not match its manifest`);
	}
	const index = path.join(dir, storeIndexFileOf(record.id));
	const stored = parseStoreIndex(await readText(index), record.id).find(
		({ version: semver }) => semver === record.version,
	);
	if (stored && stored.manifest !== record.manifest) {
		throw new UserError(`${at} is in the store with other bytes`);
	}
	// The blobs come first, so a reader never sees a line without its blobs.
	await writeBlob(dir, manifestText, record.manifest);
	if (bundle !== undefined && record.bundle) await writeBlob(dir, bundle, record.bundle);
	if (fixtures !== undefined && record.fixtures) await writeBlob(dir, fixtures, record.fixtures);
	if (stored) return stored;
	await mkdir(path.dirname(index), { recursive: true });
	await appendFile(index, `${JSON.stringify(record)}\n`);
	return record;
}

const newest = (records: readonly StoreRecord[]) =>
	records.reduce<StoreRecord | undefined>(
		(best, record) => (best && compareSemver(best.version, record.version) >= 0 ? best : record),
		undefined,
	);

const INDEX_FILE = /^(.+)\.ndjson$/;

/** The catalog line of an id: its newest version that is not yanked or revoked. */
const catalogLineOf = (index: string, id: string) => {
	const statuses = parseStoreStatuses(index, id);
	return newest(
		parseStoreIndex(index, id).filter(({ version }) => !withdrawalOf(statuses, version)),
	);
};

async function writeCatalog(dir: string) {
	const files = await readdir(path.join(dir, 'index')).catch(() => []);
	const ids = files.flatMap((file) => INDEX_FILE.exec(file)?.[1] ?? []).sort();
	const lines = await Promise.all(
		ids.map(async (id) => catalogLineOf(await readText(path.join(dir, storeIndexFileOf(id))), id)),
	);
	const versions = lines.flatMap((line) => (line ? [line] : []));
	// An id whose every version is withdrawn has no line, but an import still needs its index.
	const withdrawn = ids.filter((_, index) => lines[index] === undefined);
	const catalog = { versions, ...(withdrawn.length > 0 ? { withdrawn } : {}) };
	const file = path.join(dir, STORE_CATALOG_FILE);
	const part = partOf(file);
	await writeFile(part, `${JSON.stringify(catalog)}\n`);
	await rename(part, file);
}

/** The pending writes of each store directory. */
const writes = new Map<string, Promise<unknown>>();

/**
 * Adds lines with `add` to the store in `dir`, then writes a new catalog. The writes of one
 * directory run one at a time, so that each catalog lists each id.
 */
async function writeToStore<T, R>(
	dir: string,
	lines: readonly T[],
	add: (dir: string, line: T) => Promise<R>,
): Promise<R[]> {
	const key = path.resolve(dir);
	const added = (writes.get(key) ?? Promise.resolve())
		.catch(() => undefined)
		.then(async () => {
			const records = await lines.reduce<Promise<R[]>>(
				async (done, line) => [...(await done), await add(key, line)],
				Promise.resolve([]),
			);
			await writeCatalog(key);
			return records;
		});
	writes.set(key, added);
	const forget = () => {
		if (writes.get(key) === added) writes.delete(key);
	};
	void added.then(forget, forget);
	return await added;
}

/**
 * Adds versions to the store in `dir`: their blobs, one index line for each, and a new
 * catalog. A stored version keeps its line, and other bytes for it are refused.
 */
export async function addToStore(
	dir: string,
	versions: readonly StoreVersion[],
): Promise<StoreRecord[]> {
	return await writeToStore(dir, versions, addVersion);
}

async function addStatus(dir: string, status: StoreStatusRecord): Promise<StoreStatusRecord> {
	if (!isStoreStatusRecord(status)) {
		throw new UserError(`${JSON.stringify(status)} is not a status line`);
	}
	const index = path.join(dir, storeIndexFileOf(status.id));
	const text = await readText(index);
	const versions = parseStoreIndex(text, status.id);
	const target = 'yank' in status ? status.yank : 'revoke' in status ? status.revoke : undefined;
	if (versions.length === 0) throw new UserError(`The store has no version of ${status.id}`);
	if (target && !versions.some(({ version }) => version === target)) {
		throw new UserError(`The store has no version ${status.id}@${target}`);
	}
	const line = canonicalJson(status);
	if (parseStoreStatuses(text, status.id).some((stored) => canonicalJson(stored) === line)) {
		return status;
	}
	await appendFile(index, `${JSON.stringify(status)}\n`);
	return status;
}

/**
 * Appends status lines to the store in `dir` and writes a new catalog. A yank or revoke needs
 * the version line of its version, and a deprecation needs a version line of its id. A line
 * that the store has is not added again.
 */
export async function addStatusToStore(
	dir: string,
	statuses: readonly StoreStatusRecord[],
): Promise<StoreStatusRecord[]> {
	return await writeToStore(dir, statuses, addStatus);
}

/** The key id of an ed25519 key, private or public: the digest of its public SPKI DER. */
const keyIdOf = (key: string) =>
	digestOf(createPublicKey(key).export({ type: 'spki', format: 'der' }));

/** Signs the manifest bytes of a version with the publisher key (PEM). */
export const signStoreManifest = (manifestText: string, privateKey: string): StoreSignature => ({
	key: keyIdOf(privateKey),
	sig: sign(null, Buffer.from(manifestText), privateKey).toString('base64'),
});

/** Signs a status line with the publisher key (PEM). Add the result to its `signatures`. */
export const signStoreStatus = (status: StoreStatusRecord, privateKey: string) =>
	signStoreManifest(storeStatusTextOf(status), privateKey);

/**
 * True when a signature of the line by `publicKey` (PEM) covers `text`: the manifest bytes of a
 * version line, or `storeStatusTextOf` of a status line.
 */
export function verifyStoreSignature(
	{ signatures = [] }: Pick<StoreRecord, 'signatures'>,
	manifestText: string,
	publicKey: string,
) {
	const key = keyIdOf(publicKey);
	return signatures.some(
		(signature) =>
			signature.key === key &&
			verify(null, Buffer.from(manifestText), publicKey, Buffer.from(signature.sig, 'base64')),
	);
}

/**
 * One source package. The package folder holds one file for each action or trigger in
 * `src/nodes/<node>/actions/`, the fixtures of each action in `fixtures/<id>.json`, and after the
 * build its embedded store. `packPackage` finds the contracts in the action files, and the host
 * reads the embedded store.
 */
export interface SourcePackage {
	/** The package name, e.g. `@n8n/nodes-core`. It is the node type prefix of its contracts. */
	readonly name: string;
	/** The package folder. */
	readonly dir: string;
}

/** The embedded store of a source package: the HEAD of each contract, so that it runs without a registry. */
export const embeddedStoreDirOf = ({ dir }: Pick<SourcePackage, 'dir'>) =>
	path.join(dir, 'dist', 'store');
