import type { RequestHandler } from 'express';

import type { IdentityVerifier } from './identity.types';
import { fail } from '../server/error-response';

const BEARER_PREFIX = /^bearer /i;

/** Verifies `Authorization: Bearer <token>` on every request it guards, or 401s with no reason. */
export function createAuthenticationMiddleware(verifier: IdentityVerifier): RequestHandler {
	return (req, res, next) => {
		const reject = (): void => {
			fail(res, 401, { error: 'unauthenticated' });
		};

		const header = req.header('authorization');
		if (!header || !BEARER_PREFIX.test(header)) {
			reject();
			return;
		}

		const token = header.replace(BEARER_PREFIX, '');

		try {
			req.caller = verifier.verify(token);
		} catch {
			reject();
			return;
		}

		next();
	};
}
