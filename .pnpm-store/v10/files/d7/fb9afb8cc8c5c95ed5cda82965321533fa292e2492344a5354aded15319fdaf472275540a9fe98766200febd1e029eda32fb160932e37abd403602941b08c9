// Duplicate the code from `run-async.js` but as synchronous functions
export const pushChunksSync = (getChunksSync, getChunksArguments, transformStream, done) => {
	try {
		for (const chunk of getChunksSync(...getChunksArguments)) {
			transformStream.push(chunk);
		}

		done();
	} catch (error) {
		done(error);
	}
};

// Run synchronous generators with `execaSync()`
export const runTransformSync = (generators, chunks) => [
	...chunks.flatMap(chunk => [...transformChunkSync(chunk, generators, 0)]),
	...finalChunksSync(generators),
];

export const transformChunkSync = function * (chunk, generators, index) {
	if (index === generators.length) {
		yield chunk;
		return;
	}

	const {transform = identityGenerator} = generators[index];
	for (const transformedChunk of transform(chunk)) {
		yield * transformChunkSync(transformedChunk, generators, index + 1);
	}
};

export const finalChunksSync = function * (generators) {
	for (const [index, {final}] of Object.entries(generators)) {
		yield * generatorFinalChunksSync(final, Number(index), generators);
	}
};

const generatorFinalChunksSync = function * (final, index, generators) {
	if (final === undefined) {
		return;
	}

	for (const finalChunk of final()) {
		yield * transformChunkSync(finalChunk, generators, index + 1);
	}
};

const identityGenerator = function * (chunk) {
	yield chunk;
};
