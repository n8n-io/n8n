import type { SystemTask } from '@n8n/decorators';
import { SpanStatus, type Span, type StartSpanOpts, type Tracing } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { observeSystemTaskRun } from '../system-task-run-observer';

describe('observeSystemTaskRun', () => {
	/**
	 * A tracing double that runs the span callback and records which entry point
	 * opened the span, so a root span and a child span can be told apart.
	 */
	function setupTracing() {
		const span = mock<Span>();
		const opened: Array<{ root: boolean; options: StartSpanOpts }> = [];
		const tracing = mock<Tracing>();
		tracing.startSpan.mockImplementation(async (options, spanCb) => {
			opened.push({ root: false, options });
			return await spanCb(span);
		});
		tracing.startNewTraceSpan.mockImplementation(async (options, spanCb) => {
			opened.push({ root: true, options });
			return await spanCb(span);
		});
		return { tracing, span, opened };
	}

	function taskThat(run: SystemTask['run']): Pick<SystemTask, 'name' | 'run'> {
		return { name: 'dummy', run };
	}

	const resolves: SystemTask['run'] = async () => {};
	const rejects =
		(error: unknown): SystemTask['run'] =>
		async () => {
			throw error;
		};

	it('settles a run that throws synchronously as a failure, rather than rejecting', async () => {
		const eventService = mock<EventService>();
		const error = new Error('failed');
		const task: Pick<SystemTask, 'name' | 'run'> = {
			name: 'dummy',
			// A `run` that is not declared `async`, which the interface accepts.
			run: () => {
				throw error;
			},
		};

		const outcome = await observeSystemTaskRun(
			eventService,
			setupTracing().tracing,
			task,
			'leader_timer',
			new AbortController().signal,
		);

		expect(outcome).toEqual({ result: 'failure', rejected: true, error });
		expect(eventService.emit).toHaveBeenCalledWith(
			'system-task-run-settled',
			expect.objectContaining({ name: 'dummy', mode: 'leader_timer', result: 'failure' }),
		);
	});

	it('opens one span per run, carrying the task name and the mode', async () => {
		const { tracing, span, opened } = setupTracing();

		await observeSystemTaskRun(
			mock<EventService>(),
			tracing,
			taskThat(resolves),
			'durable',
			new AbortController().signal,
		);

		expect(opened).toHaveLength(1);
		expect(opened[0].options).toMatchObject({
			name: 'System task run',
			op: 'system_task.run',
			attributes: {
				'n8n.system_task.name': 'dummy',
				'n8n.system_task.mode': 'durable',
			},
		});
		expect(span.setAttribute).toHaveBeenCalledWith('n8n.system_task.result', 'success');
	});

	it('opens a root span for a run from a timer and a child span for a durable run', async () => {
		const leaderTimer = setupTracing();
		const perInstance = setupTracing();
		const durable = setupTracing();

		await observeSystemTaskRun(
			mock<EventService>(),
			leaderTimer.tracing,
			taskThat(resolves),
			'leader_timer',
			new AbortController().signal,
		);
		await observeSystemTaskRun(
			mock<EventService>(),
			perInstance.tracing,
			taskThat(resolves),
			'instance_timer',
			new AbortController().signal,
		);
		await observeSystemTaskRun(
			mock<EventService>(),
			durable.tracing,
			taskThat(resolves),
			'durable',
			new AbortController().signal,
		);

		expect(leaderTimer.opened[0].root).toBe(true);
		expect(perInstance.opened[0].root).toBe(true);
		expect(durable.opened[0].root).toBe(false);
	});

	it('closes the span as ok on a successful run', async () => {
		const { tracing, span } = setupTracing();

		await observeSystemTaskRun(
			mock<EventService>(),
			tracing,
			taskThat(resolves),
			'leader_timer',
			new AbortController().signal,
		);

		expect(span.setAttribute).toHaveBeenCalledWith('n8n.system_task.result', 'success');
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('closes the span as errored with the message on a failed run', async () => {
		const { tracing, span } = setupTracing();

		await observeSystemTaskRun(
			mock<EventService>(),
			tracing,
			taskThat(rejects(new Error('boom'))),
			'leader_timer',
			new AbortController().signal,
		);

		expect(span.setAttribute).toHaveBeenCalledWith('n8n.system_task.result', 'failure');
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.error, message: 'boom' });
	});

	it('closes the span as ok on an aborted run, since a shutdown is expected', async () => {
		const { tracing, span } = setupTracing();
		const controller = new AbortController();
		// The run honors the abort by rejecting, which settles the run as `aborted`.
		const task = taskThat(async () => {
			controller.abort();
			throw new Error('stopped');
		});

		await observeSystemTaskRun(
			mock<EventService>(),
			tracing,
			task,
			'leader_timer',
			controller.signal,
		);

		expect(span.setAttribute).toHaveBeenCalledWith('n8n.system_task.result', 'aborted');
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});
});
