import {readFileSync} from 'node:fs';
import tty from 'node:tty';
import {isStream as isNodeStream} from 'is-stream';
import {STANDARD_STREAMS} from '../utils/standard-stream.js';
import {bufferToUint8Array} from '../utils/uint-array.js';
import {serializeOptionValue} from '../arguments/fd-options.js';

// When we use multiple `stdio` values for the same streams, we pass 'pipe' to `child_process.spawn()`.
// We then emulate the piping done by core Node.js.
// To do so, we transform the following values:
//  - Node.js streams are marked as `type: nodeStream`
//  - 'inherit' becomes `process.stdin|stdout|stderr`
//  - any file descriptor integer becomes `process.stdio[fdNumber]`
// All of the above transformations tell Execa to perform manual piping.
export const handleNativeStream = ({stdioItem, stdioItem: {type}, isStdioArray, fdNumber, direction, isSync}) => {
	if (!isStdioArray || type !== 'native') {
		return stdioItem;
	}

	return isSync
		? handleNativeStreamSync({stdioItem, fdNumber, direction})
		: handleNativeStreamAsync({stdioItem, fdNumber});
};

// Synchronous methods use a different logic.
// 'inherit', file descriptors and process.std* are handled by readFileSync()/writeFileSync().
const handleNativeStreamSync = ({stdioItem, stdioItem: {value, optionName}, fdNumber, direction}) => {
	const targetFd = getTargetFd({
		value,
		optionName,
		fdNumber,
		direction,
	});
	if (targetFd !== undefined) {
		return targetFd;
	}

	if (isNodeStream(value, {checkOpen: false})) {
		throw new TypeError(`The \`${optionName}: Stream\` option cannot both be an array and include a stream with synchronous methods.`);
	}

	return stdioItem;
};

const getTargetFd = ({value, optionName, fdNumber, direction}) => {
	const targetFdNumber = getTargetFdNumber(value, fdNumber);
	if (targetFdNumber === undefined) {
		return;
	}

	if (direction === 'output') {
		return {type: 'fileNumber', value: targetFdNumber, optionName};
	}

	if (tty.isatty(targetFdNumber)) {
		throw new TypeError(`The \`${optionName}: ${serializeOptionValue(value)}\` option is invalid: it cannot be a TTY with synchronous methods.`);
	}

	return {type: 'uint8Array', value: bufferToUint8Array(readFileSync(targetFdNumber)), optionName};
};

const getTargetFdNumber = (value, fdNumber) => {
	if (value === 'inherit') {
		return fdNumber;
	}

	if (typeof value === 'number') {
		return value;
	}

	const standardStreamIndex = STANDARD_STREAMS.indexOf(value);
	if (standardStreamIndex !== -1) {
		return standardStreamIndex;
	}
};

const handleNativeStreamAsync = ({stdioItem, stdioItem: {value, optionName}, fdNumber}) => {
	if (value === 'inherit') {
		return {type: 'nodeStream', value: getStandardStream(fdNumber, value, optionName), optionName};
	}

	if (typeof value === 'number') {
		return {type: 'nodeStream', value: getStandardStream(value, value, optionName), optionName};
	}

	if (isNodeStream(value, {checkOpen: false})) {
		return {type: 'nodeStream', value, optionName};
	}

	return stdioItem;
};

// Node.js does not allow to easily retrieve file descriptors beyond stdin/stdout/stderr as streams.
//  - `fs.createReadStream()`/`fs.createWriteStream()` with the `fd` option do not work with character devices that use blocking reads/writes (such as interactive TTYs).
//  - Using a TCP `Socket` would work but be rather complex to implement.
// Since this is an edge case, we simply throw an error message.
// See https://github.com/sindresorhus/execa/pull/643#discussion_r1435905707
const getStandardStream = (fdNumber, value, optionName) => {
	const standardStream = STANDARD_STREAMS[fdNumber];

	if (standardStream === undefined) {
		throw new TypeError(`The \`${optionName}: ${value}\` option is invalid: no such standard stream.`);
	}

	return standardStream;
};
