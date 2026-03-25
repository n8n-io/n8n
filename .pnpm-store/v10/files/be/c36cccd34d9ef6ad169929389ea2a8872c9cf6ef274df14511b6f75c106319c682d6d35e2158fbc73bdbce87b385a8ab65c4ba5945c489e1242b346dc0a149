import {Duplex} from 'node:stream';
import {callbackify} from 'node:util';
import {BINARY_ENCODINGS} from '../arguments/encoding-option.js';
import {
	getSubprocessStdout,
	getReadableOptions,
	getReadableMethods,
	onStdoutFinished,
	onReadableDestroy,
} from './readable.js';
import {
	getSubprocessStdin,
	getWritableMethods,
	onStdinFinished,
	onWritableDestroy,
} from './writable.js';

// Create a `Duplex` stream combining both `subprocess.readable()` and `subprocess.writable()`
export const createDuplex = ({subprocess, concurrentStreams, encoding}, {from, to, binary: binaryOption = true, preserveNewlines = true} = {}) => {
	const binary = binaryOption || BINARY_ENCODINGS.has(encoding);
	const {subprocessStdout, waitReadableDestroy} = getSubprocessStdout(subprocess, from, concurrentStreams);
	const {subprocessStdin, waitWritableFinal, waitWritableDestroy} = getSubprocessStdin(subprocess, to, concurrentStreams);
	const {readableEncoding, readableObjectMode, readableHighWaterMark} = getReadableOptions(subprocessStdout, binary);
	const {read, onStdoutDataDone} = getReadableMethods({
		subprocessStdout,
		subprocess,
		binary,
		encoding,
		preserveNewlines,
	});
	const duplex = new Duplex({
		read,
		...getWritableMethods(subprocessStdin, subprocess, waitWritableFinal),
		destroy: callbackify(onDuplexDestroy.bind(undefined, {
			subprocessStdout,
			subprocessStdin,
			subprocess,
			waitReadableDestroy,
			waitWritableFinal,
			waitWritableDestroy,
		})),
		readableHighWaterMark,
		writableHighWaterMark: subprocessStdin.writableHighWaterMark,
		readableObjectMode,
		writableObjectMode: subprocessStdin.writableObjectMode,
		encoding: readableEncoding,
	});
	onStdoutFinished({
		subprocessStdout,
		onStdoutDataDone,
		readable: duplex,
		subprocess,
		subprocessStdin,
	});
	onStdinFinished(subprocessStdin, duplex, subprocessStdout);
	return duplex;
};

const onDuplexDestroy = async ({subprocessStdout, subprocessStdin, subprocess, waitReadableDestroy, waitWritableFinal, waitWritableDestroy}, error) => {
	await Promise.all([
		onReadableDestroy({subprocessStdout, subprocess, waitReadableDestroy}, error),
		onWritableDestroy({
			subprocessStdin,
			subprocess,
			waitWritableFinal,
			waitWritableDestroy,
		}, error),
	]);
};
