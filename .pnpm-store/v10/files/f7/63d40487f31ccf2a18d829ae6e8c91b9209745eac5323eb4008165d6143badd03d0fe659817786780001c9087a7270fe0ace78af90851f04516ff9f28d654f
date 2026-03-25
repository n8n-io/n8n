import {fileURLToPath} from 'node:url';

// Allow some arguments/options to be either a file path string or a file URL
export const safeNormalizeFileUrl = (file, name) => {
	const fileString = normalizeFileUrl(normalizeDenoExecPath(file));

	if (typeof fileString !== 'string') {
		throw new TypeError(`${name} must be a string or a file URL: ${fileString}.`);
	}

	return fileString;
};

// In Deno node:process execPath is a special object, not just a string:
// https://github.com/denoland/deno/blob/f460188e583f00144000aa0d8ade08218d47c3c1/ext/node/polyfills/process.ts#L344
const normalizeDenoExecPath = file => isDenoExecPath(file)
	? file.toString()
	: file;

export const isDenoExecPath = file => typeof file !== 'string'
	&& file
	&& Object.getPrototypeOf(file) === String.prototype;

// Same but also allows other values, e.g. `boolean` for the `shell` option
export const normalizeFileUrl = file => file instanceof URL ? fileURLToPath(file) : file;
