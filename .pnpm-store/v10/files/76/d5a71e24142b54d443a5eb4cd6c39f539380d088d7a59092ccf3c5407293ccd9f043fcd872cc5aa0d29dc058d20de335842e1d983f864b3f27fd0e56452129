import {ChildProcess} from 'node:child_process';
import {
	PassThrough,
	Readable,
	Writable,
	Duplex,
} from 'node:stream';
import {cleanupCustomStreams} from '../stdio/handle.js';
import {makeEarlyError} from './result.js';
import {handleResult} from './reject.js';

// When the subprocess fails to spawn.
// We ensure the returned error is always both a promise and a subprocess.
export const handleEarlyError = ({error, command, escapedCommand, fileDescriptors, options, startTime, verboseInfo}) => {
	cleanupCustomStreams(fileDescriptors);

	const subprocess = new ChildProcess();
	createDummyStreams(subprocess, fileDescriptors);
	Object.assign(subprocess, {readable, writable, duplex});

	const earlyError = makeEarlyError({
		error,
		command,
		escapedCommand,
		fileDescriptors,
		options,
		startTime,
		isSync: false,
	});
	const promise = handleDummyPromise(earlyError, verboseInfo, options);
	return {subprocess, promise};
};

const createDummyStreams = (subprocess, fileDescriptors) => {
	const stdin = createDummyStream();
	const stdout = createDummyStream();
	const stderr = createDummyStream();
	const extraStdio = Array.from({length: fileDescriptors.length - 3}, createDummyStream);
	const all = createDummyStream();
	const stdio = [stdin, stdout, stderr, ...extraStdio];
	Object.assign(subprocess, {
		stdin,
		stdout,
		stderr,
		all,
		stdio,
	});
};

const createDummyStream = () => {
	const stream = new PassThrough();
	stream.end();
	return stream;
};

const readable = () => new Readable({read() {}});
const writable = () => new Writable({write() {}});
const duplex = () => new Duplex({read() {}, write() {}});

const handleDummyPromise = async (error, verboseInfo, options) => handleResult(error, verboseInfo, options);
