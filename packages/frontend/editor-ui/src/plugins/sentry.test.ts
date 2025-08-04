import type * as Sentry from '@sentry/vue';
import { beforeSend } from '@/plugins/sentry';
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

	it('should return event when originalException does not match any ignoredErrors', () => {
		const event = createErrorEvent();
		const hint = { originalException: new Error('Some other error') };
		expect(beforeSend(event, hint)).toEqual(event);
	});
});
