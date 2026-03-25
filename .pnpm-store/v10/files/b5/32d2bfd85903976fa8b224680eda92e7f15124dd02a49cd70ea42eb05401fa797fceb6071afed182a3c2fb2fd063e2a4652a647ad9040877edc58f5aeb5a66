import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {locatePath, locatePathSync} from 'locate-path';

const toPath = urlOrPath => urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;

export const findUpStop = Symbol('findUpStop');

export async function findUpMultiple(name, options = {}) {
	let directory = path.resolve(toPath(options.cwd) || '');
	const {root} = path.parse(directory);
	const stopAt = path.resolve(directory, options.stopAt || root);
	const limit = options.limit || Number.POSITIVE_INFINITY;
	const paths = [name].flat();

	const runMatcher = async locateOptions => {
		if (typeof name !== 'function') {
			return locatePath(paths, locateOptions);
		}

		const foundPath = await name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePath([foundPath], locateOptions);
		}

		return foundPath;
	};

	const matches = [];
	// eslint-disable-next-line no-constant-condition
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const foundPath = await runMatcher({...options, cwd: directory});

		if (foundPath === findUpStop) {
			break;
		}

		if (foundPath) {
			matches.push(path.resolve(directory, foundPath));
		}

		if (directory === stopAt || matches.length >= limit) {
			break;
		}

		directory = path.dirname(directory);
	}

	return matches;
}

export function findUpMultipleSync(name, options = {}) {
	let directory = path.resolve(toPath(options.cwd) || '');
	const {root} = path.parse(directory);
	const stopAt = options.stopAt || root;
	const limit = options.limit || Number.POSITIVE_INFINITY;
	const paths = [name].flat();

	const runMatcher = locateOptions => {
		if (typeof name !== 'function') {
			return locatePathSync(paths, locateOptions);
		}

		const foundPath = name(locateOptions.cwd);
		if (typeof foundPath === 'string') {
			return locatePathSync([foundPath], locateOptions);
		}

		return foundPath;
	};

	const matches = [];
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const foundPath = runMatcher({...options, cwd: directory});

		if (foundPath === findUpStop) {
			break;
		}

		if (foundPath) {
			matches.push(path.resolve(directory, foundPath));
		}

		if (directory === stopAt || matches.length >= limit) {
			break;
		}

		directory = path.dirname(directory);
	}

	return matches;
}

export async function findUp(name, options = {}) {
	const matches = await findUpMultiple(name, {...options, limit: 1});
	return matches[0];
}

export function findUpSync(name, options = {}) {
	const matches = findUpMultipleSync(name, {...options, limit: 1});
	return matches[0];
}

export {
	pathExists,
	pathExistsSync,
} from 'path-exists';
