import {finished} from 'node:stream/promises';
import {isStandardStream} from '../utils/standard-stream.js';

// Similar to `Stream.pipeline(source, destination)`, but does not destroy standard streams
export const pipeStreams = (source, destination) => {
	source.pipe(destination);
	onSourceFinish(source, destination);
	onDestinationFinish(source, destination);
};

// `source.pipe(destination)` makes `destination` end when `source` ends.
// But it does not propagate aborts or errors. This function does it.
const onSourceFinish = async (source, destination) => {
	if (isStandardStream(source) || isStandardStream(destination)) {
		return;
	}

	try {
		await finished(source, {cleanup: true, readable: true, writable: false});
	} catch {}

	endDestinationStream(destination);
};

export const endDestinationStream = destination => {
	if (destination.writable) {
		destination.end();
	}
};

// We do the same thing in the other direction as well.
const onDestinationFinish = async (source, destination) => {
	if (isStandardStream(source) || isStandardStream(destination)) {
		return;
	}

	try {
		await finished(destination, {cleanup: true, readable: false, writable: true});
	} catch {}

	abortSourceStream(source);
};

export const abortSourceStream = source => {
	if (source.readable) {
		source.destroy();
	}
};
