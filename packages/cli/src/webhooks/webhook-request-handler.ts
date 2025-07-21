import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type express from 'express';
import {
	isHtmlRenderedContentType,
	sandboxHtmlResponse,
	createHtmlSandboxTransformStream,
} from 'n8n-core';
import { ensureError, type IHttpRequestMethods } from 'n8n-workflow';
import { finished } from 'stream/promises';

import { WebhookService } from './webhook.service';

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
import type {
	IWebhookManager,
	WebhookOptionsRequest,
	WebhookRequest,
	WebhookResponseHeaders,
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

			// Modern way of responding to webhooks
			if (isWebhookResponse(response)) {
				await this.sendWebhookResponse(res, response);
			} else {
				// Legacy way of responding to webhooks. `WebhookResponse` should be used to
				// pass the response from the webhookManager. However, we still have code
				// that doesn't use that yet. We need to keep this here until all codepaths
				// return a `WebhookResponse` instead.
				if (response.noWebhookResponse !== true) {
					ResponseHelper.sendSuccessResponse(
						res,
						response.data,
						true,
						response.responseCode,
						response.headers,
					);
				}
			}
		} catch (e) {
			const error = ensureError(e);

			const logger = Container.get(Logger);

			if (e instanceof WebhookNotFoundError) {
				const currentlyRegistered = await Container.get(WebhookService).findAll();
				logger.error(`Received request for unknown webhook: ${e.message}`, {
					currentlyRegistered: currentlyRegistered.map((w) => w.display()),
				});
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

		const contentType = res.getHeader('content-type') as string | undefined;
		const needsSandbox = contentType && isHtmlRenderedContentType(contentType);

		const streamToSend = needsSandbox ? stream.pipe(createHtmlSandboxTransformStream()) : stream;
		streamToSend.pipe(res, { end: false });
		await finished(streamToSend);

		process.nextTick(() => res.end());
	}

	private sendStaticResponse(res: express.Response, webhookResponse: WebhookStaticResponse) {
		const { body, code, headers } = webhookResponse;

		this.setResponseStatus(res, code);
		this.setResponseHeaders(res, headers);

		const contentType = res.getHeader('content-type') as string | undefined;

		if (typeof body === 'string') {
			const needsSandbox = !contentType || isHtmlRenderedContentType(contentType);
			const bodyToSend = needsSandbox ? sandboxHtmlResponse(body) : body;
			res.send(bodyToSend);
		} else {
			const needsSandbox = contentType && isHtmlRenderedContentType(contentType);
			if (needsSandbox) {
				res.send(sandboxHtmlResponse(JSON.stringify(body)));
			} else {
				res.json(body);
			}
		}
	}

	private setResponseStatus(res: express.Response, statusCode?: number) {
		if (statusCode !== undefined) {
			res.status(statusCode);
		}
	}

	private setResponseHeaders(res: express.Response, headers?: WebhookResponseHeaders) {
		if (headers) {
			for (const [name, value] of headers.entries()) {
				res.setHeader(name, value);
			}
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
		const { params } = req;
		if (Array.isArray(params.path)) {
			params.path = params.path.join('/');
		}
		await handler.handleRequest(req, res);
	};
}
