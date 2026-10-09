import type { BinaryResponse, SuccessStatus } from '@n8n/decorators';
import { UnexpectedError } from '@n8n/errors';
import type { Response } from 'express';
import { type OutgoingHttpHeaders } from 'http';

function getMissingHeaders(res: Response, declaredHeaders: string[]) {
	return declaredHeaders.filter((name) => !res.hasHeader(name));
}

function restoreHeaders(res: Response, headers: OutgoingHttpHeaders) {
	// Clear existing headers
	for (const name of res.getHeaderNames()) {
		if (headers[name] === undefined) {
			res.removeHeader(name);
		}
	}

	// Restore original headers
	for (const [name, value] of Object.entries(headers)) {
		if (value !== undefined) {
			res.setHeader(name, value);
		}
	}
}

const missingHeaderError = (routeName: string, names: string[]) =>
	new UnexpectedError(
		`${routeName} did not set the declared response header(s): ${names.join(', ')}`,
	);

/**
 * Runs a route whose controller method writes a binary body to `res` itself.
 *
 * Every declared header must be set before the body starts. The check runs at the first write, so
 * it also covers a stream. A missing header aborts the response, and the request fails with the
 * missing-header error, not the premature-close error a stream reports. If the method returns
 * before it writes anything, the missing header fails the request with a 500.
 */
export async function runBinaryResponseRoute(
	res: Response,
	binaryResponse: BinaryResponse,
	successStatus: SuccessStatus,
	routeName: string,
	invoke: () => Promise<unknown>,
): Promise<void> {
	const headers = res.getHeaders();
	const declaredHeaders = Object.keys(binaryResponse.headers ?? {});

	const writeCheck: { failure?: UnexpectedError } = {};

	res.status(successStatus).setHeader('Content-Type', binaryResponse.mediaType);

	// Node calls `writeHead` on the first write, so the check runs before any header is sent.
	const originalWriteHead = res.writeHead;
	res.writeHead = ((...args: Parameters<Response['writeHead']>) => {
		const absent = getMissingHeaders(res, declaredHeaders);
		if (absent.length) {
			writeCheck.failure = missingHeaderError(routeName, absent);
			res.destroy();
			return res;
		}
		return originalWriteHead.apply(res, args);
	}) as Response['writeHead'];

	// The check ends with the route. Otherwise it would also block the JSON error response below.
	const release = () => {
		res.writeHead = originalWriteHead;
	};

	let invokeFailure: { error: unknown } | undefined;
	try {
		await invoke();
	} catch (error) {
		invokeFailure = { error };
	}
	release();

	if (writeCheck.failure) {
		if (!res.headersSent) {
			restoreHeaders(res, headers);
		}
		throw writeCheck.failure;
	}

	if (invokeFailure) {
		if (!res.headersSent) {
			restoreHeaders(res, headers);
		}
		throw invokeFailure.error;
	}

	if (!res.headersSent) {
		const absent = getMissingHeaders(res, declaredHeaders);
		restoreHeaders(res, headers);

		if (absent.length) {
			throw missingHeaderError(routeName, absent);
		}

		throw new UnexpectedError(
			`${routeName} declares a binary @ApiResponse but returned without sending a response`,
		);
	}
}
