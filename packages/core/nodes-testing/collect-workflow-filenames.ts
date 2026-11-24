import { readdirSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

function isMissingPathError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null || !('code' in error)) {
		return false;
	}

	return error.code === 'ENOENT' || error.code === 'ENOTDIR';
}

export function collectWorkflowFilenames(testDir: string, packageDir: string): string[] {
	const results: string[] = [];
	let realTestDir = testDir;
	try {
		realTestDir = realpathSync(testDir);
	} catch (error: unknown) {
		if (isMissingPathError(error)) return results;
		throw error;
	}
	const ancestorRealDirs = new Set<string>([realTestDir]);

	const walk = (dir: string, realDir: string) => {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch (error: unknown) {
			if (isMissingPathError(error)) return;
			throw error;
		}

		for (const entry of entries) {
			if (entry.name.startsWith('.')) continue;

			const fullPath = path.join(dir, entry.name);
			let isDir = entry.isDirectory();
			let isFile = entry.isFile();
			if (entry.isSymbolicLink()) {
				try {
					const stats = statSync(fullPath);
					isDir = stats.isDirectory();
					isFile = stats.isFile();
				} catch {
					continue;
				}
			}

			if (isDir) {
				let nextRealDir = path.join(realDir, entry.name);
				if (entry.isSymbolicLink()) {
					try {
						nextRealDir = realpathSync(fullPath);
					} catch {
						continue;
					}
				}
				if (ancestorRealDirs.has(nextRealDir)) continue;
				ancestorRealDirs.add(nextRealDir);
				try {
					walk(fullPath, nextRealDir);
				} finally {
					ancestorRealDirs.delete(nextRealDir);
				}
			} else if (isFile && entry.name.endsWith('.json')) {
				results.push(path.relative(packageDir, fullPath).split(path.sep).join('/'));
			}
		}
	};

	walk(testDir, realTestDir);
	return results;
}
