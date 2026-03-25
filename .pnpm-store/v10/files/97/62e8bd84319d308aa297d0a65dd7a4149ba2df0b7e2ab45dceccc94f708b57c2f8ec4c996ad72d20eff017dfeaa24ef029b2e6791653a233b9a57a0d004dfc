import {isStream as isNodeStream, isDuplexStream} from 'is-stream';
import isPlainObj from 'is-plain-obj';
import {isUint8Array} from '../utils/uint-array.js';

// The `stdin`/`stdout`/`stderr` option can be of many types. This detects it.
export const getStdioItemType = (value, optionName) => {
	if (isAsyncGenerator(value)) {
		return 'asyncGenerator';
	}

	if (isSyncGenerator(value)) {
		return 'generator';
	}

	if (isUrl(value)) {
		return 'fileUrl';
	}

	if (isFilePathObject(value)) {
		return 'filePath';
	}

	if (isWebStream(value)) {
		return 'webStream';
	}

	if (isNodeStream(value, {checkOpen: false})) {
		return 'native';
	}

	if (isUint8Array(value)) {
		return 'uint8Array';
	}

	if (isAsyncIterableObject(value)) {
		return 'asyncIterable';
	}

	if (isIterableObject(value)) {
		return 'iterable';
	}

	if (isTransformStream(value)) {
		return getTransformStreamType({transform: value}, optionName);
	}

	if (isTransformOptions(value)) {
		return getTransformObjectType(value, optionName);
	}

	return 'native';
};

const getTransformObjectType = (value, optionName) => {
	if (isDuplexStream(value.transform, {checkOpen: false})) {
		return getDuplexType(value, optionName);
	}

	if (isTransformStream(value.transform)) {
		return getTransformStreamType(value, optionName);
	}

	return getGeneratorObjectType(value, optionName);
};

const getDuplexType = (value, optionName) => {
	validateNonGeneratorType(value, optionName, 'Duplex stream');
	return 'duplex';
};

const getTransformStreamType = (value, optionName) => {
	validateNonGeneratorType(value, optionName, 'web TransformStream');
	return 'webTransform';
};

const validateNonGeneratorType = ({final, binary, objectMode}, optionName, typeName) => {
	checkUndefinedOption(final, `${optionName}.final`, typeName);
	checkUndefinedOption(binary, `${optionName}.binary`, typeName);
	checkBooleanOption(objectMode, `${optionName}.objectMode`);
};

const checkUndefinedOption = (value, optionName, typeName) => {
	if (value !== undefined) {
		throw new TypeError(`The \`${optionName}\` option can only be defined when using a generator, not a ${typeName}.`);
	}
};

const getGeneratorObjectType = ({transform, final, binary, objectMode}, optionName) => {
	if (transform !== undefined && !isGenerator(transform)) {
		throw new TypeError(`The \`${optionName}.transform\` option must be a generator, a Duplex stream or a web TransformStream.`);
	}

	if (isDuplexStream(final, {checkOpen: false})) {
		throw new TypeError(`The \`${optionName}.final\` option must not be a Duplex stream.`);
	}

	if (isTransformStream(final)) {
		throw new TypeError(`The \`${optionName}.final\` option must not be a web TransformStream.`);
	}

	if (final !== undefined && !isGenerator(final)) {
		throw new TypeError(`The \`${optionName}.final\` option must be a generator.`);
	}

	checkBooleanOption(binary, `${optionName}.binary`);
	checkBooleanOption(objectMode, `${optionName}.objectMode`);

	return isAsyncGenerator(transform) || isAsyncGenerator(final) ? 'asyncGenerator' : 'generator';
};

const checkBooleanOption = (value, optionName) => {
	if (value !== undefined && typeof value !== 'boolean') {
		throw new TypeError(`The \`${optionName}\` option must use a boolean.`);
	}
};

const isGenerator = value => isAsyncGenerator(value) || isSyncGenerator(value);
export const isAsyncGenerator = value => Object.prototype.toString.call(value) === '[object AsyncGeneratorFunction]';
const isSyncGenerator = value => Object.prototype.toString.call(value) === '[object GeneratorFunction]';
const isTransformOptions = value => isPlainObj(value)
	&& (value.transform !== undefined || value.final !== undefined);

export const isUrl = value => Object.prototype.toString.call(value) === '[object URL]';
export const isRegularUrl = value => isUrl(value) && value.protocol !== 'file:';

const isFilePathObject = value => isPlainObj(value)
	&& Object.keys(value).length > 0
	&& Object.keys(value).every(key => FILE_PATH_KEYS.has(key))
	&& isFilePathString(value.file);
const FILE_PATH_KEYS = new Set(['file', 'append']);
export const isFilePathString = file => typeof file === 'string';

export const isUnknownStdioString = (type, value) => type === 'native'
	&& typeof value === 'string'
	&& !KNOWN_STDIO_STRINGS.has(value);
const KNOWN_STDIO_STRINGS = new Set(['ipc', 'ignore', 'inherit', 'overlapped', 'pipe']);

const isReadableStream = value => Object.prototype.toString.call(value) === '[object ReadableStream]';
export const isWritableStream = value => Object.prototype.toString.call(value) === '[object WritableStream]';
const isWebStream = value => isReadableStream(value) || isWritableStream(value);
const isTransformStream = value => isReadableStream(value?.readable) && isWritableStream(value?.writable);

const isAsyncIterableObject = value => isObject(value) && typeof value[Symbol.asyncIterator] === 'function';
const isIterableObject = value => isObject(value) && typeof value[Symbol.iterator] === 'function';
const isObject = value => typeof value === 'object' && value !== null;

// Types which modify `subprocess.std*`
export const TRANSFORM_TYPES = new Set(['generator', 'asyncGenerator', 'duplex', 'webTransform']);
// Types which write to a file or a file descriptor
export const FILE_TYPES = new Set(['fileUrl', 'filePath', 'fileNumber']);
// When two file descriptors of this type share the same target, we need to do some special logic
export const SPECIAL_DUPLICATE_TYPES_SYNC = new Set(['fileUrl', 'filePath']);
export const SPECIAL_DUPLICATE_TYPES = new Set([...SPECIAL_DUPLICATE_TYPES_SYNC, 'webStream', 'nodeStream']);
// Do not allow two file descriptors of this type sharing the same target
export const FORBID_DUPLICATE_TYPES = new Set(['webTransform', 'duplex']);

// Convert types to human-friendly strings for error messages
export const TYPE_TO_MESSAGE = {
	generator: 'a generator',
	asyncGenerator: 'an async generator',
	fileUrl: 'a file URL',
	filePath: 'a file path string',
	fileNumber: 'a file descriptor number',
	webStream: 'a web stream',
	nodeStream: 'a Node.js stream',
	webTransform: 'a web TransformStream',
	duplex: 'a Duplex stream',
	native: 'any value',
	iterable: 'an iterable',
	asyncIterable: 'an async iterable',
	string: 'a string',
	uint8Array: 'a Uint8Array',
};
