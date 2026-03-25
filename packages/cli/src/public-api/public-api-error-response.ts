import type { Response } from 'express';
import { HttpError } from 'express-openapi-validator/dist/framework/types';
import { UnexpectedError, UserError } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

/**
 * Maps errors from the public API stack to HTTP responses. Used by the
 * Express error middleware in `index.ts`.
 */
export function sendPublicApiErrorResponse(res: Response, error: unknown): void {
	if (error instanceof ResponseError) {
		res.status(error.httpStatusCode).json({
			message: error.message,
		});
		return;
	}

	if (error instanceof UserError) {
		res.status(400).json({
			message: error.message,
		});
		return;
	}

	if (error instanceof UnexpectedError) {
		res.status(500).json({
			message: 'Internal server error',
		});
		return;
	}

	if (error instanceof HttpError) {
		res.status(error.status || 400).json({
			message: error instanceof Error ? error.message : 'Bad request',
		});
		return;
	}

	res.status(500).json({
		message: 'Internal server error',
	});
}
