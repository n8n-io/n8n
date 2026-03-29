import type { Request, Response } from 'express';
import type { IHttpRequestMethods } from 'n8n-workflow';

import { determineAllowedOrigin, isNullOrigin, normalizeOrigin } from './cors-utils';
import type { WebhookAccessControlOptions } from './webhook.types';

/**
 * CORS policy configuration for webhook requests.
 */
export interface CorsPolicyConfig {
	/**
	 * Allowed HTTP methods for the webhook (used for Access-Control-Allow-Methods).
	 * OPTIONS is automatically included.
	 */
	allowedMethods?: IHttpRequestMethods[];

	/**
	 * CORS origin policy from webhook configuration.
	 */
	originPolicy?: WebhookAccessControlOptions;

	/**
	 * Whether this is a preflight (OPTIONS) request.
	 */
	isPreflight: boolean;

	/**
	 * The requested HTTP method (from Access-Control-Request-Method for preflight).
	 */
	requestedMethod?: IHttpRequestMethods;
}

/**
 * CORS policy service that applies CORS headers to webhook responses.
 *
 * This module separates CORS policy logic from request handling, making it:
 * - Reusable across different webhook types
 * - Testable in isolation
 * - Maintainable with clear responsibilities
 *
 * **Security Model:**
 * - CORS headers are applied based on webhook configuration
 * - Wildcard origins (*) are allowed for waiting webhooks (security via URL signatures)
 * - Specific origins are validated against allowed list
 * - Null origins (file:// URLs) are handled explicitly
 */
export class CorsPolicy {
	/**
	 * Applies CORS headers to a response based on the policy configuration.
	 *
	 * **Invariants for OPTIONS (preflight) requests:**
	 * 1. Access-Control-Allow-Methods MUST be set if methods are provided
	 * 2. Access-Control-Allow-Origin MUST always be set
	 * 3. Access-Control-Max-Age MUST be set (300 seconds for preflight caching)
	 * 4. Access-Control-Allow-Headers MUST echo requested headers if present
	 *
	 * @param req - Express request object
	 * @param res - Express response object
	 * @param config - CORS policy configuration
	 * @returns Error if CORS setup fails, null otherwise
	 */
	applyCorsHeaders(
		req: Request,
		res: Response,
		config: CorsPolicyConfig,
	): Error | null {
		const origin = req.headers.origin;
		const normalizedOrigin = normalizeOrigin(origin);

		// **INVARIANT 1:** Set Access-Control-Allow-Methods if provided
		// This is REQUIRED for OPTIONS preflight to succeed
		if (config.allowedMethods && config.allowedMethods.length > 0) {
			// Always include OPTIONS in allowed methods (required for preflight)
			const methods = ['OPTIONS', ...config.allowedMethods].join(', ');
			res.header('Access-Control-Allow-Methods', methods);
		}

		// **INVARIANT 2:** Set Access-Control-Allow-Origin
		// This MUST always be set for CORS to work, especially for preflight requests
		const allowedOrigins = config.originPolicy?.allowedOrigins;
		const accessControlOrigin = determineAllowedOrigin(allowedOrigins, origin);
		res.header('Access-Control-Allow-Origin', accessControlOrigin);

		// **INVARIANT 3 & 4:** Set preflight-specific headers for OPTIONS requests
		if (config.isPreflight) {
			// Set preflight cache duration (300 seconds = 5 minutes)
			res.header('Access-Control-Max-Age', '300');

			// Echo back requested headers if present (required for custom headers like Content-Type: application/json)
			const requestedHeaders = req.headers['access-control-request-headers'];
			if (requestedHeaders?.length) {
				res.header('Access-Control-Allow-Headers', requestedHeaders);
			}
		}

		return null;
	}

	/**
	 * Applies fallback CORS headers when webhook manager doesn't provide CORS configuration.
	 *
	 * This ensures OPTIONS requests don't fail even for webhook managers without CORS support.
	 * This is intentional: we want preflight to succeed, not fail silently.
	 *
	 * @param req - Express request object
	 * @param res - Express response object
	 * @param allowedMethods - Optional list of allowed methods
	 */
	applyFallbackCorsHeaders(
		req: Request,
		res: Response,
		allowedMethods?: IHttpRequestMethods[],
	): void {
		const origin = req.headers.origin;

		// Set allowed methods if provided
		if (allowedMethods && allowedMethods.length > 0) {
			res.header('Access-Control-Allow-Methods', ['OPTIONS', ...allowedMethods].join(', '));
		}

		// Handle null origin explicitly
		const accessControlOrigin = isNullOrigin(origin) ? '*' : origin || '*';
		res.header('Access-Control-Allow-Origin', accessControlOrigin);

		// Set required preflight headers for OPTIONS requests
		if (req.method === 'OPTIONS') {
			res.header('Access-Control-Max-Age', '300');
			const requestedHeaders = req.headers['access-control-request-headers'];
			if (requestedHeaders?.length) {
				res.header('Access-Control-Allow-Headers', requestedHeaders);
			}
		}
	}
}
