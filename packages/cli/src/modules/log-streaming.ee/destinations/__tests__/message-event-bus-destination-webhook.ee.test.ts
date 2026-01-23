import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationWebhookOptions } from 'n8n-workflow';

import { MessageEventBusDestinationWebhook } from '../message-event-bus-destination-webhook.ee';

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
});
