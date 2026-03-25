import {debuglog} from 'node:util';
import isPlainObject from 'is-plain-obj';
import {STANDARD_STREAMS_ALIASES} from '../utils/standard-stream.js';

// Some options can have different values for `stdout`/`stderr`/`fd3`.
// This normalizes those to array of values.
// For example, `{verbose: {stdout: 'none', stderr: 'full'}}` becomes `{verbose: ['none', 'none', 'full']}`
export const normalizeFdSpecificOptions = options => {
	const optionsCopy = {...options};

	for (const optionName of FD_SPECIFIC_OPTIONS) {
		optionsCopy[optionName] = normalizeFdSpecificOption(options, optionName);
	}

	return optionsCopy;
};

export const normalizeFdSpecificOption = (options, optionName) => {
	const optionBaseArray = Array.from({length: getStdioLength(options) + 1});
	const optionArray = normalizeFdSpecificValue(options[optionName], optionBaseArray, optionName);
	return addDefaultValue(optionArray, optionName);
};

const getStdioLength = ({stdio}) => Array.isArray(stdio)
	? Math.max(stdio.length, STANDARD_STREAMS_ALIASES.length)
	: STANDARD_STREAMS_ALIASES.length;

const normalizeFdSpecificValue = (optionValue, optionArray, optionName) => isPlainObject(optionValue)
	? normalizeOptionObject(optionValue, optionArray, optionName)
	: optionArray.fill(optionValue);

const normalizeOptionObject = (optionValue, optionArray, optionName) => {
	for (const fdName of Object.keys(optionValue).sort(compareFdName)) {
		for (const fdNumber of parseFdName(fdName, optionName, optionArray)) {
			optionArray[fdNumber] = optionValue[fdName];
		}
	}

	return optionArray;
};

// Ensure priority order when setting both `stdout`/`stderr`, `fd1`/`fd2`, and `all`
const compareFdName = (fdNameA, fdNameB) => getFdNameOrder(fdNameA) < getFdNameOrder(fdNameB) ? 1 : -1;

const getFdNameOrder = fdName => {
	if (fdName === 'stdout' || fdName === 'stderr') {
		return 0;
	}

	return fdName === 'all' ? 2 : 1;
};

const parseFdName = (fdName, optionName, optionArray) => {
	if (fdName === 'ipc') {
		return [optionArray.length - 1];
	}

	const fdNumber = parseFd(fdName);
	if (fdNumber === undefined || fdNumber === 0) {
		throw new TypeError(`"${optionName}.${fdName}" is invalid.
It must be "${optionName}.stdout", "${optionName}.stderr", "${optionName}.all", "${optionName}.ipc", or "${optionName}.fd3", "${optionName}.fd4" (and so on).`);
	}

	if (fdNumber >= optionArray.length) {
		throw new TypeError(`"${optionName}.${fdName}" is invalid: that file descriptor does not exist.
Please set the "stdio" option to ensure that file descriptor exists.`);
	}

	return fdNumber === 'all' ? [1, 2] : [fdNumber];
};

// Use the same syntax for fd-specific options and the `from`/`to` options
export const parseFd = fdName => {
	if (fdName === 'all') {
		return fdName;
	}

	if (STANDARD_STREAMS_ALIASES.includes(fdName)) {
		return STANDARD_STREAMS_ALIASES.indexOf(fdName);
	}

	const regexpResult = FD_REGEXP.exec(fdName);
	if (regexpResult !== null) {
		return Number(regexpResult[1]);
	}
};

const FD_REGEXP = /^fd(\d+)$/;

const addDefaultValue = (optionArray, optionName) => optionArray.map(optionValue => optionValue === undefined
	? DEFAULT_OPTIONS[optionName]
	: optionValue);

// Default value for the `verbose` option
const verboseDefault = debuglog('execa').enabled ? 'full' : 'none';

const DEFAULT_OPTIONS = {
	lines: false,
	buffer: true,
	maxBuffer: 1000 * 1000 * 100,
	verbose: verboseDefault,
	stripFinalNewline: true,
};

// List of options which can have different values for `stdout`/`stderr`
export const FD_SPECIFIC_OPTIONS = ['lines', 'buffer', 'maxBuffer', 'verbose', 'stripFinalNewline'];

// Retrieve fd-specific option
export const getFdSpecificValue = (optionArray, fdNumber) => fdNumber === 'ipc'
	? optionArray.at(-1)
	: optionArray[fdNumber];
