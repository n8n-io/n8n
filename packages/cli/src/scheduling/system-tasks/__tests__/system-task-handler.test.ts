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
		const handler = new SystemTaskHandler(task, mockLogger(), onRunError);
		return { task, report, handler, onRunError };
	}

	it('runs the task', async () => {
		const { task, report, handler } = setup('idempotent');

		await handler.execute(claimed, report);

		expect(task.runCount).toBe(1);
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
		const handler = new SystemTaskHandler(task, mockLogger(), vi.fn());

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

	it('does not report a run that succeeds', async () => {
		const { report, handler, onRunError } = setup('idempotent');

		await handler.execute(claimed, report);

		expect(onRunError).not.toHaveBeenCalled();
	});
});
