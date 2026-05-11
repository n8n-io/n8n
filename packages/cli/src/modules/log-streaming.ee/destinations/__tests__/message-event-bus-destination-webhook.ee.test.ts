import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationWebhookOptions } from 'n8n-workflow';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestinationWebhook } from '../message-event-bus-destination-webhook.ee';

const mockEventBus = {} as MessageEventBus;

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
			);

			expect(destination).toBeNull();
		});
	});

	describe('proxy config (buildAxiosSetting)', () => {
		it('should unwrap nested proxy from fixedCollection shape (options.proxy.proxy)', () => {
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

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);

			expect(destination.axiosInstance.defaults.proxy).toEqual({
				protocol: 'http',
				host: '127.0.0.1',
				port: 3128,
			});
		});

		it('should handle flat proxy from legacy DB data', () => {
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

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);

			expect(destination.axiosInstance.defaults.proxy).toEqual({
				protocol: 'http',
				host: '127.0.0.1',
				port: 3128,
			});
		});

		it('should set proxy to false when options.proxy is absent', () => {
			const options: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
			};

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);

			expect(destination.axiosInstance.defaults.proxy).toBe(false);
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

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);
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

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);
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

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);
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

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);
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
