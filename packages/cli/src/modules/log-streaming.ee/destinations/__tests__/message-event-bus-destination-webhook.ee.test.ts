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
				} as any,
			};

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);

			expect(destination.axiosInstance.defaults.proxy).toEqual({
				protocol: 'http',
				host: '127.0.0.1',
				port: 3128,
			});
		});

		it('should pass through flat proxy config when not nested', () => {
			const options: MessageEventBusDestinationWebhookOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				url: 'https://example.com/webhook',
				options: {
					proxy: {
						protocol: 'https',
						host: 'proxy.example.com',
						port: 9000,
					},
				},
			};

			const destination = new MessageEventBusDestinationWebhook(mockEventBus, options);

			expect(destination.axiosInstance.defaults.proxy).toEqual({
				protocol: 'https',
				host: 'proxy.example.com',
				port: 9000,
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
});
