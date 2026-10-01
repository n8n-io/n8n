/**
 * Packs an installed package directory into an npm tarball, without `pnpm` or `npm`.
 *
 * An n8n Docker image keeps the workspace packages as copies under `node_modules/.pnpm`.
 * The image has no `pnpm`, and the copied `package.json` files keep the `workspace:` and
 * `catalog:` specifiers, which npm cannot install. So this module packs the files itself,
 * and it writes each such specifier as the version that the host has installed.
 */

import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';

const TAR_BLOCK_SIZE = 512;
const TAR_NAME_LENGTH = 100;
const TAR_PREFIX_LENGTH = 155;
// npm writes this time into every entry, so equal files give equal tarballs.
const NPM_MTIME = 499162500;

const DEPENDENCY_FIELDS: readonly string[] = [
	'dependencies',
	'optionalDependencies',
	'peerDependencies',
];
const WORKSPACE_ONLY_SPECIFIER = /^(workspace|catalog):/;

const manifestSchema = z.object({ name: z.string(), version: z.string() }).passthrough();
const dependencyMapSchema = z.record(z.string());

export interface InstalledPackageTarball {
	tarball: Buffer;
	version: string;
	filename: string;
}

/** Directory of an installed package, also for packages that do not export `package.json`. */
export function resolveInstalledPackageDir(require: NodeRequire, name: string): string | null {
	try {
		return path.dirname(require.resolve(`${name}/package.json`));
	} catch {
		for (const base of require.resolve.paths(name) ?? []) {
			const candidate = path.join(base, name, 'package.json');
			try {
				require(candidate);
				return path.dirname(candidate);
			} catch {
				// keep looking
			}
		}
		return null;
	}
}

/** A path under `node_modules` is an installed copy, not a pnpm workspace package. */
export function isInstalledPackageCopy(packagePath: string): boolean {
	return packagePath.split(path.sep).includes('node_modules');
}

function installedVersion(require: NodeRequire, name: string): string | null {
	const dir = resolveInstalledPackageDir(require, name);
	if (!dir) return null;
	const parsed = z
		.object({ version: z.string() })
		.safeParse(require(path.join(dir, 'package.json')));
	return parsed.success ? parsed.data.version : null;
}

/**
 * Replace `workspace:` and `catalog:` specifiers with the installed version. Drop the dev
 * dependencies: npm never installs them for a dependency, and they can hold the same specifiers.
 */
export function toPublishableManifest(
	manifest: z.infer<typeof manifestSchema>,
	require: NodeRequire,
): Record<string, unknown> {
	const publishable: Record<string, unknown> = { ...manifest };
	delete publishable.devDependencies;
	for (const field of DEPENDENCY_FIELDS) {
		const parsed = dependencyMapSchema.safeParse(manifest[field]);
		if (!parsed.success) continue;
		publishable[field] = Object.fromEntries(
			Object.entries(parsed.data).map(([name, specifier]) => [
				name,
				WORKSPACE_ONLY_SPECIFIER.test(specifier)
					? (installedVersion(require, name) ?? '*')
					: specifier,
			]),
		);
	}
	return publishable;
}

async function listPackageFiles(packagePath: string, relativeDir = ''): Promise<string[]> {
	const entries = await readdir(path.join(packagePath, relativeDir), { withFileTypes: true });
	const nested = await Promise.all(
		entries
			// The copy links its own dependencies under `node_modules`. They are not package files.
			.filter((entry) => entry.name !== 'node_modules')
			.map(async (entry) => {
				const relativePath = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
				if (entry.isDirectory()) return await listPackageFiles(packagePath, relativePath);
				return entry.isFile() ? [relativePath] : [];
			}),
	);
	return nested.flat().sort();
}

/** ustar keeps a path longer than 100 bytes as a prefix and a name, split at a slash. */
function splitTarPath(entryPath: string): { name: string; prefix: string } {
	if (Buffer.byteLength(entryPath) <= TAR_NAME_LENGTH) return { name: entryPath, prefix: '' };
	const split = [...entryPath.matchAll(/\//g)]
		.flatMap((match) => (match.index === undefined ? [] : [match.index]))
		.map((index) => ({ prefix: entryPath.slice(0, index), name: entryPath.slice(index + 1) }))
		.find(
			({ prefix, name }) =>
				Buffer.byteLength(prefix) <= TAR_PREFIX_LENGTH &&
				Buffer.byteLength(name) <= TAR_NAME_LENGTH,
		);
	if (!split) throw new Error(`Path is too long for a tar entry: ${entryPath}`);
	return split;
}

function tarEntry(entryPath: string, data: Buffer): Buffer {
	const header = Buffer.alloc(TAR_BLOCK_SIZE);
	const octal = (value: number, length: number) =>
		`${value.toString(8).padStart(length - 1, '0')}\0`;
	const { name, prefix } = splitTarPath(entryPath);
	const fields: ReadonlyArray<readonly [string, number]> = [
		[name, 0],
		['0000644\0', 100],
		['0000000\0', 108],
		['0000000\0', 116],
		[octal(data.length, 12), 124],
		[octal(NPM_MTIME, 12), 136],
		// The checksum counts its own field as spaces.
		['        ', 148],
		['0', 156],
		['ustar\0', 257],
		['00', 263],
		[prefix, 345],
	];
	for (const [text, offset] of fields) header.write(text, offset, 'utf8');
	const checksum = header.reduce((sum, byte) => sum + byte, 0);
	header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 'utf8');
	const padding = Buffer.alloc((TAR_BLOCK_SIZE - (data.length % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE);
	return Buffer.concat([header, data, padding]);
}

/** Pack the files of an installed package the way `npm pack` lays them out (`package/…`). */
export async function packInstalledPackage(packagePath: string): Promise<InstalledPackageTarball> {
	const manifestPath = path.join(packagePath, 'package.json');
	const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')));
	const publishable = toPublishableManifest(manifest, createRequire(manifestPath));
	const files = await listPackageFiles(packagePath);
	const entries = await Promise.all(
		files.map(async (file) =>
			tarEntry(
				`package/${file}`,
				file === 'package.json'
					? Buffer.from(`${JSON.stringify(publishable, null, 2)}\n`)
					: await readFile(path.join(packagePath, file)),
			),
		),
	);
	const tar = Buffer.concat([...entries, Buffer.alloc(TAR_BLOCK_SIZE * 2)]);
	const filename = `${manifest.name.replace(/^@/, '').replace('/', '-')}-${manifest.version}.tgz`;
	return { tarball: gzipSync(tar), version: manifest.version, filename };
}
