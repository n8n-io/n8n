import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type express from 'express';
import { isWebhookHtmlSandboxingDisabled, getHtmlSandboxCSP } from 'n8n-core';
import { ensureError, type IHttpRequestMethods } from 'n8n-workflow';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

import { WebhookNotFoundError } from '@/errors/response-errors/webhook-not-found.error';
import * as ResponseHelper from '@/response-helper';
import type {
	WebhookStaticResponse,
	WebhookResponse,
	WebhookResponseStream,
} from '@/webhooks/webhook-response';
import {
	isWebhookNoResponse,
	isWebhookStaticResponse,
	isWebhookResponse,
	isWebhookStreamResponse,
} from '@/webhooks/webhook-response';
import { WebhookResponseHeaders } from '@/webhooks/webhook-response-headers';
import type {
	IWebhookManager,
	WebhookOptionsRequest,
	WebhookRequest,
} from '@/webhooks/webhook.types';
import { CorsPolicy } from './cors-policy';
import type { IWebhookMethodResolver } from './webhook-method-resolver.types';

const WEBHOOK_METHODS: IHttpRequestMethods[] = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'];

class WebhookRequestHandler {
	private readonly corsPolicy: CorsPolicy;

	constructor(private readonly webhookManager: IWebhookManager) {
		this.corsPolicy = new CorsPolicy();
	}

	/**
	 * Handles an incoming webhook request. Handles CORS and delegates the
	 * request to the webhook manager to execute the webhook.
	 *
	 * **CORS Preflight Invariants (OPTIONS requests):**
	 * - CORS headers MUST be set for all OPTIONS requests (even without Origin header)
	 * - Access-Control-Allow-Methods MUST be set if webhook manager supports it
	 * - Access-Control-Allow-Origin MUST be set (handles null origin explicitly)
	 * - Access-Control-Max-Age MUST be set for preflight caching
	 * - Access-Control-Allow-Headers MUST echo requested headers if present
	 *
	 * **Why OPTIONS always needs CORS headers:**
	 * - Browsers send OPTIONS preflight before POST/PUT/PATCH with custom headers
	 * - Browsers from `file://` URLs send `Origin: null` (string "null")
	 * - Some browsers may omit Origin header in edge cases
	 * - Preflight MUST succeed for actual request to proceed
	 */
	async handleRequest(req: WebhookRequest | WebhookOptionsRequest, res: express.Response) {
		const method = req.method;

		if (method !== 'OPTIONS' && !WEBHOOK_METHODS.includes(method)) {
			return ResponseHelper.sendErrorResponse(
				res,
				new Error(`The method ${method} is not supported.`),
			);
		}

		// **INVARIANT:** OPTIONS requests ALWAYS need CORS headers, even without Origin header
		// This ensures browser preflight requests succeed regardless of origin (including null origin)
		const needsCorsHeaders = method === 'OPTIONS' || 'origin' in req.headers;

		if (needsCorsHeaders) {
			const corsSetupError = await this.setupCorsHeaders(req, res);
			if (corsSetupError) {
				return ResponseHelper.sendErrorResponse(res, corsSetupError);
			}
		}

		// **INVARIANT:** OPTIONS requests return 204 No Content after CORS headers are set
		if (method === 'OPTIONS') {
			return ResponseHelper.sendSuccessResponse(res, {}, true, 204);
		}

		try {
			const response = await this.webhookManager.executeWebhook(req, res);

			// Modern way of responding to webhooks
			if (isWebhookResponse(response)) {
				await this.sendWebhookResponse(res, response);
			} else if (response.noWebhookResponse !== true) {
				// Legacy way of responding to webhooks. `WebhookResponse` should be used to
				// pass the response from the webhookManager. However, we still have code
				// that doesn't use that yet. We need to keep this here until all codepaths
				// return a `WebhookResponse` instead.
				this.sendLegacyResponse(res, response.data, true, response.responseCode, response.headers);
			}
		} catch (e) {
			const error = ensureError(e);

			const logger = Container.get(Logger);

			if (e instanceof WebhookNotFoundError) {
				logger.error(`Received request for unknown webhook: ${e.message}`);
			} else {
				logger.error(
					`Error in handling webhook request ${req.method} ${req.path}: ${error.message}`,
					{ stacktrace: error.stack },
				);
			}

			return ResponseHelper.sendErrorResponse(res, error);
		}
	}

	private async sendWebhookResponse(res: express.Response, webhookResponse: WebhookResponse) {
		if (isWebhookNoResponse(webhookResponse)) {
			return;
		}

		if (isWebhookStaticResponse(webhookResponse)) {
			this.sendStaticResponse(res, webhookResponse);
			return;
		}

		if (isWebhookStreamResponse(webhookResponse)) {
			await this.sendStreamResponse(res, webhookResponse);
			return;
		}
	}

	private async sendStreamResponse(res: express.Response, webhookResponse: WebhookResponseStream) {
		const { stream, code, headers } = webhookResponse;

		this.setResponseStatus(res, code);
		this.setResponseHeaders(res, headers);

		stream.pipe(res, { end: false });
		await finished(stream);

		process.nextTick(() => res.end());
	}

	private sendStaticResponse(res: express.Response, webhookResponse: WebhookStaticResponse) {
		const { body, code, headers } = webhookResponse;

		this.setResponseStatus(res, code);
		this.setResponseHeaders(res, headers);

		if (typeof body === 'string') {
			res.send(body);
		} else {
			res.json(body);
		}
	}

	private setResponseStatus(res: express.Response, statusCode?: number) {
		if (statusCode !== undefined) {
			res.status(statusCode);
		}
	}

	private setResponseHeaders(res: express.Response, headers?: WebhookResponseHeaders) {
		headers?.applyToResponse(res);

		if (!isWebhookHtmlSandboxingDisabled()) {
			res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		}
	}

	/**
	 * Sends a legacy response to the client, i.e. when the webhook response is not a `WebhookResponse`.
	 * @deprecated Use `sendWebhookResponse` instead.
	 */
	private sendLegacyResponse(
		res: express.Response,
		data: any,
		raw?: boolean,
		responseCode?: number,
		responseHeader?: object,
	) {
		this.setResponseStatus(res, responseCode);
		if (responseHeader) {
			this.setResponseHeaders(res, WebhookResponseHeaders.fromObject(responseHeader));
		}

		if (data instanceof Readable) {
			data.pipe(res);
			return;
		}

		if (raw === true) {
			if (typeof data === 'string') {
				res.send(data);
			} else {
				res.json(data);
			}
		} else {
			res.json({
				data,
			});
		}
	}

	/**
	 * Sets up CORS headers for webhook requests using the CORS policy module.
	 *
	 * This method delegates to the CorsPolicy service, which handles:
	 * - Method resolution via IWebhookMethodResolver interface
	 * - Origin policy application
	 * - Preflight header generation
	 *
	 * **Invariants for OPTIONS (preflight) requests:**
	 * 1. Access-Control-Allow-Methods MUST be set if methods are resolved
	 * 2. Access-Control-Allow-Origin MUST always be set (handles null origin explicitly)
	 * 3. Access-Control-Max-Age MUST be set (300 seconds for preflight caching)
	 * 4. Access-Control-Allow-Headers MUST echo requested headers if present
	 *
	 * **Null Origin Handling:**
	 * - Browsers from `file://` URLs send `Origin: null` (literal string "null")
	 * - Some browsers may omit Origin header entirely
	 * - The CorsPolicy service handles normalization and policy application
	 *
	 * @param req - Webhook request (may be OPTIONS preflight)
	 * @param res - Express response object
	 * @returns Error if CORS setup fails, null otherwise
	 */
	private async setupCorsHeaders(
		req: WebhookRequest | WebhookOptionsRequest,
		res: express.Response,
	): Promise<Error | null> {
		const method = req.method;
		const { path } = req.params;
		const isPreflight = method === 'OPTIONS';

		// Resolve allowed methods using the method resolver interface
		let allowedMethods: IHttpRequestMethods[] | undefined;
		const methodResolver = this.getMethodResolver();
		if (methodResolver) {
			try {
				allowedMethods = await methodResolver.resolveMethods(path);
			} catch (error) {
				// If getting methods fails, return error (don't proceed with incomplete CORS headers)
				return error as Error;
			}
		}

		// Determine the HTTP method being requested (for preflight, use Access-Control-Request-Method)
		const requestedMethod = isPreflight
			? (req.headers['access-control-request-method'] as IHttpRequestMethods)
			: method;

		// Get CORS origin policy from webhook manager
		let originPolicy;
		if (this.webhookManager.findAccessControlOptions && requestedMethod) {
			originPolicy = await this.webhookManager.findAccessControlOptions(path, requestedMethod);
		}

		// Apply CORS headers using the policy service
		const config = {
			allowedMethods,
			originPolicy,
			isPreflight,
			requestedMethod,
		};

		const corsError = this.corsPolicy.applyCorsHeaders(req, res, config);
		if (corsError) {
			return corsError;
		}

		// Fallback: If webhook manager doesn't support CORS config, still set basic headers
		// This ensures OPTIONS requests don't fail even for webhook managers without CORS support
		if (!originPolicy && isPreflight) {
			this.corsPolicy.applyFallbackCorsHeaders(req, res, allowedMethods);
		}

		return null;
	}

	/**
	 * Gets the method resolver from the webhook manager if it implements IWebhookMethodResolver.
	 *
	 * This allows webhook managers to optionally implement the interface for explicit method resolution.
	 * Falls back to the legacy getWebhookMethods method for backward compatibility.
	 */
	private getMethodResolver(): IWebhookMethodResolver | null {
		// Check if webhook manager implements IWebhookMethodResolver
		if ('resolveMethods' in this.webhookManager && typeof this.webhookManager.resolveMethods === 'function') {
			return this.webhookManager as IWebhookMethodResolver;
		}

		// Fallback to legacy getWebhookMethods for backward compatibility
		if (this.webhookManager.getWebhookMethods) {
			return {
				resolveMethods: (path: string) => this.webhookManager.getWebhookMethods!(path),
			};
		}

		return null;
	}
}

export function createWebhookHandlerFor(webhookManager: IWebhookManager) {
	const handler = new WebhookRequestHandler(webhookManager);

	return async (req: WebhookRequest | WebhookOptionsRequest, res: express.Response) => {
		const { params } = req;
		if (Array.isArray(params.path)) {
			params.path = params.path.join('/');
		}
		await handler.handleRequest(req, res);
	};
}
