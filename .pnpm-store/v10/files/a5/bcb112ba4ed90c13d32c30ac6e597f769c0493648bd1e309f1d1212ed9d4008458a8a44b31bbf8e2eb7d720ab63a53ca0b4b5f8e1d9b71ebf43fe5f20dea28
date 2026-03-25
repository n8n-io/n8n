import path from 'node:path';
import process from 'node:process';
import crossSpawn from 'cross-spawn';
import {npmRunPathEnv} from 'npm-run-path';
import {normalizeForceKillAfterDelay} from '../terminate/kill.js';
import {normalizeKillSignal} from '../terminate/signal.js';
import {validateCancelSignal} from '../terminate/cancel.js';
import {validateGracefulCancel} from '../terminate/graceful.js';
import {validateTimeout} from '../terminate/timeout.js';
import {handleNodeOption} from '../methods/node.js';
import {validateIpcInputOption} from '../ipc/ipc-input.js';
import {validateEncoding, BINARY_ENCODINGS} from './encoding-option.js';
import {normalizeCwd} from './cwd.js';
import {normalizeFileUrl} from './file-url.js';
import {normalizeFdSpecificOptions} from './specific.js';

// Normalize the options object, and sometimes also the file paths and arguments.
// Applies default values, validate allowed options, normalize them.
export const normalizeOptions = (filePath, rawArguments, rawOptions) => {
	rawOptions.cwd = normalizeCwd(rawOptions.cwd);
	const [processedFile, processedArguments, processedOptions] = handleNodeOption(filePath, rawArguments, rawOptions);

	const {command: file, args: commandArguments, options: initialOptions} = crossSpawn._parse(processedFile, processedArguments, processedOptions);

	const fdOptions = normalizeFdSpecificOptions(initialOptions);
	const options = addDefaultOptions(fdOptions);
	validateTimeout(options);
	validateEncoding(options);
	validateIpcInputOption(options);
	validateCancelSignal(options);
	validateGracefulCancel(options);
	options.shell = normalizeFileUrl(options.shell);
	options.env = getEnv(options);
	options.killSignal = normalizeKillSignal(options.killSignal);
	options.forceKillAfterDelay = normalizeForceKillAfterDelay(options.forceKillAfterDelay);
	options.lines = options.lines.map((lines, fdNumber) => lines && !BINARY_ENCODINGS.has(options.encoding) && options.buffer[fdNumber]);

	if (process.platform === 'win32' && path.basename(file, '.exe') === 'cmd') {
		// #116
		commandArguments.unshift('/q');
	}

	return {file, commandArguments, options};
};

const addDefaultOptions = ({
	extendEnv = true,
	preferLocal = false,
	cwd,
	localDir: localDirectory = cwd,
	encoding = 'utf8',
	reject = true,
	cleanup = true,
	all = false,
	windowsHide = true,
	killSignal = 'SIGTERM',
	forceKillAfterDelay = true,
	gracefulCancel = false,
	ipcInput,
	ipc = ipcInput !== undefined || gracefulCancel,
	serialization = 'advanced',
	...options
}) => ({
	...options,
	extendEnv,
	preferLocal,
	cwd,
	localDirectory,
	encoding,
	reject,
	cleanup,
	all,
	windowsHide,
	killSignal,
	forceKillAfterDelay,
	gracefulCancel,
	ipcInput,
	ipc,
	serialization,
});

const getEnv = ({env: envOption, extendEnv, preferLocal, node, localDirectory, nodePath}) => {
	const env = extendEnv ? {...process.env, ...envOption} : envOption;

	if (preferLocal || node) {
		return npmRunPathEnv({
			env,
			cwd: localDirectory,
			execPath: nodePath,
			preferLocal,
			addExecPath: node,
		});
	}

	return env;
};
