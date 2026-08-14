import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { randomBytes } from 'node:crypto';

import type { ContentSecurityPolicies } from '@/security/content-security-policy';
import { renderContentSecurityPolicy } from '@/security/content-security-policy';

declare global {
	namespace Express {
		interface Locals {
			/**
			 * Nonce for this request's Content-Security-Policy, to put on the `<script>` tags
			 * of an HTML response. Guaranteed by `createContentSecurityPolicyMiddleware`.
			 */
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
 * Serves the instance's Content-Security-Policy on HTML responses.
 *
 * A fresh nonce is generated per request and exposed as `res.locals.cspNonce`,
 * which is how the editor's `index.html` and the handlebars templates get the
 * nonce into their `<script>` tags.
 *
 * Responses that already carry a policy of their own - the `sandbox` policy on
 * webhook, form and binary-data pages - are left untouched, and non-HTML
 * responses are not given a policy at all. Both are decided when the response
 * headers are flushed, since neither is known when the middleware runs.
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

		// Lazy, so requests that never render HTML don't generate a nonce. Enumerable
		// so `res.render` passes it to templates as `{{cspNonce}}`.
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
