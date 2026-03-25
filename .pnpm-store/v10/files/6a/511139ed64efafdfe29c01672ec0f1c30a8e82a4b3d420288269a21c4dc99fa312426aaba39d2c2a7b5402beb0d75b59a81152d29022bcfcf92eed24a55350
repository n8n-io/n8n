import {promisify} from 'node:util';
import {execFile as execFileCallback, execFileSync as execFileSyncOriginal} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const execFileOriginal = promisify(execFileCallback);

export function toPath(urlOrPath) {
	return urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;
}

export function rootDirectory(pathInput) {
	return path.parse(toPath(pathInput)).root;
}

export function traversePathUp(startPath) {
	return {
		* [Symbol.iterator]() {
			let currentPath = path.resolve(toPath(startPath));
			let previousPath;

			while (previousPath !== currentPath) {
				yield currentPath;
				previousPath = currentPath;
				currentPath = path.resolve(currentPath, '..');
			}
		},
	};
}

const TEN_MEGABYTES_IN_BYTES = 10 * 1024 * 1024;

export async function execFile(file, arguments_, options = {}) {
	return execFileOriginal(file, arguments_, {
		maxBuffer: TEN_MEGABYTES_IN_BYTES,
		...options,
	});
}

export function execFileSync(file, arguments_ = [], options = {}) {
	return execFileSyncOriginal(file, arguments_, {
		maxBuffer: TEN_MEGABYTES_IN_BYTES,
		encoding: 'utf8',
		stdio: 'pipe',
		...options,
	});
}

export * from './default.js';
