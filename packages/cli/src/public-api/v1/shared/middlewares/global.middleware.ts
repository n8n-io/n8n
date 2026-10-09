import type { DeprecationInfo } from '@n8n/decorators';
import type express from 'express';
import type { Request } from 'express';

/**
 * Signals that an endpoint is deprecated via the RFC 9745 `Deprecation` response header. Callers
 * pass a semantic `Date`; this middleware owns the on-the-wire formatting so the wire syntax
 * (an RFC 9651 structured-field Date, `@<unix-seconds>`) never leaks to call sites.
 *
 * `since` is a fixed value owned by the caller — never derive it from `Date.now()`, so the header
 * stays deterministic across requests.
 */
export const deprecated = ({ since }: DeprecationInfo) => {
	const deprecation = `@${Math.floor(since.getTime() / 1000)}`;

	return (_req: Request, res: express.Response, next: express.NextFunction): void => {
		res.setHeader('Deprecation', deprecation);
		next();
	};
};
