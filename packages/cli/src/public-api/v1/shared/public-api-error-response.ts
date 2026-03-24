import type { Response } from 'express';
import { UnexpectedError } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';

export function respondWithPublicApiError(res: Response, error: unknown): boolean {
	if (error instanceof ResponseError) {
		void res.status(error.httpStatusCode).json({ message: error.message });
		return true;
	}
	if (error instanceof UnexpectedError) {
		void res.status(500).json({ message: 'Internal server error' });
		return true;
	}
	if (error instanceof Error) {
		void res.status(400).json({ message: error.message });
		return true;
	}
	return false;
}
