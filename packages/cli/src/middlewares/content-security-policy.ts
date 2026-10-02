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

const isHeaderValue = (value: unknown): value is number | string | string[] =>
	typeof value === 'string' ||
	typeof value === 'number' ||
	(Array.isArray(value) && value.every((entry) => typeof entry === 'string'));

/**
 * Copy the headers of a `writeHead(status[, message][, headers])` call onto the response,
 * so the checks below see a `content-type` or a policy passed that way and not only the
 * ones set with `res.setHeader`. `writeHead` then setting them again is a no-op. The
 * array form is not handled: nothing in n8n passes one.
 *
 * Takes `unknown[]` because `Parameters<>` collapses `writeHead`'s overloads to the
 * two-argument one, which cannot express the `(status, message, headers)` form.
 */
const copyWriteHeadHeaders = (res: Response, args: unknown[]) => {
	const headers = typeof args[1] === 'string' ? args[2] : args[1];
	if (typeof headers !== 'object' || headers === null || Array.isArray(headers)) return;

	for (const [name, value] of Object.entries(headers)) {
		if (isHeaderValue(value)) res.setHeader(name, value);
	}
};

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

		// Same technique as the `on-headers` package, which n8n does not depend on: there
		// is no event for "headers about to be sent", so wrap the call that sends them.
		res.writeHead = ((...args: Parameters<WriteHead>) => {
			// A repeated call has to keep throwing from `writeHead`, not from a header set here.
			if (res.headersSent) return writeHead(...args);

			copyWriteHeadHeaders(res, args);

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
