import { GlobalConfig } from '@n8n/config';
import type { ClientOptions, ErrorEvent } from '@sentry/types';
import { strict as assert } from 'node:assert';
import { Container } from 'typedi';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';

const init = jest.fn();

jest.mock('@sentry/integrations');
jest.mock('@sentry/node', () => ({
	init,
	setTag: jest.fn(),
	captureException: jest.fn(),
	Integrations: {},
}));

jest.spyOn(process, 'on');

describe('initErrorHandling', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	it('does not initialize if config is not set', async () => {
		const errorReporting = require('@/error-reporting');
		Container.get(GlobalConfig).sentry.backendDsn = '';
		await errorReporting.initErrorHandling();

		expect(init).not.toHaveBeenCalled();
	});

	it('keeps events with error cause', async () => {
		const errorReporting = require('@/error-reporting');
		Container.get(GlobalConfig).sentry.backendDsn = 'backend-dsn';
		await errorReporting.initErrorHandling();

		expect(init).toHaveBeenCalled();
		const { beforeSend } = (init.mock.calls[0] as [ClientOptions])[0];
		assert(beforeSend);

		const cause = new Error('cause-error');

		const originalException = new InternalServerError('test', cause);
		const event = {} as ErrorEvent;
		expect(await beforeSend(event, { originalException })).toEqual(event);
	});

	it('filters out events with error cause with warning level', async () => {
		const errorReporting = require('@/error-reporting');
		Container.get(GlobalConfig).sentry.backendDsn = 'backend-dsn';
		await errorReporting.initErrorHandling();

		expect(init).toHaveBeenCalled();
		const { beforeSend } = (init.mock.calls[0] as [ClientOptions])[0];
		assert(beforeSend);

		const cause: Error & { level?: 'warning' } = new Error('cause-error');
		cause.level = 'warning';

		const originalException = new InternalServerError('test', cause);
		const event = {} as ErrorEvent;
		expect(await beforeSend(event, { originalException })).toEqual(null);
	});
});
