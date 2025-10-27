import { camelCase } from 'change-case';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function folderExists(dir: string) {
	try {
		const stat = await fs.stat(dir);
		return stat.isDirectory();
	} catch (error: unknown) {
		return false;
	}
}

export async function copyFolder({
	source: source,
	destination,
	ignore = [],
}: { source: string; destination: string; ignore?: string[] }): Promise<void> {
	const ignoreSet = new Set(ignore);

	async function walkAndCopy(currentSrc: string, currentDest: string): Promise<void> {
		const entries = await fs.readdir(currentSrc, { withFileTypes: true });

		await Promise.all(
			entries.map(async (entry) => {
				if (ignoreSet.has(entry.name)) return;

				const srcPath = path.join(currentSrc, entry.name);
				const destPath = path.join(currentDest, entry.name);

				if (entry.isDirectory()) {
					await fs.mkdir(destPath, { recursive: true });
					await walkAndCopy(srcPath, destPath);
				} else {
					await fs.copyFile(srcPath, destPath);
				}
			}),
		);
	}

	await fs.mkdir(destination, { recursive: true });
	await walkAndCopy(source, destination);
}

export async function delayAtLeast<T>(promise: Promise<T>, minMs: number): Promise<T> {
	const delayPromise = new Promise((res) => setTimeout(res, minMs));
	const [result] = await Promise.all([promise, delayPromise]);
	return result;
}

export async function writeFileSafe(
	filePath: string,
	contents: string | Uint8Array,
): Promise<void> {
	await fs.mkdir(path.dirname(filePath), { recursive: true });
	await fs.writeFile(filePath, contents);
}

export async function ensureFolder(dir: string) {
	return await fs.mkdir(dir, { recursive: true });
}

export async function renameFilesInDirectory(
	dirPath: string,
	oldName: string,
	newName: string,
): Promise<void> {
	const files = await fs.readdir(dirPath);

	for (const file of files) {
		const oldPath = path.resolve(dirPath, file);
		const oldFileName = path.basename(oldPath);
		const newFileName = oldFileName
			.replace(oldName, newName)
			.replace(camelCase(oldName), camelCase(newName));

		if (newFileName !== oldFileName) {
			const newPath = path.resolve(dirPath, newFileName);
			await fs.rename(oldPath, newPath);
		}
	}
}

export async function renameDirectory(oldDirPath: string, newDirName: string): Promise<string> {
	const parentDir = path.dirname(oldDirPath);
	const newDirPath = path.resolve(parentDir, newDirName);
	await fs.rename(oldDirPath, newDirPath);
	return newDirPath;
}
