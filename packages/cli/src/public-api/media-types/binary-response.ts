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

function isPrematureClose(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ERR_STREAM_PREMATURE_CLOSE';
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

	const declaredHeaders = binaryResponse.headers ?? {};
	const resultHeaders = result.headers ?? {};

	const setHeaderNames = new Set(Object.keys(resultHeaders).map((name) => name.toLowerCase()));
	const missing = Object.keys(declaredHeaders).filter(
		(name) => !setHeaderNames.has(name.toLowerCase()),
	);
	if (missing.length) {
		throw new UnexpectedError(
			`${routeName} did not set the declared response header(s): ${missing.join(', ')}`,
		);
	}

	const { body } = result;

	// A buffer is already in memory, so send it in one write.
	if (Buffer.isBuffer(body)) {
		setResponseHeaders(res, successStatus, binaryResponse.mediaType, resultHeaders);
		res.end(body);
		return;
	}

	// A stream: read the first chunk before any header is set. A stream that fails at once then
	// gets a JSON error, not a 200 with no body.
	const iterator = body[Symbol.asyncIterator]();
	const first = await iterator.next();
	setResponseHeaders(res, successStatus, binaryResponse.mediaType, resultHeaders);
	if (first.done) {
		res.end();
		return;
	}
	res.write(first.value);

	try {
		// Pass the rest of the same iterator to the pipeline, so the first chunk is not read twice.
		const rest = { [Symbol.asyncIterator]: () => iterator };
		await pipeline(Readable.from(rest), res);
	} catch (error) {
		// The client disconnected.
		if (!isPrematureClose(error)) {
			throw error;
		}
	}
}
