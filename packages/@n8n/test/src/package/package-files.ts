import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { list } from 'tar';

export type PackageFiles = (entry: string) => string | undefined;

export function readPackageFiles(packagePath: string): PackageFiles {
	if (statSync(packagePath).isDirectory()) {
		return (entry) => readDirectoryEntry(packagePath, entry);
	}
	const entries = readArchive(packagePath);
	return (entry) => entries.get(entry);
}

function readDirectoryEntry(directory: string, entry: string) {
	const file = path.join(directory, entry);
	return existsSync(file) ? readFileSync(file, 'utf8') : undefined;
}

function readArchive(file: string): Map<string, string> {
	const entries = new Map<string, string>();
	list({
		file,
		sync: true,
		onReadEntry: (entry) => {
			const chunks: Buffer[] = [];
			entry.on('data', (chunk: Buffer) => chunks.push(chunk));
			entry.on('end', () => {
				entries.set(entry.path.replace(/^\.\//, ''), Buffer.concat(chunks).toString('utf8'));
			});
		},
	});
	return entries;
}
