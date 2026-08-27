import type { INodeParameters } from 'n8n-workflow';
import {
	defaultMessageEventBusDestinationWebhookOptions,
	defaultMessageEventBusDestinationSentryOptions,
	defaultMessageEventBusDestinationSyslogOptions,
	MessageEventBusDestinationTypeNames,
} from 'n8n-workflow';

import { isDestinationComplete } from './logStreaming.utils';

// The exported defaults ship with an empty id, which the base schema rejects.
const asParams = (options: object) =>
	({ ...options, id: 'test-destination' }) as unknown as INodeParameters;

describe('isDestinationComplete', () => {
	it('returns false for abstract or unknown destinations', () => {
		expect(
			isDestinationComplete(asParams({ __type: MessageEventBusDestinationTypeNames.abstract })),
		).toBe(false);
		expect(isDestinationComplete(asParams({}))).toBe(false);
	});

	describe('webhook', () => {
		it('is incomplete when the url is not a valid URL', () => {
			expect(isDestinationComplete(asParams(defaultMessageEventBusDestinationWebhookOptions))).toBe(
				false,
			);
		});

		it('is complete with a valid url', () => {
			expect(
				isDestinationComplete(
					asParams({
						...defaultMessageEventBusDestinationWebhookOptions,
						url: 'https://example.com/hook',
					}),
				),
			).toBe(true);
		});
	});

	describe('sentry', () => {
		it('is incomplete when the dsn is not a valid URL', () => {
			expect(isDestinationComplete(asParams(defaultMessageEventBusDestinationSentryOptions))).toBe(
				false,
			);
		});

		it('is complete with a valid dsn', () => {
			expect(
				isDestinationComplete(
					asParams({
						...defaultMessageEventBusDestinationSentryOptions,
						dsn: 'https://abc@sentry.example.com/123',
					}),
				),
			).toBe(true);
		});
	});

	describe('syslog', () => {
		it('is complete for the default syslog options', () => {
			expect(isDestinationComplete(asParams(defaultMessageEventBusDestinationSyslogOptions))).toBe(
				true,
			);
		});

		it('is incomplete when the protocol is missing', () => {
			expect(
				isDestinationComplete(
					asParams({ ...defaultMessageEventBusDestinationSyslogOptions, protocol: undefined }),
				),
			).toBe(false);
		});

		it('rejects an empty-string protocol through the schema', () => {
			expect(
				isDestinationComplete(
					asParams({ ...defaultMessageEventBusDestinationSyslogOptions, protocol: '' }),
				),
			).toBe(false);
		});

		it('is incomplete when the host is empty', () => {
			expect(
				isDestinationComplete(
					asParams({ ...defaultMessageEventBusDestinationSyslogOptions, host: '' }),
				),
			).toBe(false);
		});

		it('is incomplete when app_name is empty', () => {
			expect(
				isDestinationComplete(
					asParams({ ...defaultMessageEventBusDestinationSyslogOptions, app_name: '' }),
				),
			).toBe(false);
		});
	});
});
