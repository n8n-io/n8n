/* eslint-disable import/no-cycle */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Request, Response } from 'express';
import { parse, stringify } from 'flatted';

// eslint-disable-next-line import/no-cycle
import {
	IExecutionDb,
	IExecutionFlatted,
	IExecutionFlattedDb,
	IExecutionResponse,
	IWorkflowDb,
} from '.';

/**
 * Special Error which allows to return also an error code and http status code
 *
 * @export
 * @class ResponseError
 * @extends {Error}
 */
export class ResponseError extends Error {
	// The HTTP status code of  response
	httpStatusCode?: number;

	// The error code in the response
	errorCode?: number;

	// The error hint the response
	hint?: string;

	/**
	 * Creates an instance of ResponseError.
	 * Must be used inside a block with `ResponseHelper.send()`.
	 *
	 * @param {string} message The error message
	 * @param {number} [errorCode] The error code which can be used by frontend to identify the actual error
	 * @param {number} [httpStatusCode] The HTTP status code the response should have
	 * @param {string} [hint] The error hint to provide a context (webhook related)
	 * @memberof ResponseError
	 */
	constructor(message: string, errorCode?: number, httpStatusCode?: number, hint?: string) {
		super(message);
		this.name = 'ResponseError';

		if (errorCode) {
			this.errorCode = errorCode;
		}
		if (httpStatusCode) {
			this.httpStatusCode = httpStatusCode;
		}
		if (hint) {
			this.hint = hint;
		}
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

export function sendErrorResponse(res: Response, error: ResponseError) {
	let httpStatusCode = 500;
	if (error.httpStatusCode) {
		httpStatusCode = error.httpStatusCode;
	}

	if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
		console.error('ERROR RESPONSE');
		console.error(error);
	}

	const response = {
		code: 0,
		message: 'Unknown error',
		hint: '',
	};

	if (error.name === 'NodeApiError') {
		Object.assign(response, error);
	}

	if (error.errorCode) {
		response.code = error.errorCode;
	}
	if (error.message) {
		response.message = error.message;
	}
	if (error.hint) {
		response.hint = error.hint;
	}
	if (error.stack && process.env.NODE_ENV !== 'production') {
		// @ts-ignore
		response.stack = error.stack;
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
 * @export
 * @param {(req: Request, res: Response) => Promise<any>} processFunction The actual function to process the request
 * @returns
 */

export function send(processFunction: (req: Request, res: Response) => Promise<any>, raw = false) {
	// eslint-disable-next-line consistent-return
	return async (req: Request, res: Response) => {
		try {
			const data = await processFunction(req, res);

			sendSuccessResponse(res, data, raw);
		} catch (error) {
			if (error instanceof Error && isUniqueConstraintError(error)) {
				error.message = 'There is already an entry with this name';
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
 * @export
 * @param {IExecutionDb} fullExecutionData The data to flatten
 * @returns {IExecutionFlatted}
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
 * @export
 * @param {IExecutionFlattedDb} fullExecutionData The data to unflatten
 * @returns {IExecutionResponse}
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
