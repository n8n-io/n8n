import {on, once} from 'node:events';
import {PassThrough as PassThroughStream, getDefaultHighWaterMark} from 'node:stream';
import {finished} from 'node:stream/promises';

export default function mergeStreams(streams) {
	if (!Array.isArray(streams)) {
		throw new TypeError(`Expected an array, got \`${typeof streams}\`.`);
	}

	for (const stream of streams) {
		validateStream(stream);
	}

	const objectMode = streams.some(({readableObjectMode}) => readableObjectMode);
	const highWaterMark = getHighWaterMark(streams, objectMode);
	const passThroughStream = new MergedStream({
		objectMode,
		writableHighWaterMark: highWaterMark,
		readableHighWaterMark: highWaterMark,
	});

	for (const stream of streams) {
		passThroughStream.add(stream);
	}

	return passThroughStream;
}

const getHighWaterMark = (streams, objectMode) => {
	if (streams.length === 0) {
		return getDefaultHighWaterMark(objectMode);
	}

	const highWaterMarks = streams
		.filter(({readableObjectMode}) => readableObjectMode === objectMode)
		.map(({readableHighWaterMark}) => readableHighWaterMark);
	return Math.max(...highWaterMarks);
};

class MergedStream extends PassThroughStream {
	#streams = new Set([]);
	#ended = new Set([]);
	#aborted = new Set([]);
	#onFinished;
	#unpipeEvent = Symbol('unpipe');
	#streamPromises = new WeakMap();

	add(stream) {
		validateStream(stream);

		if (this.#streams.has(stream)) {
			return;
		}

		this.#streams.add(stream);

		this.#onFinished ??= onMergedStreamFinished(this, this.#streams, this.#unpipeEvent);
		const streamPromise = endWhenStreamsDone({
			passThroughStream: this,
			stream,
			streams: this.#streams,
			ended: this.#ended,
			aborted: this.#aborted,
			onFinished: this.#onFinished,
			unpipeEvent: this.#unpipeEvent,
		});
		this.#streamPromises.set(stream, streamPromise);

		stream.pipe(this, {end: false});
	}

	async remove(stream) {
		validateStream(stream);

		if (!this.#streams.has(stream)) {
			return false;
		}

		const streamPromise = this.#streamPromises.get(stream);
		if (streamPromise === undefined) {
			return false;
		}

		this.#streamPromises.delete(stream);

		stream.unpipe(this);
		await streamPromise;
		return true;
	}
}

const onMergedStreamFinished = async (passThroughStream, streams, unpipeEvent) => {
	updateMaxListeners(passThroughStream, PASSTHROUGH_LISTENERS_COUNT);
	const controller = new AbortController();

	try {
		await Promise.race([
			onMergedStreamEnd(passThroughStream, controller),
			onInputStreamsUnpipe(passThroughStream, streams, unpipeEvent, controller),
		]);
	} finally {
		controller.abort();
		updateMaxListeners(passThroughStream, -PASSTHROUGH_LISTENERS_COUNT);
	}
};

const onMergedStreamEnd = async (passThroughStream, {signal}) => {
	try {
		await finished(passThroughStream, {signal, cleanup: true});
	} catch (error) {
		errorOrAbortStream(passThroughStream, error);
		throw error;
	}
};

const onInputStreamsUnpipe = async (passThroughStream, streams, unpipeEvent, {signal}) => {
	for await (const [unpipedStream] of on(passThroughStream, 'unpipe', {signal})) {
		if (streams.has(unpipedStream)) {
			unpipedStream.emit(unpipeEvent);
		}
	}
};

const validateStream = stream => {
	if (typeof stream?.pipe !== 'function') {
		throw new TypeError(`Expected a readable stream, got: \`${typeof stream}\`.`);
	}
};

const endWhenStreamsDone = async ({passThroughStream, stream, streams, ended, aborted, onFinished, unpipeEvent}) => {
	updateMaxListeners(passThroughStream, PASSTHROUGH_LISTENERS_PER_STREAM);
	const controller = new AbortController();

	try {
		await Promise.race([
			afterMergedStreamFinished(onFinished, stream, controller),
			onInputStreamEnd({
				passThroughStream,
				stream,
				streams,
				ended,
				aborted,
				controller,
			}),
			onInputStreamUnpipe({
				stream,
				streams,
				ended,
				aborted,
				unpipeEvent,
				controller,
			}),
		]);
	} finally {
		controller.abort();
		updateMaxListeners(passThroughStream, -PASSTHROUGH_LISTENERS_PER_STREAM);
	}

	if (streams.size > 0 && streams.size === ended.size + aborted.size) {
		if (ended.size === 0 && aborted.size > 0) {
			abortStream(passThroughStream);
		} else {
			endStream(passThroughStream);
		}
	}
};

const afterMergedStreamFinished = async (onFinished, stream, {signal}) => {
	try {
		await onFinished;
		if (!signal.aborted) {
			abortStream(stream);
		}
	} catch (error) {
		if (!signal.aborted) {
			errorOrAbortStream(stream, error);
		}
	}
};

const onInputStreamEnd = async ({passThroughStream, stream, streams, ended, aborted, controller: {signal}}) => {
	try {
		await finished(stream, {
			signal,
			cleanup: true,
			readable: true,
			writable: false,
		});
		if (streams.has(stream)) {
			ended.add(stream);
		}
	} catch (error) {
		if (signal.aborted || !streams.has(stream)) {
			return;
		}

		if (isAbortError(error)) {
			aborted.add(stream);
		} else {
			errorStream(passThroughStream, error);
		}
	}
};

const onInputStreamUnpipe = async ({stream, streams, ended, aborted, unpipeEvent, controller: {signal}}) => {
	await once(stream, unpipeEvent, {signal});

	if (!stream.readable) {
		return once(signal, 'abort', {signal});
	}

	streams.delete(stream);
	ended.delete(stream);
	aborted.delete(stream);
};

const endStream = stream => {
	if (stream.writable) {
		stream.end();
	}
};

const errorOrAbortStream = (stream, error) => {
	if (isAbortError(error)) {
		abortStream(stream);
	} else {
		errorStream(stream, error);
	}
};

// This is the error thrown by `finished()` on `stream.destroy()`
const isAbortError = error => error?.code === 'ERR_STREAM_PREMATURE_CLOSE';

const abortStream = stream => {
	if (stream.readable || stream.writable) {
		stream.destroy();
	}
};

// `stream.destroy(error)` crashes the process with `uncaughtException` if no `error` event listener exists on `stream`.
// We take care of error handling on user behalf, so we do not want this to happen.
const errorStream = (stream, error) => {
	if (!stream.destroyed) {
		stream.once('error', noop);
		stream.destroy(error);
	}
};

const noop = () => {};

const updateMaxListeners = (passThroughStream, increment) => {
	const maxListeners = passThroughStream.getMaxListeners();
	if (maxListeners !== 0 && maxListeners !== Number.POSITIVE_INFINITY) {
		passThroughStream.setMaxListeners(maxListeners + increment);
	}
};

// Number of times `passThroughStream.on()` is called regardless of streams:
//  - once due to `finished(passThroughStream)`
//  - once due to `on(passThroughStream)`
const PASSTHROUGH_LISTENERS_COUNT = 2;

// Number of times `passThroughStream.on()` is called per stream:
//  - once due to `stream.pipe(passThroughStream)`
const PASSTHROUGH_LISTENERS_PER_STREAM = 1;
