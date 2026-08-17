import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { randomBytes } from 'node:crypto';

import type { ContentSecurityPolicies } from '@/security/content-security-policy';
import { renderContentSecurityPolicy } from '@/security/content-security-policy';

declare global {
	namespace Express {
		interface Locals {
			/** Nonce to put on the `<script>` tags of an HTML response. */
			cspNonce: string;
		}
	}
}

const ENFORCED_HEADER = 'Content-Security-Policy';
const REPORT_ONLY_HEADER = 'Content-Security-Policy-Report-Only';

const isHtmlResponse = (res: Response) => {
	const contentType = res.getHeader('content-type');
	return typeof contentType === 'string' && contentType.toLowerCase().includes('text/html');
};

const hasOwnPolicy = (res: Response) =>
	res.hasHeader(ENFORCED_HEADER) || res.hasHeader(REPORT_ONLY_HEADER);

/**
 * Serves the instance's Content-Security-Policy on HTML responses that do not already
 * set one, e.g. the `sandbox` policy on webhook, form and binary-data pages. The
 * middleware checks both conditions at header-flush time, because neither is known
 * when it runs.
 */
export const createContentSecurityPolicyMiddleware = ({
	enforced,
	reportOnly,
}: ContentSecurityPolicies): RequestHandler => {
	return (_req: Request, res: Response, next: NextFunction) => {
		let nonce: string | undefined;
		// base64url rather than base64: still a valid CSP `base64-value`, but free of the
		// `=` padding that a handlebars template would escape into `&#x3D;`.
		const getNonce = () => (nonce ??= randomBytes(16).toString('base64url'));

		// Lazy, so requests that render no HTML generate no nonce. Enumerable, so
		// `res.render` passes it to templates as `{{cspNonce}}`.
		Object.defineProperty(res.locals, 'cspNonce', {
			get: getNonce,
			enumerable: true,
			configurable: true,
		});

		type WriteHead = Response['writeHead'];
		const writeHead = res.writeHead.bind(res);

		// Same technique as the `on-headers` package: there is no event for "headers
		// about to be sent", so wrap the call that sends them.
		res.writeHead = ((...args: Parameters<WriteHead>) => {
			if (isHtmlResponse(res) && !hasOwnPolicy(res)) {
				if (enforced) {
					res.setHeader(ENFORCED_HEADER, renderContentSecurityPolicy(enforced, getNonce()));
				}
				if (reportOnly) {
					res.setHeader(REPORT_ONLY_HEADER, renderContentSecurityPolicy(reportOnly, getNonce()));
				}
			}

			return writeHead(...args);
		}) as WriteHead;

		next();
	};
};
