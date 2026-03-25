import isPlainObject from 'is-plain-obj';
import {safeNormalizeFileUrl} from '../arguments/file-url.js';

// The command `arguments` and `options` are both optional.
// This also does basic validation on them and on the command file.
export const normalizeParameters = (rawFile, rawArguments = [], rawOptions = {}) => {
	const filePath = safeNormalizeFileUrl(rawFile, 'First argument');
	const [commandArguments, options] = isPlainObject(rawArguments)
		? [[], rawArguments]
		: [rawArguments, rawOptions];

	if (!Array.isArray(commandArguments)) {
		throw new TypeError(`Second argument must be either an array of arguments or an options object: ${commandArguments}`);
	}

	if (commandArguments.some(commandArgument => typeof commandArgument === 'object' && commandArgument !== null)) {
		throw new TypeError(`Second argument must be an array of strings: ${commandArguments}`);
	}

	const normalizedArguments = commandArguments.map(String);
	const nullByteArgument = normalizedArguments.find(normalizedArgument => normalizedArgument.includes('\0'));
	if (nullByteArgument !== undefined) {
		throw new TypeError(`Arguments cannot contain null bytes ("\\0"): ${nullByteArgument}`);
	}

	if (!isPlainObject(options)) {
		throw new TypeError(`Last argument must be an options object: ${options}`);
	}

	return [filePath, normalizedArguments, options];
};
