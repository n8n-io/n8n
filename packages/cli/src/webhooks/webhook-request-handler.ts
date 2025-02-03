import { Container } from '@n8n/di';
import type express from 'express';
import { Logger } from 'n8n-core';
import { ensureError, type IHttpRequestMethods } from 'n8n-workflow';

import * as ResponseHelper from '@/response-helper';
import type {
	IWebhookManager,
	WebhookOptionsRequest,
	WebhookRequest,
} from '@/webhooks/webhook.types';

const WEBHOOK_METHODS: IHttpRequestMethods[] = ['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'];

class WebhookRequestHandler {
	constructor(private readonly webhookManager: IWebhookManager) {}

	/**
	 * Handles an incoming webhook request. Handles CORS and delegates the
	 * request to the webhook manager to execute the webhook.
	 */
	async handleRequest(req: WebhookRequest | WebhookOptionsRequest, res: express.Response) {
		const method = req.method;

		if (method !== 'OPTIONS' && !WEBHOOK_METHODS.includes(method)) {
			return ResponseHelper.sendErrorResponse(
				res,
				new Error(`The method ${method} is not supported.`),
			);
		}

		// Setup CORS headers only if the incoming request has an `origin` header
		if ('origin' in req.headers) {
			const corsSetupError = await this.setupCorsHeaders(req, res);
			if (corsSetupError) {
				return ResponseHelper.sendErrorResponse(res, corsSetupError);
			}
		}

		if (method === 'OPTIONS') {
			return ResponseHelper.sendSuccessResponse(res, {}, true, 204);
		}

		try {
			const response = await this.webhookManager.executeWebhook(req, res);

			// Don't respond, if already responded
			if (response.noWebhookResponse !== true) {
				ResponseHelper.sendSuccessResponse(
					res,
					response.data,
					true,
					response.responseCode,
					response.headers,
				);
			}
		} catch (e) {
			const error = ensureError(e);
			Container.get(Logger).debug(
				`Error in handling webhook request ${req.method} ${req.path}: ${error.message}`,
				{ stacktrace: error.stack },
			);

			return ResponseHelper.sendErrorResponse(res, error);
		}
	}

	private async setupCorsHeaders(
		req: WebhookRequest | WebhookOptionsRequest,
		res: express.Response,
	): Promise<Error | null> {
		const method = req.method;
		const { path } = req.params;

		if (this.webhookManager.getWebhookMethods) {
			try {
				const allowedMethods = await this.webhookManager.getWebhookMethods(path);
				res.header('Access-Control-Allow-Methods', ['OPTIONS', ...allowedMethods].join(', '));
			} catch (error) {
				return error as Error;
			}
		}

		const requestedMethod =
			method === 'OPTIONS'
				? (req.headers['access-control-request-method'] as IHttpRequestMethods)
				: method;
		if (this.webhookManager.findAccessControlOptions && requestedMethod) {
			const options = await this.webhookManager.findAccessControlOptions(path, requestedMethod);
			const { allowedOrigins } = options ?? {};

			if (allowedOrigins && allowedOrigins !== '*' && allowedOrigins !== req.headers.origin) {
				const originsList = allowedOrigins.split(',');
				const defaultOrigin = originsList[0];

				if (originsList.length === 1) {
					res.header('Access-Control-Allow-Origin', defaultOrigin);
				}

				if (originsList.includes(req.headers.origin as string)) {
					res.header('Access-Control-Allow-Origin', req.headers.origin);
				} else {
					res.header('Access-Control-Allow-Origin', defaultOrigin);
				}
			} else {
				res.header('Access-Control-Allow-Origin', req.headers.origin);
			}

			if (method === 'OPTIONS') {
				res.header('Access-Control-Max-Age', '300');
				const requestedHeaders = req.headers['access-control-request-headers'];
				if (requestedHeaders?.length) {
					res.header('Access-Control-Allow-Headers', requestedHeaders);
				}
			}
		}

		return null;
	}
}

export function createWebhookHandlerFor(webhookManager: IWebhookManager) {
	const handler = new WebhookRequestHandler(webhookManager);

	return async (req: WebhookRequest | WebhookOptionsRequest, res: express.Response) => {
		await handler.handleRequest(req, res);
	};
}
