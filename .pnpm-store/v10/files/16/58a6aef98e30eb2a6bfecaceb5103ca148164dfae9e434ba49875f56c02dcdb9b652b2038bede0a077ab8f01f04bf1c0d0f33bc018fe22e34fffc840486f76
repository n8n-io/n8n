import {on} from 'node:events';
import {getDefaultHighWaterMark} from 'node:stream';
import {getEncodingTransformGenerator} from '../transform/encoding-transform.js';
import {getSplitLinesGenerator} from '../transform/split.js';
import {transformChunkSync, finalChunksSync} from '../transform/run-sync.js';

// Iterate over lines of `subprocess.stdout`, used by `subprocess.readable|duplex|iterable()`
export const iterateOnSubprocessStream = ({subprocessStdout, subprocess, binary, shouldEncode, encoding, preserveNewlines}) => {
	const controller = new AbortController();
	stopReadingOnExit(subprocess, controller);
	return iterateOnStream({
		stream: subprocessStdout,
		controller,
		binary,
		shouldEncode: !subprocessStdout.readableObjectMode && shouldEncode,
		encoding,
		shouldSplit: !subprocessStdout.readableObjectMode,
		preserveNewlines,
	});
};

const stopReadingOnExit = async (subprocess, controller) => {
	try {
		await subprocess;
	} catch {} finally {
		controller.abort();
	}
};

// Iterate over lines of `subprocess.stdout`, used by `result.stdout` and the `verbose: 'full'` option.
// Applies the `lines` and `encoding` options.
export const iterateForResult = ({stream, onStreamEnd, lines, encoding, stripFinalNewline, allMixed}) => {
	const controller = new AbortController();
	stopReadingOnStreamEnd(onStreamEnd, controller, stream);
	const objectMode = stream.readableObjectMode && !allMixed;
	return iterateOnStream({
		stream,
		controller,
		binary: encoding === 'buffer',
		shouldEncode: !objectMode,
		encoding,
		shouldSplit: !objectMode && lines,
		preserveNewlines: !stripFinalNewline,
	});
};

const stopReadingOnStreamEnd = async (onStreamEnd, controller, stream) => {
	try {
		await onStreamEnd;
	} catch {
		stream.destroy();
	} finally {
		controller.abort();
	}
};

const iterateOnStream = ({stream, controller, binary, shouldEncode, encoding, shouldSplit, preserveNewlines}) => {
	const onStdoutChunk = on(stream, 'data', {
		signal: controller.signal,
		highWaterMark: HIGH_WATER_MARK,
		// Backward compatibility with older name for this option
		// See https://github.com/nodejs/node/pull/52080#discussion_r1525227861
		// @todo Remove after removing support for Node 21
		highWatermark: HIGH_WATER_MARK,
	});
	return iterateOnData({
		onStdoutChunk,
		controller,
		binary,
		shouldEncode,
		encoding,
		shouldSplit,
		preserveNewlines,
	});
};

export const DEFAULT_OBJECT_HIGH_WATER_MARK = getDefaultHighWaterMark(true);

// The `highWaterMark` of `events.on()` is measured in number of events, not in bytes.
// Not knowing the average amount of bytes per `data` event, we use the same heuristic as streams in objectMode, since they have the same issue.
// Therefore, we use the value of `getDefaultHighWaterMark(true)`.
// Note: this option does not exist on Node 18, but this is ok since the logic works without it. It just consumes more memory.
const HIGH_WATER_MARK = DEFAULT_OBJECT_HIGH_WATER_MARK;

const iterateOnData = async function * ({onStdoutChunk, controller, binary, shouldEncode, encoding, shouldSplit, preserveNewlines}) {
	const generators = getGenerators({
		binary,
		shouldEncode,
		encoding,
		shouldSplit,
		preserveNewlines,
	});

	try {
		for await (const [chunk] of onStdoutChunk) {
			yield * transformChunkSync(chunk, generators, 0);
		}
	} catch (error) {
		if (!controller.signal.aborted) {
			throw error;
		}
	} finally {
		yield * finalChunksSync(generators);
	}
};

const getGenerators = ({binary, shouldEncode, encoding, shouldSplit, preserveNewlines}) => [
	getEncodingTransformGenerator(binary, encoding, !shouldEncode),
	getSplitLinesGenerator(binary, preserveNewlines, !shouldSplit, {}),
].filter(Boolean);
