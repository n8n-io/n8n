import {callbackify} from 'node:util';

// Applies a series of generator functions asynchronously
export const pushChunks = callbackify(async (getChunks, state, getChunksArguments, transformStream) => {
	state.currentIterable = getChunks(...getChunksArguments);

	try {
		for await (const chunk of state.currentIterable) {
			transformStream.push(chunk);
		}
	} finally {
		delete state.currentIterable;
	}
});

// For each new chunk, apply each `transform()` method
export const transformChunk = async function * (chunk, generators, index) {
	if (index === generators.length) {
		yield chunk;
		return;
	}

	const {transform = identityGenerator} = generators[index];
	for await (const transformedChunk of transform(chunk)) {
		yield * transformChunk(transformedChunk, generators, index + 1);
	}
};

// At the end, apply each `final()` method, followed by the `transform()` method of the next transforms
export const finalChunks = async function * (generators) {
	for (const [index, {final}] of Object.entries(generators)) {
		yield * generatorFinalChunks(final, Number(index), generators);
	}
};

const generatorFinalChunks = async function * (final, index, generators) {
	if (final === undefined) {
		return;
	}

	for await (const finalChunk of final()) {
		yield * transformChunk(finalChunk, generators, index + 1);
	}
};

// Cancel any ongoing async generator when the Transform is destroyed, e.g. when the subprocess errors
export const destroyTransform = callbackify(async ({currentIterable}, error) => {
	if (currentIterable !== undefined) {
		await (error ? currentIterable.throw(error) : currentIterable.return());
		return;
	}

	if (error) {
		throw error;
	}
});

const identityGenerator = function * (chunk) {
	yield chunk;
};
