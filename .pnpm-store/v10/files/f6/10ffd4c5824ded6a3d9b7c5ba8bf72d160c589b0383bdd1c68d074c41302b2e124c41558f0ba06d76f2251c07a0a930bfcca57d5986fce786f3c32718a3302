import {finished} from 'node:stream/promises';

// Wraps `finished(stream)` to handle the following case:
//  - When the subprocess exits, Node.js automatically calls `subprocess.stdin.destroy()`, which we need to ignore.
//  - However, we still need to throw if `subprocess.stdin.destroy()` is called before subprocess exit.
export const waitForStream = async (stream, fdNumber, streamInfo, {isSameDirection, stopOnExit = false} = {}) => {
	const state = handleStdinDestroy(stream, streamInfo);
	const abortController = new AbortController();
	try {
		await Promise.race([
			...(stopOnExit ? [streamInfo.exitPromise] : []),
			finished(stream, {cleanup: true, signal: abortController.signal}),
		]);
	} catch (error) {
		if (!state.stdinCleanedUp) {
			handleStreamError(error, fdNumber, streamInfo, isSameDirection);
		}
	} finally {
		abortController.abort();
	}
};

// If `subprocess.stdin` is destroyed before being fully written to, it is considered aborted and should throw an error.
// This can happen for example when user called `subprocess.stdin.destroy()` before `subprocess.stdin.end()`.
// However, Node.js calls `subprocess.stdin.destroy()` on exit for cleanup purposes.
// https://github.com/nodejs/node/blob/0b4cdb4b42956cbd7019058e409e06700a199e11/lib/internal/child_process.js#L278
// This is normal and should not throw an error.
// Therefore, we need to differentiate between both situations to know whether to throw an error.
// Unfortunately, events (`close`, `error`, `end`, `exit`) cannot be used because `.destroy()` can take an arbitrary amount of time.
// For example, `stdin: 'pipe'` is implemented as a TCP socket, and its `.destroy()` method waits for TCP disconnection.
// Therefore `.destroy()` might end before or after subprocess exit, based on OS speed and load.
// The only way to detect this is to spy on `subprocess.stdin._destroy()` by wrapping it.
// If `subprocess.exitCode` or `subprocess.signalCode` is set, it means `.destroy()` is being called by Node.js itself.
const handleStdinDestroy = (stream, {originalStreams: [originalStdin], subprocess}) => {
	const state = {stdinCleanedUp: false};
	if (stream === originalStdin) {
		spyOnStdinDestroy(stream, subprocess, state);
	}

	return state;
};

const spyOnStdinDestroy = (subprocessStdin, subprocess, state) => {
	const {_destroy} = subprocessStdin;
	subprocessStdin._destroy = (...destroyArguments) => {
		setStdinCleanedUp(subprocess, state);
		_destroy.call(subprocessStdin, ...destroyArguments);
	};
};

const setStdinCleanedUp = ({exitCode, signalCode}, state) => {
	if (exitCode !== null || signalCode !== null) {
		state.stdinCleanedUp = true;
	}
};

// We ignore EPIPEs on writable streams and aborts on readable streams since those can happen normally.
// When one stream errors, the error is propagated to the other streams on the same file descriptor.
// Those other streams might have a different direction due to the above.
// When this happens, the direction of both the initial stream and the others should then be taken into account.
// Therefore, we keep track of whether a stream error is currently propagating.
const handleStreamError = (error, fdNumber, streamInfo, isSameDirection) => {
	if (!shouldIgnoreStreamError(error, fdNumber, streamInfo, isSameDirection)) {
		throw error;
	}
};

const shouldIgnoreStreamError = (error, fdNumber, streamInfo, isSameDirection = true) => {
	if (streamInfo.propagating) {
		return isStreamEpipe(error) || isStreamAbort(error);
	}

	streamInfo.propagating = true;
	return isInputFileDescriptor(streamInfo, fdNumber) === isSameDirection
		? isStreamEpipe(error)
		: isStreamAbort(error);
};

// Unfortunately, we cannot use the stream's class or properties to know whether it is readable or writable.
// For example, `subprocess.stdin` is technically a Duplex, but can only be used as a writable.
// Therefore, we need to use the file descriptor's direction (`stdin` is input, `stdout` is output, etc.).
// However, while `subprocess.std*` and transforms follow that direction, any stream passed the `std*` option has the opposite direction.
// For example, `subprocess.stdin` is a writable, but the `stdin` option is a readable.
export const isInputFileDescriptor = ({fileDescriptors}, fdNumber) => fdNumber !== 'all' && fileDescriptors[fdNumber].direction === 'input';

// When `stream.destroy()` is called without an `error` argument, stream is aborted.
// This is the only way to abort a readable stream, which can be useful in some instances.
// Therefore, we ignore this error on readable streams.
export const isStreamAbort = error => error?.code === 'ERR_STREAM_PREMATURE_CLOSE';

// When `stream.write()` is called but the underlying source has been closed, `EPIPE` is emitted.
// When piping subprocesses, the source subprocess usually decides when to stop piping.
// However, there are some instances when the destination does instead, such as `... | head -n1`.
// It notifies the source by using `EPIPE`.
// Therefore, we ignore this error on writable streams.
const isStreamEpipe = error => error?.code === 'EPIPE';
