import type * as Sentry from '@sentry/vue';
import { beforeSend } from '@/app/plugins/sentry';
import { AxiosError } from 'axios';
import { ResponseError } from '@n8n/rest-api-client';

function createErrorEvent(): Sentry.ErrorEvent {
	return {} as Sentry.ErrorEvent;
}

describe('beforeSend', () => {
	it('should return null when originalException is undefined', () => {
		const event = createErrorEvent();
		const hint = { originalException: undefined };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it('should return null when originalException matches ignoredErrors by instance and message', () => {
		const event = createErrorEvent();
		const hint = { originalException: new ResponseError("Can't connect to n8n.") };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it('should return null when originalException matches ignoredErrors by instance and message regex', () => {
		const event = createErrorEvent();
		const hint = { originalException: new ResponseError('ECONNREFUSED') };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it('should return null for missing AI assistant sessions', () => {
		const event = createErrorEvent();
		const hint = { originalException: new ResponseError('Session not found') };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it('should return null when originalException matches ignoredErrors by instance only', () => {
		const event = createErrorEvent();
		const hint = { originalException: new AxiosError() };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it('should return null when originalException matches ignoredErrors by instance and message regex (ResizeObserver)', () => {
		const event = createErrorEvent();
		const hint = { originalException: new Error('ResizeObserver loop limit exceeded') };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it.each([
		'Failed to fetch dynamically imported module: https://example.com/assets/RunDataSearch-abc.js',
		'error loading dynamically imported module: https://example.com/assets/RunDataSearch-abc.js',
		'Importing a module script failed.',
	])('should return null for stale-chunk preload TypeError: %s', (message) => {
		const event = createErrorEvent();
		const hint = { originalException: new TypeError(message) };
		expect(beforeSend(event, hint)).toBeNull();
	});

	it('should return event when originalException does not match any ignoredErrors', () => {
		const event = createErrorEvent();
		const hint = { originalException: new Error('Some other error') };
		expect(beforeSend(event, hint)).toEqual(event);
	});
});
