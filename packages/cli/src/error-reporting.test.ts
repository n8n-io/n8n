import { GlobalConfig } from '@n8n/config';
import type { ClientOptions, ErrorEvent } from '@sentry/types';
import { strict as assert } from 'node:assert';
import { Container } from 'typedi';

import { InternalServerError } from '@/errors/response-errors/internal-server.error';

import type { initErrorHandling as Handler } from './error-reporting';

const init = jest.fn();
const setTag = jest.fn();
const captureException = jest.fn();

jest.mock('@sentry/integrations');
jest.mock('@sentry/node', () => ({
	init,
	setTag,
	captureException,
	Integrations: {},
}));

jest.spyOn(process, 'on');

describe('initErrorHandling', () => {
	let errorReporting: { initErrorHandling: typeof Handler };
	beforeEach(() => {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		errorReporting = require('./error-reporting');
	});

	afterEach(() => {
		jest.resetModules();
		jest.resetAllMocks();
	});

	it('does not initialize if config is not set', async () => {
		Container.get(GlobalConfig).sentry.backendDsn = '';
		await errorReporting.initErrorHandling();

		expect(init).not.toHaveBeenCalled();
	});

	it('keeps events with error cause', async () => {
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
