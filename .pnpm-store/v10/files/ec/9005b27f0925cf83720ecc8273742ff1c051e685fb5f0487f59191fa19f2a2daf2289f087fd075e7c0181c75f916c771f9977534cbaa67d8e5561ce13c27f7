import process from 'node:process';
import path from 'node:path';
import pathKey from 'path-key';
import {toPath, traversePathUp} from 'unicorn-magic';

export const npmRunPath = ({
	cwd = process.cwd(),
	path: pathOption = process.env[pathKey()],
	preferLocal = true,
	execPath = process.execPath,
	addExecPath = true,
} = {}) => {
	const cwdPath = path.resolve(toPath(cwd));
	const result = [];
	const pathParts = pathOption.split(path.delimiter);

	if (preferLocal) {
		applyPreferLocal(result, pathParts, cwdPath);
	}

	if (addExecPath) {
		applyExecPath(result, pathParts, execPath, cwdPath);
	}

	return pathOption === '' || pathOption === path.delimiter
		? `${result.join(path.delimiter)}${pathOption}`
		: [...result, pathOption].join(path.delimiter);
};

const applyPreferLocal = (result, pathParts, cwdPath) => {
	for (const directory of traversePathUp(cwdPath)) {
		const pathPart = path.join(directory, 'node_modules/.bin');
		if (!pathParts.includes(pathPart)) {
			result.push(pathPart);
		}
	}
};

// Ensure the running `node` binary is used
const applyExecPath = (result, pathParts, execPath, cwdPath) => {
	const pathPart = path.resolve(cwdPath, toPath(execPath), '..');
	if (!pathParts.includes(pathPart)) {
		result.push(pathPart);
	}
};

export const npmRunPathEnv = ({env = process.env, ...options} = {}) => {
	env = {...env};

	const pathName = pathKey({env});
	options.path = env[pathName];
	env[pathName] = npmRunPath(options);

	return env;
};
