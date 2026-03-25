import {aborted} from 'node:util';
import {createNonCommandError} from './throw.js';

// When passing an `unpipeSignal` option, abort piping when the signal is aborted.
// However, do not terminate the subprocesses.
export const unpipeOnAbort = (unpipeSignal, unpipeContext) => unpipeSignal === undefined
	? []
	: [unpipeOnSignalAbort(unpipeSignal, unpipeContext)];

const unpipeOnSignalAbort = async (unpipeSignal, {sourceStream, mergedStream, fileDescriptors, sourceOptions, startTime}) => {
	await aborted(unpipeSignal, sourceStream);
	await mergedStream.remove(sourceStream);
	const error = new Error('Pipe canceled by `unpipeSignal` option.');
	throw createNonCommandError({
		error,
		fileDescriptors,
		sourceOptions,
		startTime,
	});
};
