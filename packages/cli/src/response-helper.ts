/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { inDevelopment, Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { FORM_TRIGGER_PATH_IDENTIFIER, NodeApiError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import picocolors from 'picocolors';

import { ResponseError } from './errors/response-errors/abstract/response.error';

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
	meta?: Record<string, unknown>;
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

		if (error.errorCode === 409 && originalUrl && originalUrl.includes('form-waiting')) {
			//codes other than 200  breaks redirection to form-waiting page from form trigger
			//render form page instead of json
			return res.render('form-trigger-409', {
				message: error.message,
			});
		}

		httpStatusCode = error.httpStatusCode;

		if (error.errorCode) {
			response.code = error.errorCode;
		}
		if (error.hint) {
			response.hint = error.hint;
		}
		if (error.meta) {
			response.meta = error.meta;
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

/**
 * Checks if the given error is a database unique constraint violation.
 * Only matches actual database errors, not validation errors that happen
 * to contain words like "unique" or "duplicate" in user content.
 *
 * @see https://github.com/n8n-io/n8n/issues/25012
 */
export const isUniqueConstraintError = (error: Error): boolean => {
	// Only QueryFailedError from database operations should be considered
	if (!(error instanceof QueryFailedError)) {
		return false;
	}

	const driverError = error.driverError as { code?: string; errno?: number } | undefined;

	// SQLite: SQLITE_CONSTRAINT error with UNIQUE in message
	if (
		driverError?.code === 'SQLITE_CONSTRAINT' ||
		driverError?.code === 'SQLITE_CONSTRAINT_UNIQUE'
	) {
		return true;
	}

	// PostgreSQL: Error code 23505 is unique_violation
	if (driverError?.code === '23505') {
		return true;
	}

	// MySQL/MariaDB: ER_DUP_ENTRY error code 1062
	if (driverError?.code === 'ER_DUP_ENTRY' || driverError?.errno === 1062) {
		return true;
	}

	// Fallback: Check for specific database constraint error patterns in the raw message
	// These patterns are database-generated, not user content
	const constraintPatterns = [
		'unique constraint',
		'duplicate key value',
		'duplicate entry',
		'sqlite_constraint_unique',
		'violates unique constraint',
	];

	const lowerMessage = error.message.toLowerCase();
	return constraintPatterns.some((pattern) => lowerMessage.includes(pattern));
};

export function reportError(error: Error) {
	if (!(error instanceof ResponseError) || error.httpStatusCode > 404) {
		Container.get(ErrorReporter).error(error);
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
	return async (req: R, res: S): Promise<void> => {
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
