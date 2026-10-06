import type { EventService } from '@n8n/backend-services';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ClaimedTask, DispatchReporter } from '@n8n/scheduler';
import { createDispatchReporter, LeaseLostError } from '@n8n/scheduler';
import { Tracing } from 'n8n-core';
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
		const eventService = mock<EventService>();
		const shutdownController = new AbortController();
		const leaseController = new AbortController();
		const handler = new SystemTaskHandler(
			task,
			shutdownController.signal,
			mockLogger(),
			eventService,
			new Tracing(),
			onRunError,
		);
		return {
			task,
			report,
			handler,
			onRunError,
			eventService,
			shutdownController,
			leaseController,
		};
	}

	it('runs the task', async () => {
		const { task, report, handler } = setup('idempotent');

		await handler.execute(claimed, report, new AbortController().signal);

		expect(task.runCount).toBe(1);
	});

	it.each(['shutdownController', 'leaseController'] as const)(
		'hands the run a signal that aborts with the %s',
		async (source) => {
			const context = setup('idempotent');
			let seenSignal: AbortSignal | undefined;
			context.task.onRun = async (signal) => {
				seenSignal = signal;
			};

			await context.handler.execute(claimed, context.report, context.leaseController.signal);
			expect(seenSignal?.aborted).toBe(false);
			context[source].abort();

			expect(seenSignal?.aborted).toBe(true);
		},
	);

	it('does not report a run that rejects once the claim was lost', async () => {
		const { task, report, handler, onRunError, leaseController } = setup('idempotent');
		task.onRun = async (signal) =>
			await new Promise<void>((_, reject) => {
				signal.addEventListener('abort', () => reject(new Error('aborted')));
			});

		const executing = handler.execute(claimed, report, leaseController.signal);
		leaseController.abort();

		await expect(executing).rejects.toThrow();
		expect(onRunError).not.toHaveBeenCalled();
	});

	it('propagates the lease error when the run resolves after its claim is lost', async () => {
		const { task, report, handler, onRunError, eventService, leaseController } =
			setup('idempotent');
		task.onRun = async (signal) =>
			await new Promise<void>((resolve) => {
				signal.addEventListener('abort', () => resolve(), { once: true });
			});
		const error = new LeaseLostError();

		const executing = handler.execute(claimed, report, leaseController.signal);
		leaseController.abort(error);

		await expect(executing).rejects.toBe(error);
		expect(report.dispatched).not.toHaveBeenCalled();
		expect(onRunError).not.toHaveBeenCalled();
		expect(eventService.emit).toHaveBeenCalledWith(
			'system-task-run-settled',
			expect.objectContaining({ mode: 'durable', result: 'lease_lost' }),
		);
	});

	it('leaves idempotent work retryable', async () => {
		const { report, handler } = setup('idempotent');

		await handler.execute(claimed, report, new AbortController().signal);

		expect(report.notDispatched).toHaveBeenCalled();
		expect(report.dispatched).not.toHaveBeenCalled();
	});

	it('marks non-idempotent work dispatched before it runs', async () => {
		const { task, report, handler } = setup('non-idempotent');
		task.onRun = async () => {
			expect(report.dispatched).toHaveBeenCalled();
		};

		await handler.execute(claimed, report, new AbortController().signal);

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
			mock<EventService>(),
			new Tracing(),
			vi.fn(),
		);

		const returned = await handler.execute(claimed, report, new AbortController().signal);

		expect(returned).toBe(report[decision]());
	});

	it('lets a failing run reach the executor', async () => {
		const { task, report, handler } = setup('idempotent');
		task.onRun = async () => {
			throw new Error('failed');
		};

		await expect(handler.execute(claimed, report, new AbortController().signal)).rejects.toThrow(
			'failed',
		);
	});

	it.each(['idempotent', 'non-idempotent'] as const)(
		'reports a failing run of %s work, which the executor would not',
		async (effects) => {
			const { task, report, handler, onRunError } = setup(effects);
			const error = new Error('failed');
			task.onRun = async () => {
				throw error;
			};

			await expect(handler.execute(claimed, report, new AbortController().signal)).rejects.toThrow(
				error,
			);

			expect(onRunError).toHaveBeenCalledWith(error);
		},
	);

	it('does not report a run that rejects once shutdown aborted its signal', async () => {
		const { task, report, handler, onRunError, shutdownController } = setup('idempotent');
		task.onRun = async (signal) =>
			await new Promise<void>((_, reject) => {
				signal.addEventListener('abort', () => reject(new Error('aborted')));
			});

		const executing = handler.execute(claimed, report, new AbortController().signal);
		shutdownController.abort();

		await expect(executing).rejects.toThrow();
		expect(onRunError).not.toHaveBeenCalled();
	});

	it('runs the task and reports nothing although a metrics listener throws', async () => {
		const { task, report, handler, onRunError, eventService } = setup('idempotent');
		eventService.emit.mockImplementation(() => {
			throw new Error('sink');
		});

		await handler.execute(claimed, report, new AbortController().signal);

		expect(task.runCount).toBe(1);
		expect(onRunError).not.toHaveBeenCalled();
	});

	it('does not report a run that succeeds', async () => {
		const { report, handler, onRunError } = setup('idempotent');

		await handler.execute(claimed, report, new AbortController().signal);

		expect(onRunError).not.toHaveBeenCalled();
	});

	describe('metrics events', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('emits a durable run as started, then settled as a success with its duration', async () => {
			const { task, report, handler, eventService } = setup('idempotent');
			task.onRun = async () => {
				await vi.advanceTimersByTimeAsync(250);
			};

			await handler.execute(claimed, report, new AbortController().signal);

			expect(eventService.emit.mock.calls).toEqual([
				['system-task-run-started', { name: 'dummy', mode: 'durable' }],
				[
					'system-task-run-settled',
					{ name: 'dummy', mode: 'durable', result: 'success', durationMs: 250 },
				],
			]);
		});

		it('settles a failing run as a failure', async () => {
			const { task, report, handler, eventService } = setup('idempotent');
			task.onRun = async () => {
				throw new Error('failed');
			};

			await expect(handler.execute(claimed, report, new AbortController().signal)).rejects.toThrow(
				'failed',
			);

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ mode: 'durable', result: 'failure' }),
			);
		});

		it('settles a run that resolves once shutdown aborted its signal as aborted', async () => {
			const { task, report, handler, eventService, shutdownController } = setup('idempotent');
			task.onRun = async (signal) =>
				await new Promise<void>((resolve) => {
					signal.addEventListener('abort', () => resolve());
				});

			const executing = handler.execute(claimed, report, new AbortController().signal);
			shutdownController.abort();
			await executing;

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ mode: 'durable', result: 'aborted' }),
			);
		});

		it('settles a run that rejects once shutdown aborted its signal as aborted', async () => {
			const { task, report, handler, eventService, shutdownController } = setup('idempotent');
			task.onRun = async (signal) =>
				await new Promise<void>((_, reject) => {
					signal.addEventListener('abort', () => reject(new Error('aborted')));
				});

			const executing = handler.execute(claimed, report, new AbortController().signal);
			shutdownController.abort();
			await expect(executing).rejects.toThrow();

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ mode: 'durable', result: 'aborted' }),
			);
		});

		it('settles a run that rejects once its claim was lost as lease_lost', async () => {
			const { task, report, handler, eventService, leaseController } = setup('idempotent');
			task.onRun = async (signal) =>
				await new Promise<void>((_, reject) => {
					signal.addEventListener('abort', () => reject(new Error('aborted')));
				});

			const executing = handler.execute(claimed, report, leaseController.signal);
			leaseController.abort();
			await expect(executing).rejects.toThrow();

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ mode: 'durable', result: 'lease_lost' }),
			);
		});
	});
});
