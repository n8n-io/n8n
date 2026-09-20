import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ThreadRecord } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';
import {
	getBuildPlanSelections,
	hasBuildPlanReview,
	recordBuildPlanReview,
} from '../build-plan-review';

const selections = [
	{
		id: 'email',
		nodeType: 'n8n-nodes-base.gmail',
		version: 2.1,
		resource: 'message',
		operation: 'send',
	},
];

function setup() {
	let thread: ThreadRecord = {
		id: 'thread-1',
		resourceId: 'user-1',
		createdAt: new Date(),
		updatedAt: new Date(),
		metadata: {},
	};
	const threadMemory = {
		patchThread: undefined,
		getThread: vi.fn(async (id: string) => (id === thread.id ? structuredClone(thread) : null)),
		saveThread: vi.fn(async (updated: ThreadRecord) => {
			thread = structuredClone(updated);
			return thread;
		}),
	};
	return mock<InstanceAiContext>({ runId: 'run-1', threadId: 'thread-1', threadMemory });
}

describe('reviewed plan references', () => {
	it('reuses accepted selections across tool contexts in the same run', async () => {
		const context = setup();
		const planId = await recordBuildPlanReview(context, selections);
		const nextContext = mock<InstanceAiContext>({
			runId: context.runId,
			threadId: context.threadId,
			threadMemory: context.threadMemory,
		});
		expect(await hasBuildPlanReview(nextContext)).toBe(true);
		expect(await getBuildPlanSelections(nextContext, planId!)).toEqual(selections);
	});

	it('rejects a stale reference after another review', async () => {
		const context = setup();
		const previous = await recordBuildPlanReview(context, selections);
		const current = await recordBuildPlanReview(context, []);
		await expect(getBuildPlanSelections(context, previous!)).rejects.toThrow('unavailable');
		expect(await getBuildPlanSelections(context, current!)).toEqual([]);
	});

	it('requires a new plan in another run but retains the approved plan on resume', async () => {
		const context = setup();
		const planId = await recordBuildPlanReview(context, selections);
		context.runId = 'run-2';
		await expect(getBuildPlanSelections(context, planId!)).rejects.toThrow('another run');
		expect(await getBuildPlanSelections(context, planId!, true)).toEqual(selections);
	});

	it('does not reuse a reference in another thread', async () => {
		const context = setup();
		const planId = await recordBuildPlanReview(context, selections);
		const other = mock<InstanceAiContext>({
			runId: context.runId,
			threadId: 'thread-2',
			threadMemory: context.threadMemory,
		});
		await expect(getBuildPlanSelections(other, planId!)).rejects.toThrow('unavailable');
	});
});
