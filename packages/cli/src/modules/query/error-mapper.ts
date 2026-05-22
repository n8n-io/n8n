import { EngineError } from './engine/errors';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

/**
 * Maps an EngineError to the right ResponseError class for HTTP serialisation.
 * Non-engine errors are passed through unchanged so the framework's default
 * error handler can deal with them.
 *
 * Used by both the internal `POST /rest/query` controller and the public API
 * `POST /api/v1/query` handler.
 */
export function mapEngineErrorToHttp(error: unknown): unknown {
	if (!(error instanceof EngineError)) return error;
	const message = `${error.code}: ${error.message}`;
	switch (error.code) {
		case 'FORBIDDEN_WORKFLOW':
			return new ForbiddenError(message);
		case 'DB_UNSUPPORTED':
		case 'STATEMENT_TIMEOUT':
		case 'EXECUTION_FAILED':
		case 'RESULT_TOO_LARGE':
			return new InternalServerError(message);
		default:
			return new BadRequestError(message);
	}
}
