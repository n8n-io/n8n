import type { Logger } from '@n8n/backend-common';
import { QueryFailedError } from '@n8n/typeorm';
import type { ErrorEvent } from '@sentry/core';
import { AxiosError } from 'axios';
import { ApplicationError, BaseError } from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ErrorReporter, normalizeFrameFilename } from '../error-reporter';

vi.mock('@sentry/node', () => ({
	init: vi.fn(),
	setTag: vi.fn(),
	captureException: vi.fn(),
	Integrations: {},
}));

const eventLoopBlockIntegrationMock = vi.fn((opts: unknown) => ({
	name: 'EventLoopBlock',
	opts,
}));
vi.mock('@sentry/node-native', () => ({
	eventLoopBlockIntegration: (opts: unknown) => eventLoopBlockIntegrationMock(opts),
}));

vi.spyOn(process, 'on');

describe('normalizeFrameFilename', () => {
	it('rewrites pnpm-nested n8n-core frames to a stable app:/// root', () => {
		const input =
			'/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-core@file+packages+core_abc123/node_modules/n8n-core/src/execution-engine/workflow-execute.ts';

		expect(normalizeFrameFilename(input)).toBe(
			'app:///n8n-core/src/execution-engine/workflow-execute.ts',
		);
	});

	it('rewrites pnpm-nested n8n-nodes-base frames to a stable app:/// root', () => {
		const input =
			'/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-nodes-base@1.2.3_xyz789/node_modules/n8n-nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts';

		expect(normalizeFrameFilename(input)).toBe(
			'app:///n8n-nodes-base/nodes/HttpRequest/V3/HttpRequestV3.node.ts',
		);
	});

	it('rewrites pnpm-nested @n8n scoped frames to a stable app:/// root', () => {
		const input =
			'/usr/local/lib/node_modules/n8n/node_modules/.pnpm/@n8n+n8n-nodes-langchain@1.0.0_peer+hash/node_modules/@n8n/n8n-nodes-langchain/nodes/agents/Agent.node.ts';

		expect(normalizeFrameFilename(input)).toBe(
			'app:///@n8n/n8n-nodes-langchain/nodes/agents/Agent.node.ts',
		);
	});

	it('rewrites cli install-prefix frames (src) to a stable app:/// root', () => {
		const input = '/usr/local/lib/node_modules/n8n/src/commands/start.ts';

		expect(normalizeFrameFilename(input)).toBe('app:///src/commands/start.ts');
	});

	it('rewrites cli install-prefix frames (bin) to a stable app:/// root', () => {
		const input = '/usr/local/lib/node_modules/n8n/bin/n8n';

		expect(normalizeFrameFilename(input)).toBe('app:///bin/n8n');
	});

	it('prefers the pnpm replacement when both segments are present', () => {
		const input =
			'/usr/local/lib/node_modules/n8n/node_modules/.pnpm/n8n-core@file+packages+core_abc123/node_modules/n8n-core/src/foo.ts';

		expect(normalizeFrameFilename(input)).toBe('app:///n8n-core/src/foo.ts');
	});

	it('leaves unrelated frames unchanged', () => {
		const input = '/some/other/path/file.ts';

		expect(normalizeFrameFilename(input)).toBe('/some/other/path/file.ts');
	});

	it('leaves node-internal frames unchanged', () => {
		const input = 'node:internal/process/task_queues';

		expect(normalizeFrameFilename(input)).toBe('node:internal/process/task_queues');
	});

	it('handles pnpm frames not under the cli install prefix (e.g. dev installs)', () => {
		const input =
			'/home/dev/n8n/node_modules/.pnpm/n8n-core@file+packages+core_abc/node_modules/n8n-core/src/x.ts';

		expect(normalizeFrameFilename(input)).toBe('app:///n8n-core/src/x.ts');
	});
});

describe('ErrorReporter', () => {
	const errorReporter = new ErrorReporter(mock(), mock());
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
			originalException.catch(() => {});

			const result = await errorReporter.beforeSend(event, { originalException });

			expect(result).toEqual(event);
		});

		const rejectedAxiosPromise = Promise.reject(new AxiosError());
		rejectedAxiosPromise.catch(() => {});

		test.each([
			['undefined', undefined],
			['null', null],
			['an AxiosError', new AxiosError()],
			['a rejected Promise with AxiosError', rejectedAxiosPromise],
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

		describe('beforeSendFilter', () => {
			const newErrorReportedWithBeforeSendFilter = (beforeSendFilter: Mock) => {
				const errorReporter = new ErrorReporter(mock(), mock());
				// @ts-expect-error - beforeSendFilter is private
				errorReporter.beforeSendFilter = beforeSendFilter;
				return errorReporter;
			};

			it('should filter out based on the beforeSendFilter', async () => {
				const beforeSendFilter = vi.fn().mockReturnValue(true);
				const errorReporter = newErrorReportedWithBeforeSendFilter(beforeSendFilter);
				const hint = { originalException: new Error() };

				const result = await errorReporter.beforeSend(event, hint);

				expect(result).toBeNull();
				expect(beforeSendFilter).toHaveBeenCalledWith(event, hint);
			});

			it('should not filter out when beforeSendFilter returns false', async () => {
				const beforeSendFilter = vi.fn().mockReturnValue(false);
				const errorReporter = newErrorReportedWithBeforeSendFilter(beforeSendFilter);
				const hint = { originalException: new Error() };

				const result = await errorReporter.beforeSend(event, hint);

				expect(result).toEqual(event);
				expect(beforeSendFilter).toHaveBeenCalledWith(event, hint);
			});
		});

		describe('BaseError', () => {
			class TestError extends BaseError {}

			it('should drop errors with shouldReport false', async () => {
				const originalException = new TestError('test', { shouldReport: false });

				expect(await errorReporter.beforeSend(event, { originalException })).toEqual(null);
			});

			it('should keep events with shouldReport true', async () => {
				const originalException = new TestError('test', { shouldReport: true });

				expect(await errorReporter.beforeSend(event, { originalException })).toEqual(event);
			});

			it('should set level, extra, and tags from BaseError', async () => {
				const originalException = new TestError('Test error', {
					level: 'error',
					extra: { foo: 'bar' },
					tags: { tag1: 'value1' },
				});

				const testEvent = {} as ErrorEvent;

				const result = await errorReporter.beforeSend(testEvent, { originalException });

				expect(result).toEqual({
					level: 'error',
					extra: { foo: 'bar' },
					tags: {
						packageName: 'core',
						tag1: 'value1',
					},
				});
			});
		});
	});

	describe('getEventLoopBlockIntegration', () => {
		const tags = { server_name: 'test', server_type: 'main' as const };

		beforeEach(() => {
			eventLoopBlockIntegrationMock.mockClear();
		});

		it('passes threshold and maxEventsPerHour through to the Sentry integration', async () => {
			// @ts-expect-error - private method
			await errorReporter.getEventLoopBlockIntegration(tags, 750, 3);

			expect(eventLoopBlockIntegrationMock).toHaveBeenCalledWith({
				threshold: 750,
				maxEventsPerHour: 3,
				staticTags: tags,
			});
		});

		it('omits maxEventsPerHour when not provided (back-compat)', async () => {
			// @ts-expect-error - private method
			await errorReporter.getEventLoopBlockIntegration(tags, 500);

			expect(eventLoopBlockIntegrationMock).toHaveBeenCalledWith({
				threshold: 500,
				staticTags: tags,
			});
		});

		it('omits both options when neither is provided', async () => {
			// @ts-expect-error - private method
			await errorReporter.getEventLoopBlockIntegration(tags);

			expect(eventLoopBlockIntegrationMock).toHaveBeenCalledWith({ staticTags: tags });
		});
	});

	describe('error', () => {
		let error: ApplicationError;
		let logger: Logger;
		let errorReporter: ErrorReporter;
		const metadata = undefined;

		beforeEach(() => {
			error = new ApplicationError('Test error');
			logger = mock<Logger>();
			errorReporter = new ErrorReporter(logger, mock());
		});

		it('should include stack trace for error-level `ApplicationError`', () => {
			error.level = 'error';
			errorReporter.error(error);
			expect(logger.error).toHaveBeenCalledWith(`Test error\n${error.stack}\n`, metadata);
		});

		it('should exclude stack trace for warning-level `ApplicationError`', () => {
			error.level = 'warning';
			errorReporter.error(error);
			expect(logger.error).toHaveBeenCalledWith('Test error', metadata);
		});

		it.each([true, undefined])(
			'should log the error when shouldBeLogged is %s',
			(shouldBeLogged) => {
				error.level = 'error';
				errorReporter.error(error, { shouldBeLogged });
				expect(logger.error).toHaveBeenCalledTimes(1);
			},
		);

		it('should not log the error when shouldBeLogged is false', () => {
			error.level = 'error';
			errorReporter.error(error, { shouldBeLogged: false });
			expect(logger.error).toHaveBeenCalledTimes(0);
		});

		it('should include stack trace for generic `Error`', () => {
			const genericError = new Error('Something broke');
			errorReporter.error(genericError);
			expect(logger.error).toHaveBeenCalledWith(
				`Something broke\n${genericError.stack}\n`,
				undefined,
			);
		});

		it('should include stack trace for generic error cause chain', () => {
			const cause = new Error('root cause');
			const outer = new Error('outer', { cause });
			errorReporter.error(outer);
			expect(logger.error).toHaveBeenCalledTimes(2);
			expect(logger.error).toHaveBeenNthCalledWith(1, `outer\n${outer.stack}\n`, undefined);
			expect(logger.error).toHaveBeenNthCalledWith(2, `root cause\n${cause.stack}\n`, undefined);
		});
	});
});
