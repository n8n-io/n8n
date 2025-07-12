import type { Readable } from 'stream';

import type { WebhookResponseHeaders } from './webhook.types';

export const WebhookResponseTag = Symbol('WebhookResponse');

/**
 * Result that indicates that no response needs to be sent. This is used
 * when the node or something else has already sent a response.
 */
export type WebhookNoResponse = {
	[WebhookResponseTag]: 'noResponse';
};

/**
 * Result that indicates that a non-stream response needs to be sent.
 */
export type WebhookNonStreamResponse = {
	[WebhookResponseTag]: 'nonstream';
	body: unknown;
	headers: WebhookResponseHeaders | undefined;
	code: number | undefined;
};

/**
 * Result that indicates that a stream response needs to be sent.
 */
export type WebhookResponseStream = {
	[WebhookResponseTag]: 'stream';
	stream: Readable;
	code: number | undefined;
	headers: WebhookResponseHeaders | undefined;
};

export type WebhookResponse = WebhookNoResponse | WebhookNonStreamResponse | WebhookResponseStream;

export const isWebhookResponse = (response: unknown): response is WebhookResponse => {
	return typeof response === 'object' && response !== null && WebhookResponseTag in response;
};

export const isWebhookNoResponse = (response: unknown): response is WebhookNoResponse => {
	return isWebhookResponse(response) && response[WebhookResponseTag] === 'noResponse';
};

export const isWebhookNonStreamResponse = (
	response: unknown,
): response is WebhookNonStreamResponse => {
	return isWebhookResponse(response) && response[WebhookResponseTag] === 'nonstream';
};

export const isWebhookStreamResponse = (response: unknown): response is WebhookResponseStream => {
	return isWebhookResponse(response) && response[WebhookResponseTag] === 'stream';
};

export const createNoResponse = (): WebhookNoResponse => {
	return {
		[WebhookResponseTag]: 'noResponse',
	};
};

export const createNonStreamResponse = (
	body: unknown,
	code: number | undefined,
	headers: WebhookResponseHeaders | undefined,
): WebhookNonStreamResponse => {
	return {
		[WebhookResponseTag]: 'nonstream',
		body,
		code,
		headers,
	};
};

export const createStreamResponse = (
	stream: Readable,
	code: number | undefined,
	headers: WebhookResponseHeaders | undefined,
): WebhookResponseStream => {
	return {
		[WebhookResponseTag]: 'stream',
		stream,
		code,
		headers,
	};
};
