import fs from 'node:fs/promises';

export async function assertDir(dir: string) {
	if (dir === '') return;

	try {
		await fs.access(dir);
	} catch {
		await fs.mkdir(dir, { recursive: true });
	}
}

export async function exists(filePath: string) {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
