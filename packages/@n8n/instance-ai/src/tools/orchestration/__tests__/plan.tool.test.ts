import type { PlanObject } from '@n8n/api-types';

import type { OrchestrationContext, PlanStorage } from '../../../types';
import { planInputSchema } from '../plan.schemas';
import { createPlanTool } from '../plan.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPlanStorage(): PlanStorage {
	const store = new Map<string, PlanObject>();
	return {
		// eslint-disable-next-line @typescript-eslint/require-await
		get: jest.fn(async (threadId: string) => store.get(threadId) ?? null),
		// eslint-disable-next-line @typescript-eslint/require-await
		save: jest.fn(async (_threadId: string, plan: PlanObject) => {
			store.set(_threadId, plan);
		}),
	};
}

function createMockContext(planStorage: PlanStorage): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model',
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
		},
		domainTools: {},
		abortSignal: new AbortController().signal,
		planStorage,
	};
}

function makeValidPlan(): PlanObject {
	return {
		goal: 'Test goal',
		currentPhase: 'build',
		iteration: 0,
		steps: [{ phase: 'build', description: 'Step 1', status: 'pending' }],
	};
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('planInputSchema', () => {
	it('rejects create without plan', () => {
		const result = planInputSchema.safeParse({ action: 'create' });
		expect(result.success).toBe(false);
	});

	it('rejects update without plan', () => {
		const result = planInputSchema.safeParse({ action: 'update' });
		expect(result.success).toBe(false);
	});

	it('accepts review without plan', () => {
		const result = planInputSchema.safeParse({ action: 'review' });
		expect(result.success).toBe(true);
	});

	it('accepts create with valid plan', () => {
		const result = planInputSchema.safeParse({
			action: 'create',
			plan: makeValidPlan(),
		});
		expect(result.success).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Tool behaviour
// ---------------------------------------------------------------------------

describe('createPlanTool', () => {
	let planStorage: PlanStorage;
	let context: OrchestrationContext;

	beforeEach(() => {
		planStorage = createMockPlanStorage();
		context = createMockContext(planStorage);
	});

	it('creates a plan and persists it to storage', async () => {
		const tool = createPlanTool(context);
		const plan = makeValidPlan();

		const output = await tool.execute!({ action: 'create', plan }, {} as never);

		expect(output).toEqual({
			plan,
			message: `Plan created with ${plan.steps.length} steps. Current phase: ${plan.currentPhase}.`,
		});
		expect(planStorage.save).toHaveBeenCalledWith('test-thread', plan);
	});

	it('returns the plan on review after create', async () => {
		const tool = createPlanTool(context);
		const plan = makeValidPlan();

		await tool.execute!({ action: 'create', plan }, {} as never);
		const output = await tool.execute!({ action: 'review' }, {} as never);

		expect(output).toEqual({
			plan,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			message: expect.stringContaining('Current plan:'),
		});
	});

	it('overwrites the plan on update', async () => {
		const tool = createPlanTool(context);
		const original = makeValidPlan();

		await tool.execute!({ action: 'create', plan: original }, {} as never);

		const updated: PlanObject = {
			...original,
			currentPhase: 'execute',
			iteration: 1,
		};

		const output = await tool.execute!({ action: 'update', plan: updated }, {} as never);

		expect(output).toEqual({
			plan: updated,
			message: `Plan updated. Phase: ${updated.currentPhase}, iteration: ${updated.iteration}.`,
		});

		const review = await tool.execute!({ action: 'review' }, {} as never);
		expect(review).toMatchObject({ plan: updated });
	});

	it('returns null plan when reviewing without prior create', async () => {
		const tool = createPlanTool(context);

		const output = await tool.execute!({ action: 'review' }, {} as never);

		expect(output).toEqual({
			plan: null,
			message: 'No plan exists for this thread.',
		});
	});
});
