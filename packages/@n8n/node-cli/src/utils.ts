import fs from 'fs/promises';
import path from 'path';

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
