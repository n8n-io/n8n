import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import { orchestrationMessageSchema, stepMessageSchema } from '../work-queue.schemas';
import type { OrchestrationMessage, StepMessage } from '../work-queue.types';

describe('orchestrationMessageSchema', () => {
	it('infers exactly the OrchestrationMessage type', () => {
		expectTypeOf<
			z.infer<typeof orchestrationMessageSchema>
		>().toEqualTypeOf<OrchestrationMessage>();
	});

	it.each<OrchestrationMessage>([
		{ type: 'execution:enqueued', executionId: 'exec-1' },
		{ type: 'step:settled', executionId: 'exec-1', stepId: 'step-1' },
	])('accepts a $type message', (message) => {
		expect(orchestrationMessageSchema.parse(message)).toEqual(message);
	});

	it.each([
		['a step message', { type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' }],
		['an empty execution id', { type: 'execution:enqueued', executionId: '' }],
		['a settled step without a step id', { type: 'step:settled', executionId: 'exec-1' }],
		['a value that is not an object', 'exec-1'],
	])('rejects %s', (_case, message) => {
		expect(orchestrationMessageSchema.safeParse(message).success).toBe(false);
	});

	it('drops fields that the message type does not define', () => {
		const parsed = orchestrationMessageSchema.parse({
			type: 'execution:enqueued',
			executionId: 'exec-1',
			extra: 'ignored',
		});

		expect(parsed).toEqual({ type: 'execution:enqueued', executionId: 'exec-1' });
	});
});

describe('stepMessageSchema', () => {
	it('infers exactly the StepMessage type', () => {
		expectTypeOf<z.infer<typeof stepMessageSchema>>().toEqualTypeOf<StepMessage>();
	});

	it('accepts a step:ready message', () => {
		const message: StepMessage = { type: 'step:ready', executionId: 'exec-1', stepId: 'step-1' };

		expect(stepMessageSchema.parse(message)).toEqual(message);
	});

	it.each([
		['an orchestration message', { type: 'execution:enqueued', executionId: 'exec-1' }],
		['an empty step id', { type: 'step:ready', executionId: 'exec-1', stepId: '' }],
	])('rejects %s', (_case, message) => {
		expect(stepMessageSchema.safeParse(message).success).toBe(false);
	});
});
