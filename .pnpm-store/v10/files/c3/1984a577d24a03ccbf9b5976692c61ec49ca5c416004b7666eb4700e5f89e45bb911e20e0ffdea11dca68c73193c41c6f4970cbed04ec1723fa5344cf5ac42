import mergeStreams from '@sindresorhus/merge-streams';
import {isStandardStream} from '../utils/standard-stream.js';
import {incrementMaxListeners} from '../utils/max-listeners.js';
import {TRANSFORM_TYPES} from '../stdio/type.js';
import {pipeStreams} from './pipeline.js';

// Handle `input`, `inputFile`, `stdin`, `stdout` and `stderr` options, after spawning, in async mode
// When multiple input streams are used, we merge them to ensure the output stream ends only once each input stream has ended
export const pipeOutputAsync = (subprocess, fileDescriptors, controller) => {
	const pipeGroups = new Map();

	for (const [fdNumber, {stdioItems, direction}] of Object.entries(fileDescriptors)) {
		for (const {stream} of stdioItems.filter(({type}) => TRANSFORM_TYPES.has(type))) {
			pipeTransform(subprocess, stream, direction, fdNumber);
		}

		for (const {stream} of stdioItems.filter(({type}) => !TRANSFORM_TYPES.has(type))) {
			pipeStdioItem({
				subprocess,
				stream,
				direction,
				fdNumber,
				pipeGroups,
				controller,
			});
		}
	}

	for (const [outputStream, inputStreams] of pipeGroups.entries()) {
		const inputStream = inputStreams.length === 1 ? inputStreams[0] : mergeStreams(inputStreams);
		pipeStreams(inputStream, outputStream);
	}
};

// When using transforms, `subprocess.stdin|stdout|stderr|stdio` is directly mutated
const pipeTransform = (subprocess, stream, direction, fdNumber) => {
	if (direction === 'output') {
		pipeStreams(subprocess.stdio[fdNumber], stream);
	} else {
		pipeStreams(stream, subprocess.stdio[fdNumber]);
	}

	const streamProperty = SUBPROCESS_STREAM_PROPERTIES[fdNumber];
	if (streamProperty !== undefined) {
		subprocess[streamProperty] = stream;
	}

	subprocess.stdio[fdNumber] = stream;
};

const SUBPROCESS_STREAM_PROPERTIES = ['stdin', 'stdout', 'stderr'];

// Most `std*` option values involve piping `subprocess.std*` to a stream.
// The stream is either passed by the user or created internally.
const pipeStdioItem = ({subprocess, stream, direction, fdNumber, pipeGroups, controller}) => {
	if (stream === undefined) {
		return;
	}

	setStandardStreamMaxListeners(stream, controller);

	const [inputStream, outputStream] = direction === 'output'
		? [stream, subprocess.stdio[fdNumber]]
		: [subprocess.stdio[fdNumber], stream];
	const outputStreams = pipeGroups.get(inputStream) ?? [];
	pipeGroups.set(inputStream, [...outputStreams, outputStream]);
};

// Multiple subprocesses might be piping from/to `process.std*` at the same time.
// This is not necessarily an error and should not print a `maxListeners` warning.
const setStandardStreamMaxListeners = (stream, {signal}) => {
	if (isStandardStream(stream)) {
		incrementMaxListeners(stream, MAX_LISTENERS_INCREMENT, signal);
	}
};

// `source.pipe(destination)` adds at most 1 listener for each event.
// If `stdin` option is an array, the values might be combined with `merge-streams`.
// That library also listens for `source` end, which adds 1 more listener.
const MAX_LISTENERS_INCREMENT = 2;
