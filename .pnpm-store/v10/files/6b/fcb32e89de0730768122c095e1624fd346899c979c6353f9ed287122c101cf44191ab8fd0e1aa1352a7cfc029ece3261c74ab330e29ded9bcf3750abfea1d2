import {finished} from 'node:stream/promises';
import mergeStreams from '@sindresorhus/merge-streams';
import {incrementMaxListeners} from '../utils/max-listeners.js';
import {pipeStreams} from '../io/pipeline.js';

// The piping behavior is like Bash.
// In particular, when one subprocess exits, the other is not terminated by a signal.
// Instead, its stdout (for the source) or stdin (for the destination) closes.
// If the subprocess uses it, it will make it error with SIGPIPE or EPIPE (for the source) or end (for the destination).
// If it does not use it, it will continue running.
// This allows for subprocesses to gracefully exit and lower the coupling between subprocesses.
export const pipeSubprocessStream = (sourceStream, destinationStream, maxListenersController) => {
	const mergedStream = MERGED_STREAMS.has(destinationStream)
		? pipeMoreSubprocessStream(sourceStream, destinationStream)
		: pipeFirstSubprocessStream(sourceStream, destinationStream);
	incrementMaxListeners(sourceStream, SOURCE_LISTENERS_PER_PIPE, maxListenersController.signal);
	incrementMaxListeners(destinationStream, DESTINATION_LISTENERS_PER_PIPE, maxListenersController.signal);
	cleanupMergedStreamsMap(destinationStream);
	return mergedStream;
};

// We use `merge-streams` to allow for multiple sources to pipe to the same destination.
const pipeFirstSubprocessStream = (sourceStream, destinationStream) => {
	const mergedStream = mergeStreams([sourceStream]);
	pipeStreams(mergedStream, destinationStream);
	MERGED_STREAMS.set(destinationStream, mergedStream);
	return mergedStream;
};

const pipeMoreSubprocessStream = (sourceStream, destinationStream) => {
	const mergedStream = MERGED_STREAMS.get(destinationStream);
	mergedStream.add(sourceStream);
	return mergedStream;
};

const cleanupMergedStreamsMap = async destinationStream => {
	try {
		await finished(destinationStream, {cleanup: true, readable: false, writable: true});
	} catch {}

	MERGED_STREAMS.delete(destinationStream);
};

const MERGED_STREAMS = new WeakMap();

// Number of listeners set up on `sourceStream` by each `sourceStream.pipe(destinationStream)`
// Those are added by `merge-streams`
const SOURCE_LISTENERS_PER_PIPE = 2;
// Number of listeners set up on `destinationStream` by each `sourceStream.pipe(destinationStream)`
// Those are added by `finished()` in `cleanupMergedStreamsMap()`
const DESTINATION_LISTENERS_PER_PIPE = 1;
