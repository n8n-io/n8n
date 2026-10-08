import type { BinaryResponse, SuccessStatus } from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';
import type { Response } from 'express';

/**
 * Runs a route whose controller method writes a binary body to `res` itself. Sets the declared
 * status and media type first, so the documented ones are what a client gets.
 *
 * If the method throws or returns before the response starts, removes every header it (or this
 * function) added. The JSON error that follows is then not labelled as binary, and carries no
 * `Content-Disposition`. A method that returns without sending a response is a bug, so it fails
 * with a 500.
 */
export async function runBinaryResponseRoute(
	res: Response,
	binaryResponse: BinaryResponse,
	successStatus: SuccessStatus,
	routeName: string,
	invoke: () => Promise<unknown>,
): Promise<void> {
	const headersBefore = new Set(res.getHeaderNames());
	const removeAddedHeaders = () => {
		for (const name of res.getHeaderNames()) {
			if (!headersBefore.has(name)) res.removeHeader(name);
		}
	};

	res.status(successStatus).setHeader('Content-Type', binaryResponse.mediaType);

	try {
		await invoke();
	} catch (error) {
		if (!res.headersSent) removeAddedHeaders();
		throw error;
	}

	if (!res.headersSent) {
		removeAddedHeaders();
		throw new UnexpectedError(
			`${routeName} declares a binary @ApiResponse but returned without sending a response`,
		);
	}
}
