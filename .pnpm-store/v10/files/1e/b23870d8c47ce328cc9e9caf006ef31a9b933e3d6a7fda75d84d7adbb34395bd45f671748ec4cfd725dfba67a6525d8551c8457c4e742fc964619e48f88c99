import {Readable} from 'node:stream';
import {callbackify} from 'node:util';
import {BINARY_ENCODINGS} from '../arguments/encoding-option.js';
import {getFromStream} from '../arguments/fd-options.js';
import {iterateOnSubprocessStream, DEFAULT_OBJECT_HIGH_WATER_MARK} from '../io/iterate.js';
import {createDeferred} from '../utils/deferred.js';
import {addConcurrentStream, waitForConcurrentStreams} from './concurrent.js';
import {
	safeWaitForSubprocessStdin,
	waitForSubprocessStdout,
	waitForSubprocess,
	destroyOtherStream,
} from './shared.js';

// Create a `Readable` stream that forwards from `stdout` and awaits the subprocess
export const createReadable = ({subprocess, concurrentStreams, encoding}, {from, binary: binaryOption = true, preserveNewlines = true} = {}) => {
	const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
	const {subprocessStdout, waitReadableDestroy} = getSubprocessStdout(subprocess, from, concurrentStreams);
	const {readableEncoding, readableObjectMode, readableHighWaterMark} = getReadableOptions(subprocessStdout, binary);
	const {read, onStdoutDataDone} = getReadableMethods({
		subprocessStdout,
		subprocess,
		binary,
		encoding,
		preserveNewlines,
	});
	const readable = new Readable({
		read,
		destroy: callbackify(onReadableDestroy.bind(undefined, {subprocessStdout, subprocess, waitReadableDestroy})),
		highWaterMark: readableHighWaterMark,
		objectMode: readableObjectMode,
		encoding: readableEncoding,
	});
	onStdoutFinished({
		subprocessStdout,
		onStdoutDataDone,
		readable,
		subprocess,
	});
	return readable;
};

// Retrieve `stdout` (or other stream depending on `from`)
export const getSubprocessStdout = (subprocess, from, concurrentStreams) => {
	const subprocessStdout = getFromStream(subprocess, from);
	const waitReadableDestroy = addConcurrentStream(concurrentStreams, subprocessStdout, 'readableDestroy');
	return {subprocessStdout, waitReadableDestroy};
};

export const getReadableOptions = ({readableEncoding, readableObjectMode, readableHighWaterMark}, binary) => binary
	? {readableEncoding, readableObjectMode, readableHighWaterMark}
	: {readableEncoding, readableObjectMode: true, readableHighWaterMark: DEFAULT_OBJECT_HIGH_WATER_MARK};

export const getReadableMethods = ({subprocessStdout, subprocess, binary, encoding, preserveNewlines}) => {
	const onStdoutDataDone = createDeferred();
	const onStdoutData = iterateOnSubprocessStream({
		subprocessStdout,
		subprocess,
		binary,
		shouldEncode: !binary,
		encoding,
		preserveNewlines,
	});

	return {
		read() {
			onRead(this, onStdoutData, onStdoutDataDone);
		},
		onStdoutDataDone,
	};
};

// Forwards data from `stdout` to `readable`
const onRead = async (readable, onStdoutData, onStdoutDataDone) => {
	try {
		const {value, done} = await onStdoutData.next();
		if (done) {
			onStdoutDataDone.resolve();
		} else {
			readable.push(value);
		}
	} catch {}
};

// When `subprocess.stdout` ends/aborts/errors, do the same on `readable`.
// Await the subprocess, for the same reason as above.
export const onStdoutFinished = async ({subprocessStdout, onStdoutDataDone, readable, subprocess, subprocessStdin}) => {
	try {
		await waitForSubprocessStdout(subprocessStdout);
		await subprocess;
		await safeWaitForSubprocessStdin(subprocessStdin);
		await onStdoutDataDone;

		if (readable.readable) {
			readable.push(null);
		}
	} catch (error) {
		await safeWaitForSubprocessStdin(subprocessStdin);
		destroyOtherReadable(readable, error);
	}
};

// When `readable` aborts/errors, do the same on `subprocess.stdout`
export const onReadableDestroy = async ({subprocessStdout, subprocess, waitReadableDestroy}, error) => {
	if (await waitForConcurrentStreams(waitReadableDestroy, subprocess)) {
		destroyOtherReadable(subprocessStdout, error);
		await waitForSubprocess(subprocess, error);
	}
};

const destroyOtherReadable = (stream, error) => {
	destroyOtherStream(stream, stream.readable, error);
};
