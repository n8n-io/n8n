import fs, {promises as fsPromises} from 'node:fs';

export async function pathExists(path) {
	try {
		await fsPromises.access(path);
		return true;
	} catch {
		return false;
	}
}

export function pathExistsSync(path) {
	try {
		fs.accessSync(path);
		return true;
	} catch {
		return false;
	}
}
