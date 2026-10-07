/**
 * One npm package for each contract version. The tarball holds `package.json`, `manifest.json`
 * (the exact manifest bytes, so the digest does not change), `bundle.cjs` and `fixtures.json` when
 * the version has them. The `n8n` field of `package.json` holds the index line of the version,
 * with the ed25519 signatures of the manifest bytes, so a host lists versions from the packument.
 * A package from before that field has `signatures.json` instead.
 */
import { isRecord } from '@n8n/utils/is-record';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { UserError } from 'n8n-workflow';

import {
	manifestTextOf,
	signStoreManifest,
	storeBlobFileOf,
	storeReader,
	storeRecordOf,
	type StoreManifest,
	type StoreReader,
	type StoreRevoke,
	type StoreYank,
} from './store';
import { SDK_RUNTIME_ID } from './manifest';
import { sha256, type ContractFixtures } from './version';

/** The npm scope of contract packages. It is a placeholder of the POC: n8n has not picked the scope. */
export const DEFAULT_NPM_SCOPE = '@n8n-nodes';

/**
 * The npm name of a contract id: the id in lower case, with a hyphen before each capital letter
 * that follows a lower-case letter or a digit, e.g. `httpRequest.get` gives
 * `@n8n-nodes/http-request.get`. Two ids can give one name (`fooBar`, `foo-bar`), so publish
 * refuses a package that holds another id.
 */
export const npmNameOf = (id: string, scope = DEFAULT_NPM_SCOPE) =>
	`${scope}/${id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;

/** The fields of the source `package.json` that each contract package takes. */
export interface NpmSource {
	/** The `license` field, e.g. `LicenseRef-n8n-sustainable-use`. */
	readonly license?: unknown;
	/** The `repository` field. */
	readonly repository?: unknown;
	/** The `author` field. */
	readonly author?: unknown;
}

/** The license, repository and author of the source package in `dir`. */
export async function npmSourceOf(dir: string): Promise<NpmSource> {
	const packageJson: unknown = JSON.parse(await readFile(path.join(dir, 'package.json'), 'utf8'));
	if (!isRecord(packageJson)) return {};
	const { license, repository, author } = packageJson;
	return Object.fromEntries(
		Object.entries({ license, repository, author }).filter(([, value]) => value !== undefined),
	);
}

/** One packed version, as publish adds it. */
export interface NpmVersion {
	/** The manifest. `manifest.json` holds its exact bytes. */
	readonly manifest: StoreManifest;
	/** The bundle code. A credential and a native version have none. */
	readonly bundle?: string;
	/** The fixtures that publish replayed. */
	readonly fixtures?: ContractFixtures;
}

const jsonText = (value: unknown) => `${JSON.stringify(value, null, '\t')}\n`;

/** `sha256:<hex>` of the manifest bytes, as the store and the `n8n.digest` field hold it. */
export const npmDigestOf = (manifest: StoreManifest) =>
	`sha256:${sha256(manifestTextOf(manifest))}`;

const descriptionOf = (manifest: StoreManifest) =>
	manifest.kind === 'credential'
		? manifest.displayName
		: manifest.kind === 'sdk'
			? `The @n8n/node-sdk runtime ${manifest.semver} that contract bundles import`
			: manifest.contract.summary;

/**
 * The files of the npm package of one version, by file name. A version that pins the SDK runtime
 * depends on its exact version.
 */
export function npmPackageOf(
	{ manifest, bundle, fixtures }: NpmVersion,
	options: {
		/** The PEM of the ed25519 publisher key. */
		readonly privateKey: string;
		/** The npm scope. Default: `DEFAULT_NPM_SCOPE`. */
		readonly scope?: string;
		/** The metadata of the source package. */
		readonly source?: NpmSource;
	},
): Record<string, string> {
	const manifestText = manifestTextOf(manifest);
	const fixturesText = fixtures === undefined ? undefined : jsonText(fixtures);
	const sdk = 'sdk' in manifest ? manifest.sdk : undefined;
	const {
		version: _,
		manifest: digest,
		...index
	} = storeRecordOf({
		manifestText,
		fixtures: fixturesText,
		signatures: [signStoreManifest(manifestText, options.privateKey)],
	});
	const packageJson = {
		name: npmNameOf(manifest.id, options.scope),
		version: manifest.semver,
		description: descriptionOf(manifest),
		...options.source,
		...(typeof sdk === 'object'
			? { dependencies: { [npmNameOf(SDK_RUNTIME_ID, options.scope)]: sdk.version } }
			: {}),
		// Publish compares `digest` with the manifest, so it needs no tarball for a known version.
		n8n: { ...index, digest },
	};
	return {
		'package.json': jsonText(packageJson),
		'manifest.json': manifestText,
		...(bundle === undefined ? {} : { 'bundle.cjs': bundle }),
		...(fixturesText === undefined ? {} : { 'fixtures.json': fixturesText }),
	};
}

/**
 * The npm registry of contract packages, with a final slash. During the POC it must be a local
 * registry, e.g. Verdaccio.
 */
export function npmRegistryOf(url: string | undefined): string {
	if (!url) {
		throw new UserError(
			'Set N8N_NODE_CONTRACTS_NPM_REGISTRY to the npm registry, e.g. http://localhost:4873',
		);
	}
	const { hostname, href } = new URL(url);
	// registry.yarnpkg.com serves npmjs.org.
	if (hostname.startsWith('registry.npmjs.') || hostname === 'registry.yarnpkg.com') {
		throw new UserError(
			`Contracts are not published to ${hostname} during the POC. Use a local registry, e.g. Verdaccio`,
		);
	}
	return href.endsWith('/') ? href : `${href}/`;
}

/** One version of a package in the registry. */
export interface NpmPublished {
	/** `major.minor.patch`. */
	readonly version: string;
	/** The contract id of `n8n.id`. A package that publish did not make has none. */
	readonly id?: string;
	/** `sha256:<hex>` of the manifest bytes, from `n8n.digest`. */
	readonly digest?: string;
	/** The tarball URL. */
	readonly tarball?: string;
	/** The message of `npm deprecate`. */
	readonly deprecated?: string;
	/** When the version was published, as an ISO date. */
	readonly published?: string;
	/** The `n8n` field of the package.json. */
	readonly n8n: Readonly<Record<string, unknown>>;
}

/** How a host reads an npm registry. */
export interface NpmReadOptions {
	/** The npm scope of contract packages. Default: `DEFAULT_NPM_SCOPE`. */
	readonly scope?: string;
	/** The bearer token. Default: `NPM_TOKEN`. */
	readonly token?: string;
	/** Reads one URL, e.g. with a timeout. Default: the global `fetch`. */
	readonly fetch?: (
		url: string,
		init: {
			/** The request headers. */
			readonly headers: Record<string, string>;
		},
	) => Promise<Response>;
}

const stringOf = (value: unknown) => (typeof value === 'string' ? value : undefined);

async function fetchOk(
	url: string,
	accept: string,
	{ token = process.env.NPM_TOKEN, fetch: fetchUrl = fetch }: NpmReadOptions = {},
) {
	const auth: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
	const response = await fetchUrl(url, { headers: { accept, ...auth } });
	if (!response.ok && response.status !== 404) {
		throw new UserError(`The npm registry returned ${response.status} for ${url}`);
	}
	return response;
}

/** The versions of a package from its packument, or none when the registry does not have it. */
export async function npmVersionsOf(
	registry: string,
	name: string,
	options?: NpmReadOptions,
): Promise<NpmPublished[]> {
	const response = await fetchOk(
		`${registry}${name.replace('/', '%2f')}`,
		'application/json',
		options,
	);
	if (response.status === 404) return [];
	const packument: unknown = await response.json();
	const versions = isRecord(packument) && isRecord(packument.versions) ? packument.versions : {};
	const time = isRecord(packument) && isRecord(packument.time) ? packument.time : {};
	return Object.entries(versions).flatMap(([version, entry]) => {
		if (!isRecord(entry)) return [];
		const n8n = isRecord(entry.n8n) ? entry.n8n : {};
		const dist = isRecord(entry.dist) ? entry.dist : {};
		return [
			{
				version,
				id: stringOf(n8n.id),
				digest: stringOf(n8n.digest),
				tarball: stringOf(dist.tarball),
				deprecated: stringOf(entry.deprecated),
				published: stringOf(time[version]),
				n8n,
			},
		];
	});
}

/** The text of `package/<file>` in an npm tarball (a gzip tar), or `undefined` when it has none. */
export function npmTarballFile(tgz: Uint8Array, file: string): string | undefined {
	const tar = gunzipSync(tgz);
	const entryAt = (offset: number): string | undefined => {
		// Two zero blocks end the archive.
		if (offset + 512 > tar.length || tar[offset] === 0) return undefined;
		const field = (start: number, length: number) =>
			tar.toString('utf8', offset + start, offset + start + length).replace(/\0.*$/s, '');
		// A ustar header puts the start of a long name in the prefix field.
		const name = [field(345, 155), field(0, 100)].filter(Boolean).join('/');
		const size = parseInt(field(124, 12).trim() || '0', 8);
		const data = offset + 512;
		if (name === `package/${file}`) return tar.toString('utf8', data, data + size);
		return entryAt(data + Math.ceil(size / 512) * 512);
	};
	return entryAt(0);
}

/** The manifest bytes of a published version, from its tarball. It checks them against `n8n.digest`. */
export async function npmManifestTextOf(
	{ version, digest, tarball }: NpmPublished,
	name: string,
): Promise<string> {
	if (!tarball || !digest) throw new UserError(`${name}@${version} has no contract manifest`);
	const response = await fetchOk(tarball, 'application/octet-stream');
	if (!response.ok) throw new UserError(`The npm registry has no tarball of ${name}@${version}`);
	const text = npmTarballFile(new Uint8Array(await response.arrayBuffer()), 'manifest.json');
	if (text === undefined || `sha256:${sha256(text)}` !== digest) {
		throw new UserError(`The manifest of ${name}@${version} does not match its digest`);
	}
	return text;
}

const INDEX_FILE = /^index\/(.+)\.ndjson$/;

const REVOKED = /^revoked:\s*/;

/**
 * The index line of a version from the `n8n` field of its packument entry, or `undefined` when
 * the package is from before that field.
 */
const packumentLineOf = ({ version, published, n8n }: NpmPublished) => {
	if (n8n.nodeContract === undefined) return undefined;
	const { digest: manifest, ...index } = n8n;
	return { ...index, version, manifest, ...(published === undefined ? {} : { published }) };
};

/**
 * The contract packages of an npm registry as a store. The index of an id has one line for each
 * version, from the `n8n` field of the packument, and one status line for each deprecated version.
 * A tarball downloads once, when a blob of its version is read. A package from before the `n8n`
 * index fields downloads its tarball for the index. The reader checks each blob against the
 * digest that the package states.
 */
export function npmStoreReader(registry: string, options: NpmReadOptions = {}): StoreReader {
	/** The blobs of the downloaded tarballs, by store file. */
	const blobs = new Map<string, Buffer>();
	/** The version of each blob file that an index line names, so that a blob read downloads it. */
	const versionsOfBlob = new Map<string, NpmPublished>();
	/** The index line of each version, by tarball URL. A published version never changes. */
	const lines = new Map<string, Promise<string | undefined>>();

	const download = async (tarball: string, digest: string, published?: string) => {
		// The token goes to the registry only, not to a tarball on another host.
		const sameOrigin = new URL(tarball).origin === new URL(registry).origin;
		const response = await fetchOk(
			tarball,
			'application/octet-stream',
			sameOrigin ? options : { ...options, token: '' },
		);
		if (!response.ok) return undefined;
		const tgz = new Uint8Array(await response.arrayBuffer());
		const [manifestText, bundle, fixtures, signatures] = [
			'manifest.json',
			'bundle.cjs',
			'fixtures.json',
			'signatures.json',
		].map((file) => npmTarballFile(tgz, file));
		if (manifestText === undefined) return undefined;
		try {
			const record = storeRecordOf({ manifestText, fixtures, published }, digest);
			const files = [
				[record.manifest, manifestText],
				[record.bundle, bundle],
				[record.fixtures, fixtures],
			];
			files.forEach(([key, text]) => {
				if (key && text !== undefined) blobs.set(storeBlobFileOf(key), Buffer.from(text));
			});
			// The store reader checks the signatures with the schema of an index line.
			const parsed: unknown = JSON.parse(signatures ?? '[]');
			return JSON.stringify({ ...record, signatures: parsed });
		} catch {
			// A version that does not parse is not in the index.
			return undefined;
		}
	};

	const lineOf = async ({ tarball, digest, published }: NpmPublished) => {
		if (!tarball || !digest) return undefined;
		const known = lines.get(tarball);
		if (known) return await known;
		const line = download(tarball, digest, published);
		lines.set(tarball, line);
		return await line.catch((error: unknown) => {
			lines.delete(tarball);
			throw error;
		});
	};

	/** The index line of a version. Only a package from before the `n8n` index fields downloads. */
	const indexLineOf = async (version: NpmPublished) => {
		const line = packumentLineOf(version);
		if (line === undefined) return await lineOf(version);
		try {
			const files = [version.n8n.digest, version.n8n.bundle, version.n8n.fixtures].map((digest) =>
				typeof digest === 'string' ? storeBlobFileOf(digest) : undefined,
			);
			files.forEach((file) => file && versionsOfBlob.set(file, version));
			return JSON.stringify(line);
		} catch {
			// A version with a bad digest is not in the index.
			return undefined;
		}
	};

	const statusOf = (
		id: string,
		{ version, deprecated, published }: NpmPublished,
	): Array<StoreYank | StoreRevoke> => {
		if (!deprecated) return [];
		// npm keeps no date of a deprecation. The publish date keeps the line the same on each read.
		const at = published ?? '';
		const revoked = REVOKED.exec(deprecated);
		return [
			revoked
				? { id, revoke: version, reason: deprecated.slice(revoked[0].length), at, registry }
				: { id, yank: version, reason: deprecated, at, registry },
		];
	};

	return storeReader(async (file) => {
		const id = INDEX_FILE.exec(file)?.[1];
		if (id === undefined) {
			const version = versionsOfBlob.get(file);
			if (!blobs.has(file) && version) await lineOf(version);
			return blobs.get(file);
		}
		const versions = (await npmVersionsOf(registry, npmNameOf(id, options.scope), options)).filter(
			(version) => version.id === id,
		);
		const versionLines = await Promise.all(versions.map(indexLineOf));
		const statusLines = versions.flatMap((version) =>
			statusOf(id, version).map((status) => JSON.stringify(status)),
		);
		return Buffer.from(
			[...versionLines.filter((line) => line !== undefined), ...statusLines].join('\n'),
		);
	});
}

const execFileAsync = promisify(execFile);

/**
 * Runs npm against `registry`, in a temporary folder with `files` in `package/`. The `.npmrc`
 * there reads the token from `NPM_TOKEN`, so the token is never on the command line.
 */
async function runNpm(registry: string, args: readonly string[], files: Record<string, string>) {
	const dir = await mkdtemp(path.join(tmpdir(), 'n8n-npm-'));
	try {
		const { host, pathname } = new URL(registry);
		const npmrc = path.join(dir, '.npmrc');
		await writeFile(
			npmrc,
			process.env.NPM_TOKEN ? `//${host}${pathname}:_authToken=\${NPM_TOKEN}\n` : '',
		);
		await mkdir(path.join(dir, 'package'));
		await Promise.all(
			Object.entries(files).map(
				async ([file, text]) => await writeFile(path.join(dir, 'package', file), text),
			),
		);
		await execFileAsync('npm', [...args, '--registry', registry, '--userconfig', npmrc], {
			cwd: dir,
		});
	} catch (error) {
		const stderr = isRecord(error) ? stringOf(error.stderr) : undefined;
		throw new UserError(`npm ${args.join(' ')} failed: ${stderr ?? String(error)}`);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

/** Publishes the package of `files` (see `npmPackageOf`) with `npm publish`. */
export const npmPublish = async (registry: string, files: Record<string, string>) =>
	await runNpm(registry, ['publish', './package'], files);

/**
 * Deprecates the versions of `spec` (`<name>@<version or range>`) with `npm deprecate`. A host
 * reads a deprecation as a yank, and one whose message starts with `revoked:` as a revoke.
 */
export const npmDeprecate = async (registry: string, spec: string, message: string) =>
	await runNpm(registry, ['deprecate', spec, message], {});
