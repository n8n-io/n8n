import {setImmediate} from 'node:timers/promises';
import getStream, {getStreamAsArrayBuffer, getStreamAsArray} from 'get-stream';
import {isArrayBuffer} from '../utils/uint-array.js';
import {shouldLogOutput, logLines} from '../verbose/output.js';
import {iterateForResult} from './iterate.js';
import {handleMaxBuffer} from './max-buffer.js';
import {getStripFinalNewline} from './strip-newline.js';

// Retrieve `result.stdout|stderr|all|stdio[*]`
export const getStreamOutput = async ({stream, onStreamEnd, fdNumber, encoding, buffer, maxBuffer, lines, allMixed, stripFinalNewline, verboseInfo, streamInfo}) => {
	const logPromise = logOutputAsync({
		stream,
		onStreamEnd,
		fdNumber,
		encoding,
		allMixed,
		verboseInfo,
		streamInfo,
	});

	if (!buffer) {
		await Promise.all([resumeStream(stream), logPromise]);
		return;
	}

	const stripFinalNewlineValue = getStripFinalNewline(stripFinalNewline, fdNumber);
	const iterable = iterateForResult({
		stream,
		onStreamEnd,
		lines,
		encoding,
		stripFinalNewline: stripFinalNewlineValue,
		allMixed,
	});
	const [output] = await Promise.all([
		getStreamContents({
			stream,
			iterable,
			fdNumber,
			encoding,
			maxBuffer,
			lines,
		}),
		logPromise,
	]);
	return output;
};

const logOutputAsync = async ({stream, onStreamEnd, fdNumber, encoding, allMixed, verboseInfo, streamInfo: {fileDescriptors}}) => {
	if (!shouldLogOutput({
		stdioItems: fileDescriptors[fdNumber]?.stdioItems,
		encoding,
		verboseInfo,
		fdNumber,
	})) {
		return;
	}

	const linesIterable = iterateForResult({
		stream,
		onStreamEnd,
		lines: true,
		encoding,
		stripFinalNewline: true,
		allMixed,
	});
	await logLines(linesIterable, stream, fdNumber, verboseInfo);
};

// When using `buffer: false`, users need to read `subprocess.stdout|stderr|all` right away
// See https://github.com/sindresorhus/execa/issues/730 and https://github.com/sindresorhus/execa/pull/729#discussion_r1465496310
const resumeStream = async stream => {
	await setImmediate();
	if (stream.readableFlowing === null) {
		stream.resume();
	}
};

const getStreamContents = async ({stream, stream: {readableObjectMode}, iterable, fdNumber, encoding, maxBuffer, lines}) => {
	try {
		if (readableObjectMode || lines) {
			return await getStreamAsArray(iterable, {maxBuffer});
		}

		if (encoding === 'buffer') {
			return new Uint8Array(await getStreamAsArrayBuffer(iterable, {maxBuffer}));
		}

		return await getStream(iterable, {maxBuffer});
	} catch (error) {
		return handleBufferedData(handleMaxBuffer({
			error,
			stream,
			readableObjectMode,
			lines,
			encoding,
			fdNumber,
		}));
	}
};

// On failure, `result.stdout|stderr|all` should contain the currently buffered stream
// They are automatically closed and flushed by Node.js when the subprocess exits
// When `buffer` is `false`, `streamPromise` is `undefined` and there is no buffered data to retrieve
export const getBufferedData = async streamPromise => {
	try {
		return await streamPromise;
	} catch (error) {
		return handleBufferedData(error);
	}
};

// Ensure we are returning Uint8Arrays when using `encoding: 'buffer'`
const handleBufferedData = ({bufferedData}) => isArrayBuffer(bufferedData)
	? new Uint8Array(bufferedData)
	: bufferedData;
