import type { BinaryResponse, BinaryResult, SuccessStatus } from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

function isBinaryResult(result: unknown): result is BinaryResult {
	return (
		typeof result === 'object' &&
		result !== null &&
		'body' in result &&
		(Buffer.isBuffer(result.body) || result.body instanceof Readable)
	);
}

function isClientGone(error: unknown): boolean {
	return (
		error instanceof Error &&
		'code' in error &&
		(error.code === 'ERR_STREAM_PREMATURE_CLOSE' || error.code === 'ERR_STREAM_UNABLE_TO_PIPE')
	);
}

function setResponseHeaders(
	res: Response,
	successStatus: SuccessStatus,
	mediaType: BinaryResponse['mediaType'],
	headers: NonNullable<BinaryResult['headers']>,
) {
	for (const [name, value] of Object.entries(headers)) {
		res.setHeader(name, value);
	}
	// Set last, so a result header cannot replace the declared media type.
	res.status(successStatus).setHeader('Content-Type', mediaType);
}

async function sendStream(res: Response, body: Readable, setHeaders: () => void) {
	const release = () => body.destroy();
	res.once('close', release);

	// The client may have left before the listener was attached.
	if (res.destroyed) {
		release();
	}

	try {
		// Peek at the first chunk before any header is set. If the stream fails here, the error
		// still gets a JSON response.
		const iterator = body[Symbol.asyncIterator]();
		const first = await iterator.next();

		setHeaders();

		const rest = { [Symbol.asyncIterator]: () => iterator };
		async function* withFirstChunk() {
			if (!first.done) {
				yield first.value;
			}
			yield* rest;
		}

		await pipeline(Readable.from(withFirstChunk()), res);
	} catch (error) {
		// The client disconnected. There is no one left to send to.
		if (!isClientGone(error)) {
			throw error;
		}
	} finally {
		res.off('close', release);
	}
}

/**
 * Sends the result of a route whose success body is binary.
 */
export async function sendBinaryResponse(
	res: Response,
	binaryResponse: BinaryResponse,
	successStatus: SuccessStatus,
	routeName: string,
	result: unknown,
): Promise<void> {
	if (!isBinaryResult(result)) {
		throw new UnexpectedError(`${routeName} declares a binary @ApiResponse but returned no body`);
	}

	const { body } = result;
	const declaredHeaders = binaryResponse.headers ?? {};
	const resultHeaders = result.headers ?? {};

	try {
		const setHeaderNames = new Set(Object.keys(resultHeaders).map((name) => name.toLowerCase()));
		const missing = Object.keys(declaredHeaders).filter(
			(name) => !setHeaderNames.has(name.toLowerCase()),
		);
		if (missing.length) {
			throw new UnexpectedError(
				`${routeName} did not set the declared response header(s): ${missing.join(', ')}`,
			);
		}

		const setHeaders = () =>
			setResponseHeaders(res, successStatus, binaryResponse.mediaType, resultHeaders);

		// A buffer is already in memory, so send it in one write.
		if (Buffer.isBuffer(body)) {
			setHeaders();
			res.end(body);
			return;
		}

		await sendStream(res, body, setHeaders);
	} finally {
		// However this function exits, the stream must not stay open.
		if (body instanceof Readable) {
			body.destroy();
		}
	}
}
