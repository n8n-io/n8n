import type { PackageManifest } from '@n8n/api-types';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { create } from 'tar';

export const SALES_PACKAGE = path.join(__dirname, '../fixtures/packages/sales');

const directories = new Set<string>();

afterEach(() => {
	for (const directory of directories) rmSync(directory, { recursive: true });
	directories.clear();
});

export function copySalesPackage(edit: (manifest: PackageManifest) => void): string {
	const temporary = mkdtempSync(path.join(tmpdir(), 'n8n-test-package-'));
	directories.add(temporary);
	const directory = path.join(temporary, 'sales');
	cpSync(SALES_PACKAGE, directory, { recursive: true });
	const manifestFile = path.join(directory, 'manifest.json');
	const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as PackageManifest;
	edit(manifest);
	writeFileSync(manifestFile, JSON.stringify(manifest));
	return directory;
}

export function packArchive(directory: string): string {
	const temporary = mkdtempSync(path.join(tmpdir(), 'n8n-test-archive-'));
	directories.add(temporary);
	const file = path.join(temporary, 'sales.n8np');
	const entries = readdirSync(directory).filter((entry) => entry !== 'manifest.json');
	create({ gzip: true, file, cwd: directory, sync: true, portable: true }, [
		'manifest.json',
		...entries,
	]);
	return file;
}
