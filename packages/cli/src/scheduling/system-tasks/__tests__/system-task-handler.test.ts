import { mockLogger } from '@n8n/backend-test-utils';
import type { ClaimedTask, DispatchReporter } from '@n8n/scheduler';
import { createDispatchReporter } from '@n8n/scheduler';
import { Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

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

	it.each(['idempotent', 'non-idempotent'] as const)(
		'never marks %s work dispatched, so a throw is recorded as a failure',
		async (effects) => {
			const { task, report, handler } = setup(effects);

			await handler.execute(claimed, report);

			expect(task.runCount).toBe(1);
			expect(report.notDispatched).toHaveBeenCalled();
			expect(report.dispatched).not.toHaveBeenCalled();
		},
	);

	it.each(['idempotent', 'non-idempotent'] as const)(
		'returns the notDispatched token for %s work',
		async (effects) => {
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

			const returned = await handler.execute(claimed, report);

			expect(returned).toBe(report.notDispatched());
		},
	);

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

	it('runs the task and reports nothing although a metrics listener throws', async () => {
		const { task, report, handler, onRunError, eventService } = setup('idempotent');
		eventService.emit.mockImplementation(() => {
			throw new Error('sink');
		});

		await handler.execute(claimed, report);

		expect(task.runCount).toBe(1);
		expect(onRunError).not.toHaveBeenCalled();
	});

	it('does not report a run that succeeds', async () => {
		const { report, handler, onRunError } = setup('idempotent');

		await handler.execute(claimed, report);

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

			await handler.execute(claimed, report);

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

			await expect(handler.execute(claimed, report)).rejects.toThrow('failed');

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

			const executing = handler.execute(claimed, report);
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

			const executing = handler.execute(claimed, report);
			shutdownController.abort();
			await expect(executing).rejects.toThrow();

			expect(eventService.emit).toHaveBeenCalledWith(
				'system-task-run-settled',
				expect.objectContaining({ mode: 'durable', result: 'aborted' }),
			);
		});
	});
});
