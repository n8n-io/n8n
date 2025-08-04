'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.createStreamResponse =
	exports.createStaticResponse =
	exports.createNoResponse =
	exports.isWebhookStreamResponse =
	exports.isWebhookStaticResponse =
	exports.isWebhookNoResponse =
	exports.isWebhookResponse =
	exports.WebhookResponseTag =
		void 0;
exports.WebhookResponseTag = Symbol('WebhookResponse');
const isWebhookResponse = (response) => {
	return (
		typeof response === 'object' && response !== null && exports.WebhookResponseTag in response
	);
};
exports.isWebhookResponse = isWebhookResponse;
const isWebhookNoResponse = (response) => {
	return (
		(0, exports.isWebhookResponse)(response) &&
		response[exports.WebhookResponseTag] === 'noResponse'
	);
};
exports.isWebhookNoResponse = isWebhookNoResponse;
const isWebhookStaticResponse = (response) => {
	return (
		(0, exports.isWebhookResponse)(response) && response[exports.WebhookResponseTag] === 'static'
	);
};
exports.isWebhookStaticResponse = isWebhookStaticResponse;
const isWebhookStreamResponse = (response) => {
	return (
		(0, exports.isWebhookResponse)(response) && response[exports.WebhookResponseTag] === 'stream'
	);
};
exports.isWebhookStreamResponse = isWebhookStreamResponse;
const createNoResponse = () => {
	return {
		[exports.WebhookResponseTag]: 'noResponse',
	};
};
exports.createNoResponse = createNoResponse;
const createStaticResponse = (body, code, headers) => {
	return {
		[exports.WebhookResponseTag]: 'static',
		body,
		code,
		headers,
	};
};
exports.createStaticResponse = createStaticResponse;
const createStreamResponse = (stream, code, headers) => {
	return {
		[exports.WebhookResponseTag]: 'stream',
		stream,
		code,
		headers,
	};
};
exports.createStreamResponse = createStreamResponse;
//# sourceMappingURL=webhook-response.js.map
