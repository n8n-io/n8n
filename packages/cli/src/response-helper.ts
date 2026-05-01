import { inDevelopment, Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ReportingOptions } from '@n8n/errors';
import type { Request, Response } from 'express';
import { ErrorReporter } from 'n8n-core';
import { ensureError, FORM_TRIGGER_PATH_IDENTIFIER, NodeApiError } from 'n8n-workflow';
import { Readable } from 'node:stream';
import picocolors from 'picocolors';

import { classifyHttpError, isResponseError } from './errors/http-error-classifier';
import { serializeInternalRestError } from './errors/http-error-serializers';
import { ResponseError } from './errors/response-errors/abstract/response.error';

export function sendSuccessResponse(
	res: Response,
	data: unknown,
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

export function sendErrorResponse(res: Response, error: Error) {
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
	}

	const descriptor = classifyHttpError(error);
	const { status, body: response } = serializeInternalRestError(descriptor);

	if (error instanceof NodeApiError) {
		if (inDevelopment) {
			Container.get(Logger).error([picocolors.red(error.name), error.message].join(' '));
		}

		Object.assign(response, error);
	}

	if (error.stack && inDevelopment) {
		response.stacktrace = error.stack;
	}

	res.status(status).json(response);
}

export const isUniqueConstraintError = (error: Error) =>
	['unique', 'duplicate'].some((s) => error.message.toLowerCase().includes(s));

export function reportError(error: Error, options?: ReportingOptions) {
	if (!(error instanceof ResponseError) || error.httpStatusCode > 404) {
		Container.get(ErrorReporter).error(error, options);
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
		} catch (e) {
			const error = ensureError(e);
			const user = (req as Request & { user?: User }).user;
			reportError(error, {
				extra: {
					method: req.method,
					path: req.path,
					user: user ? { id: user.id } : undefined,
				},
			});

			if (isUniqueConstraintError(error)) {
				error.message = 'There is already an entry with this name';
			}

			sendErrorResponse(res, error);
		}
	};
}
