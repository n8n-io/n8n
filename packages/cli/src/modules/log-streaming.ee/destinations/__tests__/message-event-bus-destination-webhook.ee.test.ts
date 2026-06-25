import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { IHttpRequestOptions, MessageEventBusDestinationWebhookOptions } from 'n8n-workflow';

import { CredentialsHelper } from '@/credentials-helper';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestinationWebhook } from '../message-event-bus-destination-webhook.ee';

const mockEventBus = {} as MessageEventBus;

const createMessage = () =>
	({
		ts: { toISO: () => '2020-01-01T00:00:00.000Z' },
		payload: { foo: 'bar' },
		anonymize: () => ({ anonymized: true }),
		eventName: 'n8n.workflow.success',
	}) as any;

/**
 * Build an `OutboundHttp` mock whose `request()` resolves to the given response
 * and whose `requests()` is a spy, so tests can assert the SSRF option and the
 * mapped request options.
 */
const mockOutboundHttp = (
	response: { statusCode: number; body: unknown } = { statusCode: 200, body: {} },
) => {
	const request = jest.fn().mockResolvedValue(response);
	const requests = jest.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	const outboundHttp = mock<OutboundHttp>({ requests });
	return { outboundHttp, requests, request };
};

/**
 * Drive a single `receiveFromEventBus` so the destination builds and sends its
 * request through the injected facade, returning the captured request options.
 */
const sendThroughDestination = async (options: MessageEventBusDestinationWebhookOptions) => {
	const { outboundHttp, requests, request } = mockOutboundHttp();

	const destination = new MessageEventBusDestinationWebhook(mockEventBus, options, outboundHttp);
	await destination.receiveFromEventBus({
		msg: createMessage(),
		confirmCallback: jest.fn(),
	} as any);

	return {
		destination,
		requests,
		sentOptions: request.mock.calls[0][0] as IHttpRequestOptions,
	};
};

beforeEach(() => {
	jest.clearAllMocks();
	mockInstance(CredentialsHelper);
});

describe('MessageEventBusDestinationWebhook', () => {
	describe('isMessageEventBusDestinationWebhookOptions', () => {
		it('should identify valid webhook options', () => {
			const {
				isMessageEventBusDestinationWebhookOptions,
			} = require('../message-event-bus-destination-webhook.ee');

			const validOptions: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				method: 'POST',
				label: 'Test Webhook',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			expect(isMessageEventBusDestinationWebhookOptions(validOptions)).toBe(true);
		});

		it('should reject invalid options', () => {
			const {
				isMessageEventBusDestinationWebhookOptions,
			} = require('../message-event-bus-destination-webhook.ee');

			expect(isMessageEventBusDestinationWebhookOptions({})).toBe(false);
			expect(isMessageEventBusDestinationWebhookOptions(null)).toBe(false);
			expect(isMessageEventBusDestinationWebhookOptions({ label: 'test' })).toBe(false);
		});
	});

	describe('deserialize', () => {
		it('should return null for invalid data', () => {
			const invalidOptions = {
				__type: 'invalid',
				id: 'webhook-1',
			} as any;

			const destination = MessageEventBusDestinationWebhook.deserialize(
				null as any,
				invalidOptions,
				mock<OutboundHttp>(),
			);

			expect(destination).toBeNull();
		});
	});

	describe('receiveFromEventBus', () => {
		it('should send through OutboundHttp with SSRF disabled', async () => {
			const { requests, sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
			});

			expect(requests).toHaveBeenCalledWith({ ssrf: 'disabled' });
			expect(sentOptions).toMatchObject({
				url: 'https://example.com/webhook',
				method: 'POST',
				returnFullResponse: true,
				json: true,
			});
		});

		it('should map the message payload to the JSON body', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
			});

			expect(sentOptions.json).toBe(true);
			expect(sentOptions.body).toMatchObject({
				payload: { foo: 'bar' },
				ts: '2020-01-01T00:00:00.000Z',
			});
		});

		it('should confirm only when the response status matches the expected code', async () => {
			const confirmCallback = jest.fn();
			const { outboundHttp } = mockOutboundHttp({ statusCode: 418, body: {} });

			const destination = new MessageEventBusDestinationWebhook(
				mockEventBus,
				{
					__type: MessageEventBusDestinationTypeNames.webhook,
					url: 'https://example.com/webhook',
					responseCodeMustMatch: true,
					expectedStatusCode: 200,
				},
				outboundHttp,
			);

			const result = await destination.receiveFromEventBus({
				msg: createMessage(),
				confirmCallback,
			} as any);

			expect(result).toBe(false);
			expect(confirmCallback).not.toHaveBeenCalled();
		});
	});

	describe('TLS option mapping', () => {
		it('should map allowUnauthorizedCerts to skipSslCertificateValidation', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: { allowUnauthorizedCerts: true },
			});

			expect(sentOptions.skipSslCertificateValidation).toBe(true);
		});

		it('should not set skipSslCertificateValidation when certs are validated', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
			});

			expect(sentOptions.skipSslCertificateValidation).toBeUndefined();
		});
	});

	describe('redirect option mapping', () => {
		it('should disable following redirects by default', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
			});

			expect(sentOptions.disableFollowRedirect).toBe(true);
		});

		it('should follow redirects when the destination opts in', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: { redirect: { redirect: { followRedirects: true, maxRedirects: 10 } } },
			});

			expect(sentOptions.disableFollowRedirect).toBe(false);
		});

		it('should forward the configured redirect limit when following redirects', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: { redirect: { redirect: { followRedirects: true, maxRedirects: 10 } } },
			});

			expect(sentOptions.maxRedirects).toBe(10);
		});
	});

	describe('agent option mapping', () => {
		it('should map socket pool settings to agentOptions', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: { socket: { keepAlive: false, maxSockets: 10, maxFreeSockets: 2 } },
			});

			expect(sentOptions.agentOptions).toMatchObject({
				keepAlive: false,
				maxSockets: 10,
				maxFreeSockets: 2,
			});
		});

		it('should map the socket timeout to the top-level timeout', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: { timeout: 1234 },
			});

			expect(sentOptions.timeout).toBe(1234);
		});
	});

	describe('proxy option mapping', () => {
		it('should unwrap nested proxy from fixedCollection shape (options.proxy.proxy)', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					proxy: {
						proxy: {
							protocol: 'http',
							host: '127.0.0.1',
							port: 3128,
						},
					},
				},
			});

			expect(sentOptions.proxy).toEqual({
				protocol: 'http',
				host: '127.0.0.1',
				port: 3128,
			});
		});

		it('should handle flat proxy from legacy DB data', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					proxy: {
						protocol: 'http',
						host: '127.0.0.1',
						port: 3128,
					},
				} as any,
			});

			expect(sentOptions.proxy).toEqual({
				protocol: 'http',
				host: '127.0.0.1',
				port: 3128,
			});
		});

		it('should leave proxy unset when options.proxy is absent (env is used)', async () => {
			const { sentOptions } = await sendThroughDestination({
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
			});

			expect(sentOptions.proxy).toBeUndefined();
		});
	});

	describe('serialize', () => {
		it('should preserve nested proxy for frontend fixedCollection', () => {
			const options: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					proxy: {
						proxy: {
							protocol: 'http',
							host: '127.0.0.1',
							port: 3128,
						},
					},
				},
			};

			const destination = new MessageEventBusDestinationWebhook(
				mockEventBus,
				options,
				mock<OutboundHttp>(),
			);
			const serialized = destination.serialize();

			expect(serialized.options?.proxy).toEqual({
				proxy: {
					protocol: 'http',
					host: '127.0.0.1',
					port: 3128,
				},
			});
		});

		it('should re-nest flat proxy from legacy DB data', () => {
			const options: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					proxy: {
						protocol: 'http',
						host: '127.0.0.1',
						port: 3128,
					},
				} as any,
			};

			const destination = new MessageEventBusDestinationWebhook(
				mockEventBus,
				options,
				mock<OutboundHttp>(),
			);
			const serialized = destination.serialize();

			expect(serialized.options?.proxy).toEqual({
				proxy: {
					protocol: 'http',
					host: '127.0.0.1',
					port: 3128,
				},
			});
		});

		it('should re-nest flat redirect from legacy DB data', () => {
			const options: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					redirect: {
						followRedirects: true,
						maxRedirects: 10,
					},
				} as any,
			};

			const destination = new MessageEventBusDestinationWebhook(
				mockEventBus,
				options,
				mock<OutboundHttp>(),
			);
			const serialized = destination.serialize();

			expect(serialized.options?.redirect).toEqual({
				redirect: {
					followRedirects: true,
					maxRedirects: 10,
				},
			});
		});

		it('should preserve nested redirect for frontend fixedCollection', () => {
			const options: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					redirect: {
						redirect: {
							followRedirects: true,
							maxRedirects: 10,
						},
					},
				},
			};

			const destination = new MessageEventBusDestinationWebhook(
				mockEventBus,
				options,
				mock<OutboundHttp>(),
			);
			const serialized = destination.serialize();

			expect(serialized.options?.redirect).toEqual({
				redirect: {
					followRedirects: true,
					maxRedirects: 10,
				},
			});
		});
	});
});
