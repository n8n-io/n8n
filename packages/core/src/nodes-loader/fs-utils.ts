import type { Dirent } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

function isMissingPathError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null || !('code' in error)) {
		return false;
	}

	return error.code === 'ENOENT' || error.code === 'ENOTDIR';
}

export async function readDirectoryEntries(dir: string): Promise<Dirent[]> {
	try {
		return await readdir(dir, { withFileTypes: true });
	} catch (error: unknown) {
		if (isMissingPathError(error)) return [];
		throw error;
	}
}

export async function isDirectoryEntry(dir: string, entry: Dirent): Promise<boolean> {
	if (entry.isDirectory()) return true;
	if (!entry.isSymbolicLink()) return false;

	try {
		return (await stat(path.join(dir, entry.name))).isDirectory();
	} catch {
		return false;
	}
}

export async function isFileEntry(dir: string, entry: Dirent): Promise<boolean> {
	if (entry.isFile()) return true;
	if (!entry.isSymbolicLink()) return false;

	try {
		return (await stat(path.join(dir, entry.name))).isFile();
	} catch {
		return false;
	}
}

export async function isFilePath(filePath: string): Promise<boolean> {
	try {
		return (await stat(filePath)).isFile();
	} catch {
		return false;
	}
}
