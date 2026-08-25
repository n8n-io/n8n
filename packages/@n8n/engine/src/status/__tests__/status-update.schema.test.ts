import { describe, expect, expectTypeOf, it } from 'vitest';

import type { ExecutionMode, StepSlots } from '../../execution';
import {
	MAX_STATUS_UPDATES_PER_BATCH,
	statusUpdateBatchSchema,
	statusUpdateSchema,
} from '../status-update.schema';
import type { StatusUpdate } from '../status-update.types';

const at = '2026-08-24T10:00:00.000Z';

const executionUpdate = { executionId: 'exec-1', workflowId: 'wf-1', at };
const stepUpdate = {
	executionId: 'exec-1',
	stepId: 'step-1',
	nodeId: 'node-a',
	nodeName: 'Edit Fields',
	iteration: 0,
	at,
};

const every: StatusUpdate[] = [
	{ type: 'execution:started', ...executionUpdate, mode: 'manual' },
	{ type: 'execution:completed', ...executionUpdate },
	{ type: 'execution:failed', ...executionUpdate },
	{ type: 'step:started', ...stepUpdate },
	{ type: 'step:completed', ...stepUpdate, outputs: [[{ json: { x: 1 } }], null] },
	{ type: 'step:failed', ...stepUpdate },
];

describe('statusUpdateSchema', () => {
	// `StatusUpdate` is inferred from the schema, so the two cannot disagree about
	// the union. What can still drift is a field the schema restates in its own
	// vocabulary; these pin those, in both directions.
	it('keeps the mode enum in step with ExecutionMode', () => {
		expectTypeOf<
			Extract<StatusUpdate, { type: 'execution:started' }>['mode']
		>().toEqualTypeOf<ExecutionMode>();
	});

	it('keeps the completed outputs in step with StepSlots', () => {
		expectTypeOf<
			Extract<StatusUpdate, { type: 'step:completed' }>['outputs']
		>().toEqualTypeOf<StepSlots>();
	});

	it.each(every.map((update) => [update.type, update] as const))(
		'round trips a %s update',
		(_type, update) => {
			expect(statusUpdateSchema.parse(update)).toEqual(update);
		},
	);

	it('rejects an event type the engine cannot emit yet', () => {
		expect(
			statusUpdateSchema.safeParse({ type: 'execution:cancelled', ...executionUpdate }).success,
		).toBe(false);
	});

	it('rejects a step update without an iteration', () => {
		const { iteration, ...withoutIteration } = stepUpdate;

		expect(
			statusUpdateSchema.safeParse({ type: 'step:started', ...withoutIteration }).success,
		).toBe(false);
	});

	it('rejects a negative iteration', () => {
		expect(
			statusUpdateSchema.safeParse({ type: 'step:started', ...stepUpdate, iteration: -1 }).success,
		).toBe(false);
	});

	it('rejects a timestamp that is not ISO-8601', () => {
		expect(
			statusUpdateSchema.safeParse({ type: 'step:started', ...stepUpdate, at: 'yesterday' })
				.success,
		).toBe(false);
	});

	it('rejects a completed step without outputs', () => {
		expect(statusUpdateSchema.safeParse({ type: 'step:completed', ...stepUpdate }).success).toBe(
			false,
		);
	});
});

describe('statusUpdateBatchSchema', () => {
	it('accepts a batch of every variant', () => {
		expect(statusUpdateBatchSchema.parse({ updates: every })).toEqual({ updates: every });
	});

	it('rejects an empty batch', () => {
		expect(statusUpdateBatchSchema.safeParse({ updates: [] }).success).toBe(false);
	});

	it('rejects a batch over the cap', () => {
		const updates = Array.from({ length: MAX_STATUS_UPDATES_PER_BATCH + 1 }, () => every[0]);

		expect(statusUpdateBatchSchema.safeParse({ updates }).success).toBe(false);
	});
});
