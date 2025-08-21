import type { ErrorEvent } from '@sentry/core';
import { mock } from 'jest-mock-extended';
import type { ErrorReporter } from 'n8n-core';

import { TaskRunnerSentry } from '../task-runner-sentry';

describe('TaskRunnerSentry', () => {
	const commonConfig = {
		n8nVersion: '1.0.0',
		environment: 'local',
		deploymentName: 'test',
	};

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('filterOutUserCodeErrors', () => {
		const sentry = new TaskRunnerSentry(
			{
				...commonConfig,
				dsn: 'https://sentry.io/123',
			},
			mock(),
		);

		it('should filter out user code errors', () => {
			const event: ErrorEvent = {
				type: undefined,
				exception: {
					values: [
						{
							type: 'ReferenceError',
							value: 'fetch is not defined',
							stacktrace: {
								frames: [
									{
										filename: 'app:///dist/js-task-runner/js-task-runner.js',
										module: 'js-task-runner:js-task-runner',
										function: 'JsTaskRunner.executeTask',
									},
									{
										filename: 'app:///dist/js-task-runner/js-task-runner.js',
										module: 'js-task-runner:js-task-runner',
										function: 'JsTaskRunner.runForAllItems',
									},
									{
										filename: '<anonymous>',
										module: '<anonymous>',
										function: 'new Promise',
									},
									{
										filename: 'app:///dist/js-task-runner/js-task-runner.js',
										module: 'js-task-runner:js-task-runner',
										function: 'result',
									},
									{
										filename: 'node:vm',
										module: 'node:vm',
										function: 'runInContext',
									},
									{
										filename: 'node:vm',
										module: 'node:vm',
										function: 'Script.runInContext',
									},
									{
										filename: 'evalmachine.<anonymous>',
										module: 'evalmachine.<anonymous>',
										function: '?',
									},
									{
										filename: 'evalmachine.<anonymous>',
										module: 'evalmachine.<anonymous>',
										function: 'VmCodeWrapper',
									},
									{
										filename: '<anonymous>',
										module: '<anonymous>',
										function: 'new Promise',
									},
									{
										filename: 'evalmachine.<anonymous>',
										module: 'evalmachine.<anonymous>',
									},
								],
							},
							mechanism: { type: 'onunhandledrejection', handled: false },
						},
					],
				},
				event_id: '18bb78bb3d9d44c4acf3d774c2cfbfd8',
				platform: 'node',
				contexts: {
					trace: { trace_id: '3c3614d33a6b47f09b85ec7d2710acea', span_id: 'ad00fdf6d6173aeb' },
					runtime: { name: 'node', version: 'v20.17.0' },
				},
			};

			expect(sentry.filterOutUserCodeErrors(event)).toBe(true);
		});
	});

	describe('initIfEnabled', () => {
		const mockErrorReporter = mock<ErrorReporter>();

		it('should not configure sentry if dsn is not set', async () => {
			const sentry = new TaskRunnerSentry(
				{
					...commonConfig,
					dsn: '',
				},
				mockErrorReporter,
			);

			await sentry.initIfEnabled();

			expect(mockErrorReporter.init).not.toHaveBeenCalled();
		});

		it('should configure sentry if dsn is set', async () => {
			const sentry = new TaskRunnerSentry(
				{
					...commonConfig,
					dsn: 'https://sentry.io/123',
				},
				mockErrorReporter,
			);

			await sentry.initIfEnabled();

			expect(mockErrorReporter.init).toHaveBeenCalledWith({
				dsn: 'https://sentry.io/123',
				beforeSendFilter: sentry.filterOutUserCodeErrors,
				release: 'n8n@1.0.0',
				environment: 'local',
				serverName: 'test',
				serverType: 'task_runner',
			});
		});
	});

	describe('shutdown', () => {
		const mockErrorReporter = mock<ErrorReporter>();

		it('should not shutdown sentry if dsn is not set', async () => {
			const sentry = new TaskRunnerSentry(
				{
					...commonConfig,
					dsn: '',
				},
				mockErrorReporter,
			);

			await sentry.shutdown();

			expect(mockErrorReporter.shutdown).not.toHaveBeenCalled();
		});

		it('should shutdown sentry if dsn is set', async () => {
			const sentry = new TaskRunnerSentry(
				{
					...commonConfig,
					dsn: 'https://sentry.io/123',
				},
				mockErrorReporter,
			);

			await sentry.shutdown();

			expect(mockErrorReporter.shutdown).toHaveBeenCalled();
		});
	});
});
