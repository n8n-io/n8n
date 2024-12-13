import { QueryFailedError } from '@n8n/typeorm';
import type { ErrorEvent } from '@sentry/types';
import { AxiosError } from 'axios';
import { ApplicationError } from 'n8n-workflow';

import { ErrorReporter } from '@/error-reporter';

jest.mock('@sentry/node', () => ({
	init: jest.fn(),
	setTag: jest.fn(),
	captureException: jest.fn(),
	Integrations: {},
}));

jest.spyOn(process, 'on');

describe('ErrorReporter', () => {
	const errorReporter = new ErrorReporter();
	const event = {} as ErrorEvent;

	describe('beforeSend', () => {
		it('should ignore errors with level warning', async () => {
			const originalException = new ApplicationError('test');
			originalException.level = 'warning';

			expect(await errorReporter.beforeSend(event, { originalException })).toEqual(null);
		});

		it('should keep events with a cause with error level', async () => {
			const cause = new Error('cause-error');
			const originalException = new ApplicationError('test', cause);

			expect(await errorReporter.beforeSend(event, { originalException })).toEqual(event);
		});

		it('should ignore events with error cause with warning level', async () => {
			const cause: Error & { level?: 'warning' } = new Error('cause-error');
			cause.level = 'warning';
			const originalException = new ApplicationError('test', cause);

			expect(await errorReporter.beforeSend(event, { originalException })).toEqual(null);
		});

		it('should set level, extra, and tags from ApplicationError', async () => {
			const originalException = new ApplicationError('Test error', {
				level: 'error',
				extra: { foo: 'bar' },
				tags: { tag1: 'value1' },
			});

			const testEvent = {} as ErrorEvent;

			const result = await errorReporter.beforeSend(testEvent, { originalException });

			expect(result).toEqual({
				level: 'error',
				extra: { foo: 'bar' },
				tags: { tag1: 'value1' },
			});
		});

		it('should deduplicate errors with same stack trace', async () => {
			const originalException = new Error();

			const firstResult = await errorReporter.beforeSend(event, { originalException });
			expect(firstResult).toEqual(event);

			const secondResult = await errorReporter.beforeSend(event, { originalException });
			expect(secondResult).toBeNull();
		});

		it('should handle Promise rejections', async () => {
			const originalException = Promise.reject(new Error());

			const result = await errorReporter.beforeSend(event, { originalException });

			expect(result).toEqual(event);
		});

		test.each([
			['undefined', undefined],
			['null', null],
			['an AxiosError', new AxiosError()],
			['a rejected Promise with AxiosError', Promise.reject(new AxiosError())],
			[
				'a QueryFailedError with SQLITE_FULL',
				new QueryFailedError('', [], new Error('SQLITE_FULL')),
			],
			[
				'a QueryFailedError with SQLITE_IOERR',
				new QueryFailedError('', [], new Error('SQLITE_IOERR')),
			],
			['an ApplicationError with "warning" level', new ApplicationError('', { level: 'warning' })],
			[
				'an Error with ApplicationError as cause with "warning" level',
				new Error('', { cause: new ApplicationError('', { level: 'warning' }) }),
			],
		])('should ignore if originalException is %s', async (_, originalException) => {
			const result = await errorReporter.beforeSend(event, { originalException });
			expect(result).toBeNull();
		});
	});
});
