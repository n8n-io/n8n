/**
 * One npm package for each contract version. The tarball holds `package.json`, `manifest.json`
 * (the exact manifest bytes, so the digest does not change), `bundle.cjs` and `fixtures.json` when
 * the version has them, and `signatures.json` (ed25519 over the manifest bytes).
 */
import { isRecord } from '@n8n/utils/is-record';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { gunzipSync } from 'node:zlib';
import { UserError } from 'n8n-workflow';

import { manifestTextOf, signStoreManifest, type StoreManifest } from './store';
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

/** One frozen version, as publish adds it. */
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

/** The files of the npm package of one version, by file name. */
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
	const packageJson = {
		name: npmNameOf(manifest.id, options.scope),
		version: manifest.semver,
		description: manifest.kind === 'credential' ? manifest.displayName : manifest.contract.summary,
		...options.source,
		// Publish compares `digest` with the manifest, so it needs no tarball for a known version.
		n8n: {
			id: manifest.id,
			kind: manifest.kind,
			digest: npmDigestOf(manifest),
			manifest: 'manifest.json',
			...(bundle === undefined ? {} : { bundle: 'bundle.cjs' }),
		},
	};
	return {
		'package.json': jsonText(packageJson),
		'manifest.json': manifestText,
		...(bundle === undefined ? {} : { 'bundle.cjs': bundle }),
		...(fixtures === undefined ? {} : { 'fixtures.json': jsonText(fixtures) }),
		'signatures.json': jsonText([signStoreManifest(manifestText, options.privateKey)]),
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
}

const stringOf = (value: unknown) => (typeof value === 'string' ? value : undefined);

const authOf = (): Record<string, string> =>
	process.env.NPM_TOKEN ? { authorization: `Bearer ${process.env.NPM_TOKEN}` } : {};

async function fetchOk(url: string, accept: string) {
	const response = await fetch(url, { headers: { accept, ...authOf() } });
	if (!response.ok && response.status !== 404) {
		throw new UserError(`The npm registry returned ${response.status} for ${url}`);
	}
	return response;
}

/** The versions of a package from its packument, or none when the registry does not have it. */
export async function npmVersionsOf(registry: string, name: string): Promise<NpmPublished[]> {
	const response = await fetchOk(`${registry}${name.replace('/', '%2f')}`, 'application/json');
	if (response.status === 404) return [];
	const packument: unknown = await response.json();
	const versions = isRecord(packument) && isRecord(packument.versions) ? packument.versions : {};
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
