import { mockLogger } from '@n8n/backend-test-utils';
import type { ClaimedTask, DispatchReporter } from '@n8n/scheduler';
import { createDispatchReporter } from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import { SystemTaskHandler } from '../system-task-handler';
import { DummySystemTask } from './dummy.task';

describe('SystemTaskHandler', () => {
	const claimed = mock<ClaimedTask>({ id: 'task-1', jobId: 2 });

	function setup(effects: DummySystemTask['effects']) {
		const task = new DummySystemTask();
		task.effects = effects;
		const report = mock<DispatchReporter>();
		const onRunError = vi.fn();
		const shutdownController = new AbortController();
		const handler = new SystemTaskHandler(
			task,
			shutdownController.signal,
			mockLogger(),
			onRunError,
		);
		return {
			task,
			report,
			handler,
			onRunError,
			shutdownController,
			shutdownSignal: shutdownController.signal,
		};
	}

	it('runs the task', async () => {
		const { task, report, handler } = setup('idempotent');

		await handler.execute(claimed, report);

		expect(task.runCount).toBe(1);
	});

	it('hands the shutdown signal to the run', async () => {
		const { task, report, handler, shutdownSignal } = setup('idempotent');
		let seenSignal: AbortSignal | undefined;
		task.onRun = async (signal) => {
			seenSignal = signal;
		};

		await handler.execute(claimed, report);

		expect(seenSignal).toBe(shutdownSignal);
	});

	it('leaves idempotent work retryable', async () => {
		const { report, handler } = setup('idempotent');

		await handler.execute(claimed, report);

		expect(report.notDispatched).toHaveBeenCalled();
		expect(report.dispatched).not.toHaveBeenCalled();
	});

	it('marks non-idempotent work dispatched before it runs', async () => {
		const { task, report, handler } = setup('non-idempotent');
		task.onRun = async () => {
			expect(report.dispatched).toHaveBeenCalled();
		};

		await handler.execute(claimed, report);

		expect(task.runCount).toBe(1);
		expect(report.notDispatched).not.toHaveBeenCalled();
	});

	it.each([
		{ effects: 'idempotent', decision: 'notDispatched' },
		{ effects: 'non-idempotent', decision: 'dispatched' },
	] as const)('returns the $decision token for $effects work', async ({ effects, decision }) => {
		const task = new DummySystemTask();
		task.effects = effects;
		const report = createDispatchReporter(vi.fn());
		const handler = new SystemTaskHandler(
			task,
			new AbortController().signal,
			mockLogger(),
			vi.fn(),
		);

		const returned = await handler.execute(claimed, report);

		expect(returned).toBe(report[decision]());
	});

	it('lets a failing run reach the executor', async () => {
		const { task, report, handler } = setup('idempotent');
		task.onRun = async () => {
			throw new Error('failed');
		};

		await expect(handler.execute(claimed, report)).rejects.toThrow('failed');
	});

	it.each(['idempotent', 'non-idempotent'] as const)(
		'reports a failing run of %s work, which the executor would not',
		async (effects) => {
			const { task, report, handler, onRunError } = setup(effects);
			const error = new Error('failed');
			task.onRun = async () => {
				throw error;
			};

			await expect(handler.execute(claimed, report)).rejects.toThrow(error);

			expect(onRunError).toHaveBeenCalledWith(error);
		},
	);

	it('does not report a run that rejects once shutdown aborted its signal', async () => {
		const { task, report, handler, onRunError, shutdownController } = setup('idempotent');
		task.onRun = async (signal) =>
			await new Promise<void>((_, reject) => {
				signal.addEventListener('abort', () => reject(new Error('aborted')));
			});

		const executing = handler.execute(claimed, report);
		shutdownController.abort();

		await expect(executing).rejects.toThrow();
		expect(onRunError).not.toHaveBeenCalled();
	});

	it('does not report a run that succeeds', async () => {
		const { report, handler, onRunError } = setup('idempotent');

		await handler.execute(claimed, report);

		expect(onRunError).not.toHaveBeenCalled();
	});
});
