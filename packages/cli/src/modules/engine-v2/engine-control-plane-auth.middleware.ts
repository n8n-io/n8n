import type { Logger } from '@n8n/backend-common';
import type { EngineConfig } from '@n8n/config';
import { InvalidActionTokenError, verifyActionToken } from '@n8n/engine';
import type { NextFunction, Request, Response } from 'express';

import { UnauthenticatedError } from '@/errors/response-errors/unauthenticated.error';

const BEARER_PREFIX = /^bearer /i;

/** Express's `RequestHandler` may return a promise; verifying a token never does. */
type SyncRequestHandler = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Rejects a caller the shared secret does not vouch for. Reads the secret per
 * request, because it is generated after this is constructed.
 */
export function createEngineControlPlaneAuthMiddleware(
	engineConfig: EngineConfig,
	logger: Logger,
): SyncRequestHandler {
	const reject = (req: Request, res: Response, reason: string): void => {
		// Logged, never returned: an operator needs the reason, a caller must not.
		logger.warn(`Rejected ${req.method} ${req.originalUrl} - ${reason}`);
		const error = new UnauthenticatedError();
		res.status(error.httpStatusCode).json({ code: error.errorCode, message: error.message });
	};

	return (req, res, next) => {
		const header = req.header('authorization') ?? '';
		if (!BEARER_PREFIX.test(header)) {
			reject(req, res, 'no bearer token');
			return;
		}

		try {
			verifyActionToken(
				engineConfig.authSecret,
				header.replace(BEARER_PREFIX, ''),
				'lifecycle-events:write',
			);
		} catch (error) {
			if (!(error instanceof InvalidActionTokenError)) throw error;
			reject(req, res, 'token rejected');
			return;
		}

		next();
	};
}
