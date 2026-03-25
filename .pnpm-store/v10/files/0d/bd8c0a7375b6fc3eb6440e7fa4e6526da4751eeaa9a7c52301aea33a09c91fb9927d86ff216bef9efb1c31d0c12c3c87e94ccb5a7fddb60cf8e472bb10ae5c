import {statSync} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {safeNormalizeFileUrl} from './file-url.js';

// Normalize `cwd` option
export const normalizeCwd = (cwd = getDefaultCwd()) => {
	const cwdString = safeNormalizeFileUrl(cwd, 'The "cwd" option');
	return path.resolve(cwdString);
};

const getDefaultCwd = () => {
	try {
		return process.cwd();
	} catch (error) {
		error.message = `The current directory does not exist.\n${error.message}`;
		throw error;
	}
};

// When `cwd` option has an invalid value, provide with a better error message
export const fixCwdError = (originalMessage, cwd) => {
	if (cwd === getDefaultCwd()) {
		return originalMessage;
	}

	let cwdStat;
	try {
		cwdStat = statSync(cwd);
	} catch (error) {
		return `The "cwd" option is invalid: ${cwd}.\n${error.message}\n${originalMessage}`;
	}

	if (!cwdStat.isDirectory()) {
		return `The "cwd" option is not a directory: ${cwd}.\n${originalMessage}`;
	}

	return originalMessage;
};
