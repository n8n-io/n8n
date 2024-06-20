/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { Request, Response } from 'express';
import picocolors from 'picocolors';
import {
	ErrorReporterProxy as ErrorReporter,
	FORM_TRIGGER_PATH_IDENTIFIER,
	NodeApiError,
} from 'n8n-workflow';
import { Readable } from 'node:stream';

import { inDevelopment } from '@/constants';
import { ResponseError } from './errors/response-errors/abstract/response.error';
import Container from 'typedi';
import { Logger } from './Logger';

export function sendSuccessResponse(
	res: Response,
	data: any,
	raw?: boolean,
	responseCode?: number,
	responseHeader?: object,
) {
	if (responseCode !== undefined) {
		res.status(responseCode);
	}

	if (responseHeader) {
		res.header(responseHeader);
	}

	if (data instanceof Readable) {
		data.pipe(res);
		return;
	}

	if (raw === true) {
		if (typeof data === 'string') {
			res.send(data);
		} else {
			res.json(data);
		}
	} else {
		res.json({
			data,
		});
	}
}

/**
 * Checks if the given error is a ResponseError. It can be either an
 * instance of ResponseError or an error which has the same properties.
 * The latter case is for external hooks.
 */
function isResponseError(error: Error): error is ResponseError {
	if (error instanceof ResponseError) {
		return true;
	}

	if (error instanceof Error) {
		return (
			'httpStatusCode' in error &&
			typeof error.httpStatusCode === 'number' &&
			'errorCode' in error &&
			typeof error.errorCode === 'number'
		);
	}

	return false;
}

interface ErrorResponse {
	code: number;
	message: string;
	hint?: string;
	stacktrace?: string;
}

export function sendErrorResponse(res: Response, error: Error) {
	let httpStatusCode = 500;

	const response: ErrorResponse = {
		code: 0,
		message: error.message ?? 'Unknown error',
	};

	if (isResponseError(error)) {
		if (inDevelopment) {
			Container.get(Logger).error(picocolors.red([error.httpStatusCode, error.message].join(' ')));
		}

		//render custom 404 page for form triggers
		const { originalUrl } = res.req;
		if (error.errorCode === 404 && originalUrl) {
			const basePath = originalUrl.split('/')[1];
			const isLegacyFormTrigger = originalUrl.includes(FORM_TRIGGER_PATH_IDENTIFIER);
			const isFormTrigger = basePath.includes('form');

			if (isFormTrigger || isLegacyFormTrigger) {
				const isTestWebhook = basePath.includes('test');
				res.status(404);
				return res.render('form-trigger-404', { isTestWebhook });
			}
		}

		httpStatusCode = error.httpStatusCode;

		if (error.errorCode) {
			response.code = error.errorCode;
		}
		if (error.hint) {
			response.hint = error.hint;
		}
	}

	if (error instanceof NodeApiError) {
		if (inDevelopment) {
			Container.get(Logger).error([picocolors.red(error.name), error.message].join(' '));
		}

		Object.assign(response, error);
	}

	if (error.stack && inDevelopment) {
		response.stacktrace = error.stack;
	}

	res.status(httpStatusCode).json(response);
}

export const isUniqueConstraintError = (error: Error) =>
	['unique', 'duplicate'].some((s) => error.message.toLowerCase().includes(s));

export function reportError(error: Error) {
	if (!(error instanceof ResponseError) || error.httpStatusCode > 404) {
		ErrorReporter.error(error);
	}
}

/**
 * A helper function which does not just allow to return Promises it also makes sure that
 * all the responses have the same format
 *
 *
 * @param {(req: Request, res: Response) => Promise<any>} processFunction The actual function to process the request
 */

export function send<T, R extends Request, S extends Response>(
	processFunction: (req: R, res: S) => Promise<T>,
	raw = false,
) {
	return async (req: R, res: S) => {
		try {
			const data = await processFunction(req, res);

			if (!res.headersSent) sendSuccessResponse(res, data, raw);
		} catch (error) {
			if (error instanceof Error) {
				reportError(error);

				if (isUniqueConstraintError(error)) {
					error.message = 'There is already an entry with this name';
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			sendErrorResponse(res, error);
		}
	};
}
