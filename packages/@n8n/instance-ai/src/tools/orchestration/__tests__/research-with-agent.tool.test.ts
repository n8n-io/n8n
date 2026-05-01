import type { ToolsInput } from '@mastra/core/agent';

import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { OrchestrationContext, TaskStorage } from '../../../types';

// Mock all heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));
jest.mock('../../../stream/map-chunk', () => ({
	mapMastraChunkToEvent: jest.fn(),
}));

const { createResearchWithAgentTool, researchWithAgentInputSchema } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../research-with-agent.tool') as typeof import('../research-with-agent.tool');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockEventBus(): InstanceAiEventBus {
	return {
		publish: jest.fn(),
		subscribe: jest.fn().mockReturnValue(() => {}),
		getEventsAfter: jest.fn(),
		getNextEventId: jest.fn(),
		getEventsForRun: jest.fn().mockReturnValue([]),
		getEventsForRuns: jest.fn().mockReturnValue([]),
	};
}

function createMockContext(overrides?: Partial<OrchestrationContext>): OrchestrationContext {
	const domainTools: ToolsInput = {
		research: { id: 'research' } as never,
		'list-workflows': { id: 'list-workflows' } as never,
	};

	return {
		threadId: 'thread-123',
		runId: 'run-123',
		userId: 'test-user',
		orchestratorAgentId: 'agent-001',
		modelId: 'anthropic/claude-sonnet-4-5',
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 10,
		eventBus: createMockEventBus(),
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools,
		abortSignal: new AbortController().signal,
		taskStorage: {} as TaskStorage,
		spawnBackgroundTask: jest.fn(() => ({
			status: 'started' as const,
			taskId: 'spawn-task-id',
			agentId: 'spawn-agent-id',
		})),
		cancelBackgroundTask: jest.fn(),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('research-with-agent tool', () => {
	describe('schema validation', () => {
		it('accepts a valid goal', () => {
			const result = researchWithAgentInputSchema.safeParse({
				goal: 'How does Shopify webhook authentication work?',
			});
			expect(result.success).toBe(true);
		});

		it('accepts goal with optional constraints', () => {
			const result = researchWithAgentInputSchema.safeParse({
				goal: 'Shopify API auth',
				constraints: 'Focus on REST API, not GraphQL',
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing goal', () => {
			const result = researchWithAgentInputSchema.safeParse({});
			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('spawns a background task and returns task ID', async () => {
			const context = createMockContext();
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!(
				{ goal: 'How does Stripe webhook verification work?' },
				{} as never,
			)) as { result: string };

			expect(result.result).toContain('Research started');
			expect(result.result).toMatch(/task: research-/);
			expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
		});

		it('publishes agent-spawned event', async () => {
			const context = createMockContext();
			const tool = createResearchWithAgentTool(context);

			await tool.execute!({ goal: 'test research' }, {} as never);

			expect(context.eventBus.publish).toHaveBeenCalledWith(
				'thread-123',
				expect.objectContaining({
					type: 'agent-spawned',
					runId: 'run-123',
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					payload: expect.objectContaining({
						role: 'web-researcher',
						tools: ['research'],
					}),
				}),
			);
		});

		it('returns error when research tool is not available', async () => {
			const context = createMockContext({
				domainTools: {
					'list-workflows': { id: 'list-workflows' } as never,
				},
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test' }, {} as never)) as { result: string };

			expect(result.result).toBe('Error: research tool not available.');
			expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
		});

		it('returns error when background task support is not available', async () => {
			const context = createMockContext({
				spawnBackgroundTask: undefined,
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test' }, {} as never)) as { result: string };

			expect(result.result).toBe('Error: background task support not available.');
		});

		it('does not publish agent-spawned when spawn returns duplicate', async () => {
			// The single-flight dedupe path used to emit a phantom `agent-spawned`
			// before checking the spawn outcome — leaving an orphan card in the UI.
			const context = createMockContext({
				spawnBackgroundTask: jest.fn(() => ({
					status: 'duplicate' as const,
					existing: {
						taskId: 'task-existing',
						agentId: 'agent-existing',
						role: 'web-researcher',
					},
				})),
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test' }, {} as never)) as {
				result: string;
				taskId: string;
			};

			expect(result.result).toContain('Research already in progress');
			expect(result.taskId).toBe('task-existing');
			expect(context.eventBus.publish).not.toHaveBeenCalled();
		});

		it('does not publish agent-spawned when spawn returns limit-reached', async () => {
			const context = createMockContext({
				spawnBackgroundTask: jest.fn(() => ({ status: 'limit-reached' as const })),
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test' }, {} as never)) as {
				result: string;
				taskId: string;
			};

			expect(result.result).toContain('limit reached');
			expect(result.taskId).toBe('');
			expect(context.eventBus.publish).not.toHaveBeenCalled();
		});
	});
});
