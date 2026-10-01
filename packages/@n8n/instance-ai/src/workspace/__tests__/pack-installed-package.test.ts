import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

import { isInstalledPackageCopy, packInstalledPackage } from '../pack-installed-package';

function readField(header: Buffer, start: number, length: number): string {
	const field = header.subarray(start, start + length);
	const end = field.indexOf(0);
	return field.subarray(0, end === -1 ? field.length : end).toString('utf8');
}

/** Entry path → content. Also checks that every header checksum is valid. */
function readTarGz(archive: Buffer): Map<string, string> {
	const tar = gunzipSync(archive);
	const entries = new Map<string, string>();
	const readFrom = (offset: number): void => {
		if (offset + 512 > tar.length) return;
		const header = tar.subarray(offset, offset + 512);
		if (header.every((byte) => byte === 0)) return;
		const stored = Number.parseInt(readField(header, 148, 8).trim(), 8);
		const computed = Buffer.concat([
			header.subarray(0, 148),
			Buffer.from('        '),
			header.subarray(156),
		]).reduce((sum, byte) => sum + byte, 0);
		expect(stored).toBe(computed);
		expect(readField(header, 257, 6)).toBe('ustar');
		const name = readField(header, 0, 100);
		const prefix = readField(header, 345, 155);
		const size = Number.parseInt(readField(header, 124, 12), 8);
		const data = tar.subarray(offset + 512, offset + 512 + size).toString('utf8');
		entries.set(prefix ? `${prefix}/${name}` : name, data);
		readFrom(offset + 512 + Math.ceil(size / 512) * 512);
	};
	readFrom(0);
	return entries;
}

async function writeJson(file: string, value: unknown): Promise<void> {
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, JSON.stringify(value));
}

describe('packInstalledPackage', () => {
	const fixture = { root: '', packagePath: '' };
	const longFile = `dist/${'nested-directory/'.repeat(5)}a-file-name-that-is-long.js`;

	beforeEach(async () => {
		// Same layout as an n8n Docker image: an injected pnpm copy with linked dependencies.
		fixture.root = await mkdtemp(path.join(tmpdir(), 'pack-installed-'));
		const storeModules = path.join(
			fixture.root,
			'node_modules/.pnpm/@n8n+fake@file+packages/node_modules',
		);
		const packagePath = path.join(storeModules, '@n8n/fake');
		fixture.packagePath = packagePath;
		await writeJson(path.join(packagePath, 'package.json'), {
			name: '@n8n/fake',
			version: '1.2.3',
			exports: { '.': './dist/index.js', './next': './dist/next/index.js' },
			dependencies: {
				'@n8n/constants': 'workspace:*',
				lodash: 'catalog:',
				acorn: '8.14.0',
				'not-installed': 'catalog:',
			},
			peerDependencies: { zod: 'catalog:' },
			devDependencies: { '@n8n/vitest-config': 'workspace:*' },
		});
		await writeJson(path.join(storeModules, '@n8n/constants/package.json'), {
			name: '@n8n/constants',
			version: '0.40.0',
		});
		await writeJson(path.join(packagePath, 'node_modules/lodash/package.json'), {
			name: 'lodash',
			version: '4.17.21',
		});
		await writeJson(path.join(packagePath, 'node_modules/zod/package.json'), {
			name: 'zod',
			version: '3.25.67',
		});
		await mkdir(path.join(packagePath, 'dist/next'), { recursive: true });
		await mkdir(path.dirname(path.join(packagePath, longFile)), { recursive: true });
		await writeFile(path.join(packagePath, 'dist/index.js'), 'export {};\n');
		await writeFile(path.join(packagePath, 'dist/next/index.js'), 'export const next = 1;\n');
		await writeFile(path.join(packagePath, longFile), 'long\n');
		await writeFile(path.join(packagePath, 'README.md'), '# fake\n');
	});

	afterEach(async () => {
		await rm(fixture.root, { recursive: true, force: true });
	});

	it('packs the package files under package/ and skips the linked node_modules', async () => {
		const packed = await packInstalledPackage(fixture.packagePath);

		expect(packed.filename).toBe('n8n-fake-1.2.3.tgz');
		expect(packed.version).toBe('1.2.3');
		const entries = readTarGz(packed.tarball);
		expect([...entries.keys()]).toEqual([
			'package/README.md',
			'package/dist/index.js',
			`package/${longFile}`,
			'package/dist/next/index.js',
			'package/package.json',
		]);
		expect(entries.get('package/dist/next/index.js')).toBe('export const next = 1;\n');
		expect(entries.get(`package/${longFile}`)).toBe('long\n');
	});

	it('writes workspace and catalog specifiers as the installed versions', async () => {
		const entries = readTarGz((await packInstalledPackage(fixture.packagePath)).tarball);
		const manifest: unknown = JSON.parse(entries.get('package/package.json') ?? '{}');

		expect(manifest).toEqual({
			name: '@n8n/fake',
			version: '1.2.3',
			exports: { '.': './dist/index.js', './next': './dist/next/index.js' },
			dependencies: {
				'@n8n/constants': '0.40.0',
				lodash: '4.17.21',
				acorn: '8.14.0',
				'not-installed': '*',
			},
			peerDependencies: { zod: '3.25.67' },
		});
	});

	it('gives equal tarballs for equal files', async () => {
		const first = await packInstalledPackage(fixture.packagePath);
		const second = await packInstalledPackage(fixture.packagePath);

		expect(first.tarball.equals(second.tarball)).toBe(true);
	});
});

describe('isInstalledPackageCopy', () => {
	it('treats a path under node_modules as an installed copy', () => {
		expect(
			isInstalledPackageCopy(
				path.join('/usr/local/lib/node_modules/n8n/node_modules/.pnpm/x/node_modules/@n8n/x'),
			),
		).toBe(true);
	});

	it('treats a workspace package directory as a pnpm workspace package', () => {
		expect(isInstalledPackageCopy(path.join('/repo/packages/@n8n/workflow-sdk'))).toBe(false);
	});
});
