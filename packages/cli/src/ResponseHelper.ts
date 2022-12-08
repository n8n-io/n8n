/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Request, Response } from 'express';
import { parse, stringify } from 'flatted';
import picocolors from 'picocolors';
import { ErrorReporterProxy as ErrorReporter, NodeApiError } from 'n8n-workflow';

import type {
	IExecutionDb,
	IExecutionFlatted,
	IExecutionFlattedDb,
	IExecutionResponse,
	IWorkflowDb,
} from './Interfaces';

const inDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

/**
 * Special Error which allows to return also an error code and http status code
 */
abstract class ResponseError extends Error {
	/**
	 * Creates an instance of ResponseError.
	 * Must be used inside a block with `ResponseHelper.send()`.
	 */
	constructor(
		message: string,
		// The HTTP status code of  response
		readonly httpStatusCode: number,
		// The error code in the response
		readonly errorCode: number = httpStatusCode,
		// The error hint the response
		readonly hint: string | undefined = undefined,
	) {
		super(message);
		this.name = 'ResponseError';
	}
}

export class BadRequestError extends ResponseError {
	constructor(message: string, errorCode?: number) {
		super(message, 400, errorCode);
	}
}

export class AuthError extends ResponseError {
	constructor(message: string) {
		super(message, 401);
	}
}

export class UnauthorizedError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 403, 403, hint);
	}
}

export class NotFoundError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 404, 404, hint);
	}
}

export class ConflictError extends ResponseError {
	constructor(message: string, hint: string | undefined = undefined) {
		super(message, 409, 409, hint);
	}
}

export class InternalServerError extends ResponseError {
	constructor(message: string, errorCode = 500) {
		super(message, 500, errorCode);
	}
}

export class ServiceUnavailableError extends ResponseError {
	constructor(message: string, errorCode = 503) {
		super(message, 503, errorCode);
	}
}

export function basicAuthAuthorizationError(resp: Response, realm: string, message?: string) {
	resp.statusCode = 401;
	resp.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
	resp.json({ code: resp.statusCode, message });
}

export function jwtAuthAuthorizationError(resp: Response, message?: string) {
	resp.statusCode = 403;
	resp.json({ code: resp.statusCode, message });
}

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

	if (error instanceof ResponseError) {
		if (inDevelopment) {
			console.error(picocolors.red(error.httpStatusCode), error.message);
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
			console.error(picocolors.red(error.name), error.message);
		}

		Object.assign(response, error);
	}

	if (error.stack && inDevelopment) {
		response.stacktrace = error.stack;
	}

	res.status(httpStatusCode).json(response);
}

const isUniqueConstraintError = (error: Error) =>
	['unique', 'duplicate'].some((s) => error.message.toLowerCase().includes(s));

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

			sendSuccessResponse(res, data, raw);
		} catch (error) {
			if (error instanceof Error) {
				if (!(error instanceof ResponseError) || error.httpStatusCode > 404) {
					ErrorReporter.error(error);
				}

				if (isUniqueConstraintError(error)) {
					error.message = 'There is already an entry with this name';
				}
			}

			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			sendErrorResponse(res, error);
		}
	};
}

/**
 * Flattens the Execution data.
 * As it contains a lot of references which normally would be saved as duplicate data
 * with regular JSON.stringify it gets flattened which keeps the references in place.
 *
 * @param {IExecutionDb} fullExecutionData The data to flatten
 */
export function flattenExecutionData(fullExecutionData: IExecutionDb): IExecutionFlatted {
	// Flatten the data
	const returnData: IExecutionFlatted = {
		data: stringify(fullExecutionData.data),
		mode: fullExecutionData.mode,
		// @ts-ignore
		waitTill: fullExecutionData.waitTill,
		startedAt: fullExecutionData.startedAt,
		stoppedAt: fullExecutionData.stoppedAt,
		finished: fullExecutionData.finished ? fullExecutionData.finished : false,
		workflowId: fullExecutionData.workflowId,
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		workflowData: fullExecutionData.workflowData!,
	};

	if (fullExecutionData.id !== undefined) {
		returnData.id = fullExecutionData.id.toString();
	}

	if (fullExecutionData.retryOf !== undefined) {
		returnData.retryOf = fullExecutionData.retryOf.toString();
	}

	if (fullExecutionData.retrySuccessId !== undefined) {
		returnData.retrySuccessId = fullExecutionData.retrySuccessId.toString();
	}

	return returnData;
}

/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedDb} fullExecutionData The data to unflatten
 */
export function unflattenExecutionData(fullExecutionData: IExecutionFlattedDb): IExecutionResponse {
	const returnData: IExecutionResponse = {
		id: fullExecutionData.id.toString(),
		workflowData: fullExecutionData.workflowData as IWorkflowDb,
		data: parse(fullExecutionData.data),
		mode: fullExecutionData.mode,
		waitTill: fullExecutionData.waitTill ? fullExecutionData.waitTill : undefined,
		startedAt: fullExecutionData.startedAt,
		stoppedAt: fullExecutionData.stoppedAt,
		finished: fullExecutionData.finished ? fullExecutionData.finished : false,
		workflowId: fullExecutionData.workflowId,
	};

	return returnData;
}

export const flattenObject = (obj: { [x: string]: any }, prefix = '') =>
	Object.keys(obj).reduce((acc, k) => {
		const pre = prefix.length ? prefix + '.' : '';
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		if (typeof obj[k] === 'object') Object.assign(acc, flattenObject(obj[k], pre + k));
		//@ts-ignore
		else acc[pre + k] = obj[k];
		return acc;
	}, {});
