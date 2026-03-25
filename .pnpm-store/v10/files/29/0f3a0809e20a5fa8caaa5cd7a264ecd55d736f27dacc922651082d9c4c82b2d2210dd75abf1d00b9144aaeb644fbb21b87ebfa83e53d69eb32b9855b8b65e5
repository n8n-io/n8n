import {parseFd} from './specific.js';

// Retrieve stream targeted by the `to` option
export const getToStream = (destination, to = 'stdin') => {
	const isWritable = true;
	const {options, fileDescriptors} = SUBPROCESS_OPTIONS.get(destination);
	const fdNumber = getFdNumber(fileDescriptors, to, isWritable);
	const destinationStream = destination.stdio[fdNumber];

	if (destinationStream === null) {
		throw new TypeError(getInvalidStdioOptionMessage(fdNumber, to, options, isWritable));
	}

	return destinationStream;
};

// Retrieve stream targeted by the `from` option
export const getFromStream = (source, from = 'stdout') => {
	const isWritable = false;
	const {options, fileDescriptors} = SUBPROCESS_OPTIONS.get(source);
	const fdNumber = getFdNumber(fileDescriptors, from, isWritable);
	const sourceStream = fdNumber === 'all' ? source.all : source.stdio[fdNumber];

	if (sourceStream === null || sourceStream === undefined) {
		throw new TypeError(getInvalidStdioOptionMessage(fdNumber, from, options, isWritable));
	}

	return sourceStream;
};

// Keeps track of the options passed to each Execa call
export const SUBPROCESS_OPTIONS = new WeakMap();

const getFdNumber = (fileDescriptors, fdName, isWritable) => {
	const fdNumber = parseFdNumber(fdName, isWritable);
	validateFdNumber(fdNumber, fdName, isWritable, fileDescriptors);
	return fdNumber;
};

const parseFdNumber = (fdName, isWritable) => {
	const fdNumber = parseFd(fdName);
	if (fdNumber !== undefined) {
		return fdNumber;
	}

	const {validOptions, defaultValue} = isWritable
		? {validOptions: '"stdin"', defaultValue: 'stdin'}
		: {validOptions: '"stdout", "stderr", "all"', defaultValue: 'stdout'};
	throw new TypeError(`"${getOptionName(isWritable)}" must not be "${fdName}".
It must be ${validOptions} or "fd3", "fd4" (and so on).
It is optional and defaults to "${defaultValue}".`);
};

const validateFdNumber = (fdNumber, fdName, isWritable, fileDescriptors) => {
	const fileDescriptor = fileDescriptors[getUsedDescriptor(fdNumber)];
	if (fileDescriptor === undefined) {
		throw new TypeError(`"${getOptionName(isWritable)}" must not be ${fdName}. That file descriptor does not exist.
Please set the "stdio" option to ensure that file descriptor exists.`);
	}

	if (fileDescriptor.direction === 'input' && !isWritable) {
		throw new TypeError(`"${getOptionName(isWritable)}" must not be ${fdName}. It must be a readable stream, not writable.`);
	}

	if (fileDescriptor.direction !== 'input' && isWritable) {
		throw new TypeError(`"${getOptionName(isWritable)}" must not be ${fdName}. It must be a writable stream, not readable.`);
	}
};

const getInvalidStdioOptionMessage = (fdNumber, fdName, options, isWritable) => {
	if (fdNumber === 'all' && !options.all) {
		return 'The "all" option must be true to use "from: \'all\'".';
	}

	const {optionName, optionValue} = getInvalidStdioOption(fdNumber, options);
	return `The "${optionName}: ${serializeOptionValue(optionValue)}" option is incompatible with using "${getOptionName(isWritable)}: ${serializeOptionValue(fdName)}".
Please set this option with "pipe" instead.`;
};

const getInvalidStdioOption = (fdNumber, {stdin, stdout, stderr, stdio}) => {
	const usedDescriptor = getUsedDescriptor(fdNumber);

	if (usedDescriptor === 0 && stdin !== undefined) {
		return {optionName: 'stdin', optionValue: stdin};
	}

	if (usedDescriptor === 1 && stdout !== undefined) {
		return {optionName: 'stdout', optionValue: stdout};
	}

	if (usedDescriptor === 2 && stderr !== undefined) {
		return {optionName: 'stderr', optionValue: stderr};
	}

	return {optionName: `stdio[${usedDescriptor}]`, optionValue: stdio[usedDescriptor]};
};

const getUsedDescriptor = fdNumber => fdNumber === 'all' ? 1 : fdNumber;

const getOptionName = isWritable => isWritable ? 'to' : 'from';

export const serializeOptionValue = value => {
	if (typeof value === 'string') {
		return `'${value}'`;
	}

	return typeof value === 'number' ? `${value}` : 'Stream';
};
