import { GlobalConfig } from '@n8n/config';
import type { ClientOptions, ErrorEvent } from '@sentry/types';
import { strict as assert } from 'node:assert';
import { Container } from 'typedi';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';

const init = jest.fn();

jest.mock('@sentry/node', () => ({
	init,
	setTag: jest.fn(),
	captureException: jest.fn(),
	Integrations: {},
}));

jest.spyOn(process, 'on');

describe('initErrorHandling', () => {
	let beforeSend: ClientOptions['beforeSend'];

	beforeAll(async () => {
		Container.get(GlobalConfig).sentry.backendDsn = 'backend-dsn';
		const errorReporting = require('@/error-reporting');
		await errorReporting.initErrorHandling();
		const options = (init.mock.calls[0] as [ClientOptions])[0];
		beforeSend = options.beforeSend;
	});

	it('ignores errors with level warning', async () => {
		const originalException = new InternalServerError('test');
		originalException.level = 'warning';

		const event = {} as ErrorEvent;

		assert(beforeSend);
		expect(await beforeSend(event, { originalException })).toEqual(null);
	});

	it('keeps events with a cause with error level', async () => {
		const cause = new Error('cause-error');

		const originalException = new InternalServerError('test', cause);
		const event = {} as ErrorEvent;

		assert(beforeSend);
		expect(await beforeSend(event, { originalException })).toEqual(event);
	});

	it('ignores events with error cause with warning level', async () => {
		const cause: Error & { level?: 'warning' } = new Error('cause-error');
		cause.level = 'warning';

		const originalException = new InternalServerError('test', cause);
		const event = {} as ErrorEvent;

		assert(beforeSend);
		expect(await beforeSend(event, { originalException })).toEqual(null);
	});
});
