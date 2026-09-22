import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { SystemTaskMetadata } from '@n8n/decorators';

import { DummySystemTask } from '@/scheduling/system-tasks/__tests__/dummy.task';
import { SystemTaskRunner } from '@/scheduling/system-tasks/system-task-runner';
import { TelemetryBufferFlushTask } from '@/telemetry/telemetry-buffer-flush.task';

import { BaseCommand } from '../base-command';

class TestCommand extends BaseCommand {
	async run() {}
}

const logger = mockInstance(Logger);

afterEach(() => {
	vi.resetAllMocks();
});

describe('logError', () => {
	const error = new Error('Something went wrong');
	error.stack = 'the stack';

	it('should log the error banner', () => {
		// @ts-expect-error Protected method
		new TestCommand().logError(error);

		expect(logger.error.mock.calls.flat()).toEqual([
			'\nGOT ERROR',
			'====================================',
			'Something went wrong',
			'the stack',
		]);
	});

	it('should log the summary before the error banner', () => {
		// @ts-expect-error Protected method
		new TestCommand().logError(error, 'Error updating database.');

		expect(logger.error.mock.calls.flat()).toEqual([
			'Error updating database.',
			'\nGOT ERROR',
			'====================================',
			'Something went wrong',
			'the stack',
		]);
	});
});

describe('initSystemTasks', () => {
	it('should register the shared tasks and the own tasks, then start the runner', async () => {
		const metadata = mockInstance(SystemTaskMetadata);
		const runner = mockInstance(SystemTaskRunner);

		// @ts-expect-error Protected method
		await new TestCommand().initSystemTasks([DummySystemTask]);

		expect(metadata.register.mock.calls.flat()).toEqual([
			TelemetryBufferFlushTask,
			DummySystemTask,
		]);
		expect(runner.init).toHaveBeenCalledTimes(1);
	});
});
