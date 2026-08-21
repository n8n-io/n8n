import type { RequestHandler } from 'express';

import type { IdentityVerifier } from './identity.types';

const BEARER_PREFIX = /^bearer /i;

/** Verifies `Authorization: Bearer <token>` on every request it guards, or 401s with no reason. */
export function createAuthenticationMiddleware(verifier: IdentityVerifier): RequestHandler {
	return (req, res, next) => {
		const header = req.header('authorization');
		if (!header || !BEARER_PREFIX.test(header)) {
			res.status(401).json({ error: 'unauthenticated' });
			return;
		}

		const token = header.replace(BEARER_PREFIX, '');

		try {
			req.caller = verifier.verify(token);
		} catch {
			res.status(401).json({ error: 'unauthenticated' });
			return;
		}

		next();
	};
}
