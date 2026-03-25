import {once} from 'node:events';
import {isStream as isNodeStream} from 'is-stream';
import {throwOnTimeout} from '../terminate/timeout.js';
import {throwOnCancel} from '../terminate/cancel.js';
import {throwOnGracefulCancel} from '../terminate/graceful.js';
import {isStandardStream} from '../utils/standard-stream.js';
import {TRANSFORM_TYPES} from '../stdio/type.js';
import {getBufferedData} from '../io/contents.js';
import {waitForIpcOutput, getBufferedIpcOutput} from '../ipc/buffer-messages.js';
import {sendIpcInput} from '../ipc/ipc-input.js';
import {waitForAllStream} from './all-async.js';
import {waitForStdioStreams} from './stdio.js';
import {waitForExit, waitForSuccessfulExit} from './exit-async.js';
import {waitForStream} from './wait-stream.js';

// Retrieve result of subprocess: exit code, signal, error, streams (stdout/stderr/all)
export const waitForSubprocessResult = async ({
	subprocess,
	options: {
		encoding,
		buffer,
		maxBuffer,
		lines,
		timeoutDuration: timeout,
		cancelSignal,
		gracefulCancel,
		forceKillAfterDelay,
		stripFinalNewline,
		ipc,
		ipcInput,
	},
	context,
	verboseInfo,
	fileDescriptors,
	originalStreams,
	onInternalError,
	controller,
}) => {
	const exitPromise = waitForExit(subprocess, context);
	const streamInfo = {
		originalStreams,
		fileDescriptors,
		subprocess,
		exitPromise,
		propagating: false,
	};

	const stdioPromises = waitForStdioStreams({
		subprocess,
		encoding,
		buffer,
		maxBuffer,
		lines,
		stripFinalNewline,
		verboseInfo,
		streamInfo,
	});
	const allPromise = waitForAllStream({
		subprocess,
		encoding,
		buffer,
		maxBuffer,
		lines,
		stripFinalNewline,
		verboseInfo,
		streamInfo,
	});
	const ipcOutput = [];
	const ipcOutputPromise = waitForIpcOutput({
		subprocess,
		buffer,
		maxBuffer,
		ipc,
		ipcOutput,
		verboseInfo,
	});
	const originalPromises = waitForOriginalStreams(originalStreams, subprocess, streamInfo);
	const customStreamsEndPromises = waitForCustomStreamsEnd(fileDescriptors, streamInfo);

	try {
		return await Promise.race([
			Promise.all([
				{},
				waitForSuccessfulExit(exitPromise),
				Promise.all(stdioPromises),
				allPromise,
				ipcOutputPromise,
				sendIpcInput(subprocess, ipcInput),
				...originalPromises,
				...customStreamsEndPromises,
			]),
			onInternalError,
			throwOnSubprocessError(subprocess, controller),
			...throwOnTimeout(subprocess, timeout, context, controller),
			...throwOnCancel({
				subprocess,
				cancelSignal,
				gracefulCancel,
				context,
				controller,
			}),
			...throwOnGracefulCancel({
				subprocess,
				cancelSignal,
				gracefulCancel,
				forceKillAfterDelay,
				context,
				controller,
			}),
		]);
	} catch (error) {
		context.terminationReason ??= 'other';
		return Promise.all([
			{error},
			exitPromise,
			Promise.all(stdioPromises.map(stdioPromise => getBufferedData(stdioPromise))),
			getBufferedData(allPromise),
			getBufferedIpcOutput(ipcOutputPromise, ipcOutput),
			Promise.allSettled(originalPromises),
			Promise.allSettled(customStreamsEndPromises),
		]);
	}
};

// Transforms replace `subprocess.std*`, which means they are not exposed to users.
// However, we still want to wait for their completion.
const waitForOriginalStreams = (originalStreams, subprocess, streamInfo) =>
	originalStreams.map((stream, fdNumber) => stream === subprocess.stdio[fdNumber]
		? undefined
		: waitForStream(stream, fdNumber, streamInfo));

// Some `stdin`/`stdout`/`stderr` options create a stream, e.g. when passing a file path.
// The `.pipe()` method automatically ends that stream when `subprocess` ends.
// This makes sure we wait for the completion of those streams, in order to catch any error.
const waitForCustomStreamsEnd = (fileDescriptors, streamInfo) => fileDescriptors.flatMap(({stdioItems}, fdNumber) => stdioItems
	.filter(({value, stream = value}) => isNodeStream(stream, {checkOpen: false}) && !isStandardStream(stream))
	.map(({type, value, stream = value}) => waitForStream(stream, fdNumber, streamInfo, {
		isSameDirection: TRANSFORM_TYPES.has(type),
		stopOnExit: type === 'native',
	})));

// Fails when the subprocess emits an `error` event
const throwOnSubprocessError = async (subprocess, {signal}) => {
	const [error] = await once(subprocess, 'error', {signal});
	throw error;
};
