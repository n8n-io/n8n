import type { RequestHandler } from 'express';

import type { IdentityVerifier } from './identity.types';
import { fail } from '../server/error-response';

const BEARER_PREFIX = /^bearer /i;

/** Verifies `Authorization: Bearer <token>` on every request it guards, or 401s with no reason. */
export function createAuthenticationMiddleware(verifier: IdentityVerifier): RequestHandler {
	return (req, res, next) => {
		// The reason is logged, never returned: an operator needs it, a caller must not have it.
		const reject = (reason: string): void => {
			// Query string dropped: it can carry values that must not reach a log.
			const path = req.originalUrl.split('?')[0];
			console.warn(`engine: rejected ${req.method} ${path} - ${reason}`);
			fail(res, 401, { error: 'unauthenticated' });
		};

		const header = req.header('authorization');
		if (!header || !BEARER_PREFIX.test(header)) {
			reject('no bearer token');
			return;
		}

		const token = header.replace(BEARER_PREFIX, '');

		try {
			req.caller = verifier.verify(token);
		} catch {
			reject('token rejected');
			return;
		}

		next();
	};
}
