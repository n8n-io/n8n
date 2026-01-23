import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationSentryOptions } from 'n8n-workflow';

import { MessageEventBusDestinationSentry } from '../message-event-bus-destination-sentry.ee';

describe('MessageEventBusDestinationSentry', () => {
	describe('isMessageEventBusDestinationSentryOptions', () => {
		it('should identify valid sentry options', () => {
			const {
				isMessageEventBusDestinationSentryOptions,
			} = require('../message-event-bus-destination-sentry.ee');

			const validOptions: MessageEventBusDestinationSentryOptions = {
				__type: MessageEventBusDestinationTypeNames.sentry,
				dsn: 'https://example.sentry.io/123',
				label: 'Test Sentry',
				enabled: true,
				subscribedEvents: ['n8n.workflow.failed'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			expect(isMessageEventBusDestinationSentryOptions(validOptions)).toBe(true);
		});

		it('should reject invalid options', () => {
			const {
				isMessageEventBusDestinationSentryOptions,
			} = require('../message-event-bus-destination-sentry.ee');

			expect(isMessageEventBusDestinationSentryOptions({})).toBe(false);
			expect(isMessageEventBusDestinationSentryOptions(null)).toBe(false);
			expect(isMessageEventBusDestinationSentryOptions({ label: 'test' })).toBe(false);
		});
	});

	describe('deserialize', () => {
		it('should return null for invalid data', () => {
			const invalidOptions = {
				__type: 'invalid',
				id: 'sentry-1',
			} as any;

			const destination = MessageEventBusDestinationSentry.deserialize(null as any, invalidOptions);

			expect(destination).toBeNull();
		});
	});
});
