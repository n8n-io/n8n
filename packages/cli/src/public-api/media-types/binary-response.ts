import type { BinaryResponse, SuccessStatus } from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';
import type { Response } from 'express';

/**
 * Runs a route whose controller method writes a binary body to `res` itself. Sets the declared
 * status and media type first, so the documented ones are what a client gets.
 *
 * If the method throws or returns before the response starts, restores the headers to their values
 * from before the method ran. This removes headers the method added, and puts back any value the
 * method (or the `Content-Type` set above) overwrote. The JSON error that follows is then not
 * labelled as binary. A method that returns without sending a response is a bug, so it fails with a
 * 500.
 */
export async function runBinaryResponseRoute(
	res: Response,
	binaryResponse: BinaryResponse,
	successStatus: SuccessStatus,
	routeName: string,
	invoke: () => Promise<unknown>,
): Promise<void> {
	const headersBefore = res.getHeaders();
	const restoreHeaders = () => {
		for (const name of res.getHeaderNames()) {
			if (!(name in headersBefore)) res.removeHeader(name);
		}
		for (const [name, value] of Object.entries(headersBefore)) {
			if (value !== undefined) res.setHeader(name, value);
		}
	};

	res.status(successStatus).setHeader('Content-Type', binaryResponse.mediaType);

	try {
		await invoke();
	} catch (error) {
		if (!res.headersSent) restoreHeaders();
		throw error;
	}

	if (!res.headersSent) {
		restoreHeaders();
		throw new UnexpectedError(
			`${routeName} declares a binary @ApiResponse but returned without sending a response`,
		);
	}
}
