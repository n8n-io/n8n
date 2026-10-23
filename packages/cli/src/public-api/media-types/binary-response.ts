import type { BinaryResponse, BinaryResult, SuccessStatus } from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';
import type { Response } from 'express';
import { Readable } from 'node:stream';

import { sendStreamToResponse } from '@/response-helper';

function isBinaryResult(result: unknown): result is BinaryResult {
	return (
		typeof result === 'object' &&
		result !== null &&
		'body' in result &&
		(Buffer.isBuffer(result.body) || result.body instanceof Readable)
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

		await sendStreamToResponse(res, body, setHeaders);
	} finally {
		// However this function exits, the stream must not stay open.
		if (body instanceof Readable) {
			body.destroy();
		}
	}
}
