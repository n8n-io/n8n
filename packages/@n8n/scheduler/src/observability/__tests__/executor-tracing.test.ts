import { ensureError } from '@n8n/utils/errors/ensure-error';
import { mock } from 'vitest-mock-extended';

import type { FireResult, TaskHandler } from '../../core/executor';
import type { ClaimedTask } from '../../core/types';
import { SCHEDULER_ATTRIBUTES, SCHEDULER_FIRE_OUTCOME } from '../attributes';
import { createExecutorTracing, withHandoffTracing } from '../executor-tracing';
import { SpanStatus, type Span, type Tracer } from '../tracer';

const HOST = 'main-abc';

const claimedTask = (overrides: Partial<ClaimedTask> = {}): ClaimedTask => ({
	id: '1',
	jobId: 10,
	taskType: 'workflow:schedule-trigger',
	payload: {},
	scheduledFor: new Date('2026-07-01T00:00:00.000Z'),
	runAt: new Date('2026-07-01T00:00:00.000Z'),
	status: 'running',
	attempts: 0,
	maxAttempts: 1,
	leaseEpoch: 1,
	...overrides,
});

/**
 * A test tracer that behaves like the real (Sentry-backed) one: it hands a
 * span to `run`, and when `run` throws it marks the span as errored and
 * rethrows.
 */
const makeTracer = () => {
	const span: Span = { setAttribute: vi.fn(), setStatus: vi.fn() };
	const tracer = mock<Tracer>();
	tracer.startSpan.mockImplementation(async (_options, run) => {
		try {
			return await run(span);
		} catch (error) {
			span.setStatus({ code: SpanStatus.error, message: ensureError(error).message });
			throw error;
		}
	});
	return { span, tracer };
};

describe('createExecutorTracing', () => {
	it('opens a scheduler.fire span around the fire, carrying the task identity and host', async () => {
		const { tracer } = makeTracer();
		const tracing = createExecutorTracing(tracer);
		const task = claimedTask({ attempts: 1, maxAttempts: 3 });

		const result = await tracing.fire(
			HOST,
			task,
			async () => await Promise.resolve<FireResult>({ outcome: 'completed' }),
		);

		expect(result).toEqual({ outcome: 'completed' });
		const options = tracer.startSpan.mock.calls[0][0];
		expect(options.name).toBe('Scheduler fire');
		expect(options.op).toBe('scheduler.fire');
		expect(options.attributes).toMatchObject({
			[SCHEDULER_ATTRIBUTES.taskId]: task.id,
			[SCHEDULER_ATTRIBUTES.jobId]: task.jobId,
			[SCHEDULER_ATTRIBUTES.taskType]: task.taskType,
			[SCHEDULER_ATTRIBUTES.host]: HOST,
			[SCHEDULER_ATTRIBUTES.attempts]: 1,
			[SCHEDULER_ATTRIBUTES.maxAttempts]: 3,
		});
	});

	const okOutcomes: Array<[FireResult, string]> = [
		[{ outcome: 'completed' }, SCHEDULER_FIRE_OUTCOME.completed],
		[{ outcome: 'skipped-no-handler' }, SCHEDULER_FIRE_OUTCOME.skippedNoHandler],
		[{ outcome: 'skipped-not-owned' }, SCHEDULER_FIRE_OUTCOME.skippedNotOwned],
	];
	it.each(okOutcomes)(
		'closes the span as ok with the mapped outcome attribute for %o',
		async (fireResult, attributeValue) => {
			const { span, tracer } = makeTracer();
			const tracing = createExecutorTracing(tracer);

			const result = await tracing.fire(
				HOST,
				claimedTask(),
				async () => await Promise.resolve(fireResult),
			);

			expect(result).toEqual(fireResult);
			expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.outcome, attributeValue);
			expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
			expect(span.setStatus).not.toHaveBeenCalledWith(
				expect.objectContaining({ code: SpanStatus.error }),
			);
		},
	);

	const failureOutcomes: Array<[FireResult, string]> = [
		[{ outcome: 'rescheduled', errorMessage: 'boom' }, SCHEDULER_FIRE_OUTCOME.rescheduled],
		[{ outcome: 'dead-lettered', errorMessage: 'boom' }, SCHEDULER_FIRE_OUTCOME.deadLettered],
		// A fire whose handler failed but whose task was no longer ours to update.
		[
			{ outcome: 'skipped-not-owned', errorMessage: 'boom' },
			SCHEDULER_FIRE_OUTCOME.skippedNotOwned,
		],
	];
	it.each(failureOutcomes)(
		'closes the span as errored with the handler message and the mapped outcome for %o',
		async (fireResult, attributeValue) => {
			const { span, tracer } = makeTracer();
			const tracing = createExecutorTracing(tracer);

			const result = await tracing.fire(
				HOST,
				claimedTask(),
				async () => await Promise.resolve(fireResult),
			);

			expect(result).toEqual(fireResult);
			expect(span.setAttribute).toHaveBeenCalledWith(SCHEDULER_ATTRIBUTES.outcome, attributeValue);
			expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.error, message: 'boom' });
			expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
		},
	);

	it('propagates a throw from the fire and records no outcome (the tracer marks the span as errored)', async () => {
		const { span, tracer } = makeTracer();
		const tracing = createExecutorTracing(tracer);

		await expect(
			tracing.fire(
				HOST,
				claimedTask(),
				async () => await Promise.reject<FireResult>(new Error('db down')),
			),
		).rejects.toThrow('db down');

		expect(span.setAttribute).not.toHaveBeenCalled();
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.error, message: 'db down' });
	});
});

describe('withHandoffTracing', () => {
	it('runs the handler inside a scheduler.handoff span carrying the task identity, ok on success', async () => {
		const { span, tracer } = makeTracer();
		const handler: TaskHandler = { execute: vi.fn().mockResolvedValue(undefined) };
		const task = claimedTask();

		await withHandoffTracing(tracer, handler).execute(task);

		expect(handler.execute).toHaveBeenCalledWith(task);
		const options = tracer.startSpan.mock.calls[0][0];
		expect(options.name).toBe('Scheduler handoff');
		expect(options.op).toBe('scheduler.handoff');
		expect(options.attributes).toEqual({
			[SCHEDULER_ATTRIBUTES.taskId]: task.id,
			[SCHEDULER_ATTRIBUTES.taskType]: task.taskType,
		});
		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.ok });
	});

	it('propagates a handler throw (the executor retry contract) with the span errored, never ok', async () => {
		const { span, tracer } = makeTracer();
		const handler: TaskHandler = { execute: vi.fn().mockRejectedValue(new Error('boom')) };

		await expect(withHandoffTracing(tracer, handler).execute(claimedTask())).rejects.toThrow(
			'boom',
		);

		expect(span.setStatus).toHaveBeenCalledWith({ code: SpanStatus.error, message: 'boom' });
		expect(span.setStatus).not.toHaveBeenCalledWith({ code: SpanStatus.ok });
	});
});
