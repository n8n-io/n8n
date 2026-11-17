import type { PackageManifest } from '@n8n/api-types';
import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { create } from 'tar';

export const SALES_PACKAGE = path.join(__dirname, '../fixtures/packages/sales');

export function copySalesPackage(edit: (manifest: PackageManifest) => void): string {
	const directory = path.join(mkdtempSync(path.join(tmpdir(), 'n8n-test-package-')), 'sales');
	cpSync(SALES_PACKAGE, directory, { recursive: true });
	const manifestFile = path.join(directory, 'manifest.json');
	const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as PackageManifest;
	edit(manifest);
	writeFileSync(manifestFile, JSON.stringify(manifest));
	return directory;
}

export function packArchive(directory: string): string {
	const file = path.join(mkdtempSync(path.join(tmpdir(), 'n8n-test-archive-')), 'sales.n8np');
	const entries = readdirSync(directory).filter((entry) => entry !== 'manifest.json');
	create({ gzip: true, file, cwd: directory, sync: true, portable: true }, [
		'manifest.json',
		...entries,
	]);
	return file;
}
