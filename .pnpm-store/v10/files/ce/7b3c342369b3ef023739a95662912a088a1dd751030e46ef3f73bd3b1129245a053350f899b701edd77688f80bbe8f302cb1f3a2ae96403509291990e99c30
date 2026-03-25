import fs from 'node:fs';
import {findUpSync} from 'find-up-simple';

const directoryCache = new Map();
const dataCache = new Map();

/**
Finds the closest package.json file to the given directory and returns its path and contents.

Caches the result for future lookups.

@param dirname {string}
@return {{ path: string, packageJson: Record<string, unknown> } | undefined}
*/
export function readPackageJson(dirname) {
	let packageJsonPath;
	if (directoryCache.has(dirname)) {
		packageJsonPath = directoryCache.get(dirname);
	} else {
		packageJsonPath = findUpSync('package.json', {cwd: dirname, type: 'file'});
		directoryCache.set(dirname, packageJsonPath);
	}

	if (!packageJsonPath) {
		return;
	}

	let packageJson;
	if (dataCache.has(packageJsonPath)) {
		packageJson = dataCache.get(packageJsonPath);
	} else {
		try {
			packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
			dataCache.set(packageJsonPath, packageJson);
		} catch {
			// This can happen if package.json files have comments in them etc.
			return;
		}
	}

	return {path: packageJsonPath, packageJson};
}
