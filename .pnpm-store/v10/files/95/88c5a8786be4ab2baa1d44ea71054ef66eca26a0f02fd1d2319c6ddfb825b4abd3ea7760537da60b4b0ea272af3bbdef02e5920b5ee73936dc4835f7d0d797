import {readFileSync} from 'node:fs';
import {bufferToUint8Array} from '../utils/uint-array.js';
import {handleStdio} from './handle.js';
import {TYPE_TO_MESSAGE} from './type.js';

// Normalize `input`, `inputFile`, `stdin`, `stdout` and `stderr` options, before spawning, in sync mode
export const handleStdioSync = (options, verboseInfo) => handleStdio(addPropertiesSync, options, verboseInfo, true);

const forbiddenIfSync = ({type, optionName}) => {
	throwInvalidSyncValue(optionName, TYPE_TO_MESSAGE[type]);
};

const forbiddenNativeIfSync = ({optionName, value}) => {
	if (value === 'ipc' || value === 'overlapped') {
		throwInvalidSyncValue(optionName, `"${value}"`);
	}

	return {};
};

const throwInvalidSyncValue = (optionName, value) => {
	throw new TypeError(`The \`${optionName}\` option cannot be ${value} with synchronous methods.`);
};

// Create streams used internally for redirecting when using specific values for the `std*` options, in sync mode.
// For example, `stdin: {file}` reads the file synchronously, then passes it as the `input` option.
const addProperties = {
	generator() {},
	asyncGenerator: forbiddenIfSync,
	webStream: forbiddenIfSync,
	nodeStream: forbiddenIfSync,
	webTransform: forbiddenIfSync,
	duplex: forbiddenIfSync,
	asyncIterable: forbiddenIfSync,
	native: forbiddenNativeIfSync,
};

const addPropertiesSync = {
	input: {
		...addProperties,
		fileUrl: ({value}) => ({contents: [bufferToUint8Array(readFileSync(value))]}),
		filePath: ({value: {file}}) => ({contents: [bufferToUint8Array(readFileSync(file))]}),
		fileNumber: forbiddenIfSync,
		iterable: ({value}) => ({contents: [...value]}),
		string: ({value}) => ({contents: [value]}),
		uint8Array: ({value}) => ({contents: [value]}),
	},
	output: {
		...addProperties,
		fileUrl: ({value}) => ({path: value}),
		filePath: ({value: {file, append}}) => ({path: file, append}),
		fileNumber: ({value}) => ({path: value}),
		iterable: forbiddenIfSync,
		string: forbiddenIfSync,
		uint8Array: forbiddenIfSync,
	},
};
