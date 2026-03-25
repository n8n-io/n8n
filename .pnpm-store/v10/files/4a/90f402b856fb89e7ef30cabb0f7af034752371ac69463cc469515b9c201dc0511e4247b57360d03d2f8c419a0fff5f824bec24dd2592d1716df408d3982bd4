import {Transform, getDefaultHighWaterMark} from 'node:stream';
import {isAsyncGenerator} from '../stdio/type.js';
import {getSplitLinesGenerator, getAppendNewlineGenerator} from './split.js';
import {getValidateTransformInput, getValidateTransformReturn} from './validate.js';
import {getEncodingTransformGenerator} from './encoding-transform.js';
import {
	pushChunks,
	transformChunk,
	finalChunks,
	destroyTransform,
} from './run-async.js';
import {
	pushChunksSync,
	transformChunkSync,
	finalChunksSync,
	runTransformSync,
} from './run-sync.js';

/*
Generators can be used to transform/filter standard streams.

Generators have a simple syntax, yet allows all of the following:
- Sharing `state` between chunks
- Flushing logic, by using a `final` function
- Asynchronous logic
- Emitting multiple chunks from a single source chunk, even if spaced in time, by using multiple `yield`
- Filtering, by using no `yield`

Therefore, there is no need to allow Node.js or web transform streams.

The `highWaterMark` is kept as the default value, since this is what `subprocess.std*` uses.

Chunks are currently processed serially. We could add a `concurrency` option to parallelize in the future.

Transform an array of generator functions into a `Transform` stream.
`Duplex.from(generator)` cannot be used because it does not allow setting the `objectMode` and `highWaterMark`.
*/
export const generatorToStream = ({
	value,
	value: {transform, final, writableObjectMode, readableObjectMode},
	optionName,
}, {encoding}) => {
	const state = {};
	const generators = addInternalGenerators(value, encoding, optionName);

	const transformAsync = isAsyncGenerator(transform);
	const finalAsync = isAsyncGenerator(final);
	const transformMethod = transformAsync
		? pushChunks.bind(undefined, transformChunk, state)
		: pushChunksSync.bind(undefined, transformChunkSync);
	const finalMethod = transformAsync || finalAsync
		? pushChunks.bind(undefined, finalChunks, state)
		: pushChunksSync.bind(undefined, finalChunksSync);
	const destroyMethod = transformAsync || finalAsync
		? destroyTransform.bind(undefined, state)
		: undefined;

	const stream = new Transform({
		writableObjectMode,
		writableHighWaterMark: getDefaultHighWaterMark(writableObjectMode),
		readableObjectMode,
		readableHighWaterMark: getDefaultHighWaterMark(readableObjectMode),
		transform(chunk, encoding, done) {
			transformMethod([chunk, generators, 0], this, done);
		},
		flush(done) {
			finalMethod([generators], this, done);
		},
		destroy: destroyMethod,
	});
	return {stream};
};

// Applies transform generators in sync mode
export const runGeneratorsSync = (chunks, stdioItems, encoding, isInput) => {
	const generators = stdioItems.filter(({type}) => type === 'generator');
	const reversedGenerators = isInput ? generators.reverse() : generators;

	for (const {value, optionName} of reversedGenerators) {
		const generators = addInternalGenerators(value, encoding, optionName);
		chunks = runTransformSync(generators, chunks);
	}

	return chunks;
};

// Generators used internally to convert the chunk type, validate it, and split into lines
const addInternalGenerators = (
	{transform, final, binary, writableObjectMode, readableObjectMode, preserveNewlines},
	encoding,
	optionName,
) => {
	const state = {};
	return [
		{transform: getValidateTransformInput(writableObjectMode, optionName)},
		getEncodingTransformGenerator(binary, encoding, writableObjectMode),
		getSplitLinesGenerator(binary, preserveNewlines, writableObjectMode, state),
		{transform, final},
		{transform: getValidateTransformReturn(readableObjectMode, optionName)},
		getAppendNewlineGenerator({
			binary,
			preserveNewlines,
			readableObjectMode,
			state,
		}),
	].filter(Boolean);
};
