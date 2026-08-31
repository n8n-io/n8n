import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ExecutionMode, StepSlots } from '../../execution';
import {
	MAX_LIFECYCLE_EVENTS_PER_BATCH,
	lifecycleEventBatchSchema,
	lifecycleEventSchema,
} from '../lifecycle-event.schema';
import type { LifecycleEvent } from '../lifecycle-event.types';

const at = '2026-08-24T10:00:00.000Z';

const executionEvent = { executionId: 'exec-1', workflowId: 'wf-1', at };
const stepEvent = {
	executionId: 'exec-1',
	stepId: 'step-1',
	nodeId: 'node-a',
	nodeName: 'Edit Fields',
	iteration: 0,
	at,
};

const every: LifecycleEvent[] = [
	{ type: 'execution:started', ...executionEvent, mode: 'manual' },
	{ type: 'execution:completed', ...executionEvent },
	{ type: 'execution:failed', ...executionEvent },
	{ type: 'step:started', ...stepEvent },
	{ type: 'step:completed', ...stepEvent, outputs: [[{ json: { x: 1 } }], null] },
	{ type: 'step:failed', ...stepEvent },
];

describe('lifecycleEventSchema', () => {
	// The union cannot drift, but a field the schema restates in its own
	// vocabulary can. These pin those, in both directions.
	it('keeps the mode enum in step with ExecutionMode', () => {
		expectTypeOf<
			Extract<LifecycleEvent, { type: 'execution:started' }>['mode']
		>().toEqualTypeOf<ExecutionMode>();
	});

	it('keeps the completed outputs in step with StepSlots', () => {
		expectTypeOf<
			Extract<LifecycleEvent, { type: 'step:completed' }>['outputs']
		>().toEqualTypeOf<StepSlots>();
	});

	it.each(every.map((event) => [event.type, event] as const))(
		'round trips a %s event',
		(_type, event) => {
			expect(lifecycleEventSchema.parse(event)).toEqual(event);
		},
	);

	it('rejects an event type the engine cannot emit yet', () => {
		expect(
			lifecycleEventSchema.safeParse({ type: 'execution:cancelled', ...executionEvent }).success,
		).toBe(false);
	});

	it('rejects a step event without an iteration', () => {
		const { iteration, ...withoutIteration } = stepEvent;

		expect(
			lifecycleEventSchema.safeParse({ type: 'step:started', ...withoutIteration }).success,
		).toBe(false);
	});

	it('rejects a negative iteration', () => {
		expect(
			lifecycleEventSchema.safeParse({ type: 'step:started', ...stepEvent, iteration: -1 }).success,
		).toBe(false);
	});

	it('rejects a timestamp that is not ISO-8601', () => {
		expect(
			lifecycleEventSchema.safeParse({ type: 'step:started', ...stepEvent, at: 'yesterday' })
				.success,
		).toBe(false);
	});

	it('rejects a completed step without outputs', () => {
		expect(lifecycleEventSchema.safeParse({ type: 'step:completed', ...stepEvent }).success).toBe(
			false,
		);
	});
});

describe('lifecycleEventBatchSchema', () => {
	it('accepts a batch of every variant', () => {
		expect(lifecycleEventBatchSchema.parse({ events: every })).toEqual({ events: every });
	});

	it('rejects an empty batch', () => {
		expect(lifecycleEventBatchSchema.safeParse({ events: [] }).success).toBe(false);
	});

	it('rejects a batch over the cap', () => {
		const events = Array.from({ length: MAX_LIFECYCLE_EVENTS_PER_BATCH + 1 }, () => every[0]);

		expect(lifecycleEventBatchSchema.safeParse({ events }).success).toBe(false);
	});
});
