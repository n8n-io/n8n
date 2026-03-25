import {Writable} from 'node:stream';
import {callbackify} from 'node:util';
import {getToStream} from '../arguments/fd-options.js';
import {addConcurrentStream, waitForConcurrentStreams} from './concurrent.js';
import {
	safeWaitForSubprocessStdout,
	waitForSubprocessStdin,
	waitForSubprocess,
	destroyOtherStream,
} from './shared.js';

// Create a `Writable` stream that forwards to `stdin` and awaits the subprocess
export const createWritable = ({subprocess, concurrentStreams}, {to} = {}) => {
	const {subprocessStdin, waitWritableFinal, waitWritableDestroy} = getSubprocessStdin(subprocess, to, concurrentStreams);
	const writable = new Writable({
		...getWritableMethods(subprocessStdin, subprocess, waitWritableFinal),
		destroy: callbackify(onWritableDestroy.bind(undefined, {
			subprocessStdin,
			subprocess,
			waitWritableFinal,
			waitWritableDestroy,
		})),
		highWaterMark: subprocessStdin.writableHighWaterMark,
		objectMode: subprocessStdin.writableObjectMode,
	});
	onStdinFinished(subprocessStdin, writable);
	return writable;
};

// Retrieve `stdin` (or other stream depending on `to`)
export const getSubprocessStdin = (subprocess, to, concurrentStreams) => {
	const subprocessStdin = getToStream(subprocess, to);
	const waitWritableFinal = addConcurrentStream(concurrentStreams, subprocessStdin, 'writableFinal');
	const waitWritableDestroy = addConcurrentStream(concurrentStreams, subprocessStdin, 'writableDestroy');
	return {subprocessStdin, waitWritableFinal, waitWritableDestroy};
};

export const getWritableMethods = (subprocessStdin, subprocess, waitWritableFinal) => ({
	write: onWrite.bind(undefined, subprocessStdin),
	final: callbackify(onWritableFinal.bind(undefined, subprocessStdin, subprocess, waitWritableFinal)),
});

// Forwards data from `writable` to `stdin`
const onWrite = (subprocessStdin, chunk, encoding, done) => {
	if (subprocessStdin.write(chunk, encoding)) {
		done();
	} else {
		subprocessStdin.once('drain', done);
	}
};

// Ensures that the writable `final` and readable `end` events awaits the subprocess.
// Like this, any subprocess failure is propagated as a stream `error` event, instead of being lost.
// The user does not need to `await` the subprocess anymore, but now needs to await the stream completion or error.
// When multiple writables are targeting the same stream, they wait for each other, unless the subprocess ends first.
const onWritableFinal = async (subprocessStdin, subprocess, waitWritableFinal) => {
	if (await waitForConcurrentStreams(waitWritableFinal, subprocess)) {
		if (subprocessStdin.writable) {
			subprocessStdin.end();
		}

		await subprocess;
	}
};

// When `subprocess.stdin` ends/aborts/errors, do the same on `writable`.
export const onStdinFinished = async (subprocessStdin, writable, subprocessStdout) => {
	try {
		await waitForSubprocessStdin(subprocessStdin);
		if (writable.writable) {
			writable.end();
		}
	} catch (error) {
		await safeWaitForSubprocessStdout(subprocessStdout);
		destroyOtherWritable(writable, error);
	}
};

// When `writable` aborts/errors, do the same on `subprocess.stdin`
export const onWritableDestroy = async ({subprocessStdin, subprocess, waitWritableFinal, waitWritableDestroy}, error) => {
	await waitForConcurrentStreams(waitWritableFinal, subprocess);
	if (await waitForConcurrentStreams(waitWritableDestroy, subprocess)) {
		destroyOtherWritable(subprocessStdin, error);
		await waitForSubprocess(subprocess, error);
	}
};

const destroyOtherWritable = (stream, error) => {
	destroyOtherStream(stream, stream.writable, error);
};
