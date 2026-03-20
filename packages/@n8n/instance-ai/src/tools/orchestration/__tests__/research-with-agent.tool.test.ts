import type { ToolsInput } from '@mastra/core/agent';

import type { InstanceAiEventSink } from '../../../event-bus/event-bus.interface';
import type { OrchestrationContext, TaskStorage } from '../../../types';

// Mock all heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));
jest.mock('@mastra/langsmith', () => ({
	LangSmithExporter: jest.fn(),
}));
jest.mock('@mastra/observability', () => ({
	Observability: jest.fn(),
}));
jest.mock('../../../stream/map-chunk', () => ({
	mapMastraChunkToEvent: jest.fn(),
}));

const { createResearchWithAgentTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../research-with-agent.tool') as typeof import('../research-with-agent.tool');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockEventBus(): InstanceAiEventSink {
	return {
		publish: jest.fn(),
	};
}

function createMockContext(overrides?: Partial<OrchestrationContext>): OrchestrationContext {
	const domainTools: ToolsInput = {
		'web-search': { id: 'web-search' } as never,
		'fetch-url': { id: 'fetch-url' } as never,
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
		domainTools,
		abortSignal: new AbortController().signal,
		taskStorage: {} as TaskStorage,
		planStorage: {
			get: jest.fn(),
			save: jest.fn(),
		},
		spawnBackgroundTask: jest.fn().mockReturnValue({
			started: true,
			reused: false,
			taskId: 'research-existing',
			executionKey: 'research:key',
		}),
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
			const context = createMockContext();
			const tool = createResearchWithAgentTool(context);
			const result = tool.inputSchema!.safeParse({
				goal: 'How does Shopify webhook authentication work?',
			});
			expect(result.success).toBe(true);
		});

		it('accepts goal with optional constraints', () => {
			const context = createMockContext();
			const tool = createResearchWithAgentTool(context);
			const result = tool.inputSchema!.safeParse({
				goal: 'Shopify API auth',
				constraints: 'Focus on REST API, not GraphQL',
			});
			expect(result.success).toBe(true);
		});

		it('rejects missing goal', () => {
			const context = createMockContext();
			const tool = createResearchWithAgentTool(context);
			const result = tool.inputSchema!.safeParse({});
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
			)) as { started: boolean; reused: boolean; result: string; taskId?: string };

			expect(result.started).toBe(true);
			expect(result.reused).toBe(false);
			expect(result.result).toContain('Research started');
			expect(result.taskId).toBe('research-existing');
			expect(context.spawnBackgroundTask).toHaveBeenCalledTimes(1);
		});

		it('publishes agent-spawned event', async () => {
			const context = createMockContext();
			const tool = createResearchWithAgentTool(context);

			await tool.execute!({ goal: 'test research' }, {} as never);

			const publishMock = context.eventBus.publish as jest.Mock;
			expect(publishMock).toHaveBeenCalledTimes(1);
			const [threadId, event] = publishMock.mock.calls[0] as [
				string,
				{
					type: string;
					runId: string;
					payload: {
						role: string;
						tools: string[];
						taskId: string;
					};
				},
			];
			expect(threadId).toBe('thread-123');
			expect(event.type).toBe('agent-spawned');
			expect(event.runId).toBe('run-123');
			expect(event.payload.role).toBe('web-researcher');
			expect(event.payload.tools).toEqual(['web-search', 'fetch-url']);
			expect(event.payload.taskId).toBe('research-existing');
		});

		it('reuses an active research task without publishing a new agent-spawned event', async () => {
			const context = createMockContext({
				spawnBackgroundTask: jest.fn().mockReturnValue({
					started: true,
					reused: true,
					taskId: 'research-running',
					executionKey: 'research:key',
				}),
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test research' }, {} as never)) as {
				started: boolean;
				reused: boolean;
				result: string;
				taskId?: string;
			};

			expect(result).toMatchObject({
				started: true,
				reused: true,
				taskId: 'research-running',
			});
			expect(result.result).toContain('already running');
			expect(context.eventBus.publish).not.toHaveBeenCalled();
		});

		it('returns error when web-search tool is not available', async () => {
			const context = createMockContext({
				domainTools: {
					'fetch-url': { id: 'fetch-url' } as never,
				},
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test' }, {} as never)) as {
				started: boolean;
				reused: boolean;
				result: string;
			};

			expect(result.started).toBe(false);
			expect(result.reused).toBe(false);
			expect(result.result).toBe('Error: web-search tool not available.');
			expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
		});

		it('returns error when background task support is not available', async () => {
			const context = createMockContext({
				spawnBackgroundTask: undefined,
			});
			const tool = createResearchWithAgentTool(context);

			const result = (await tool.execute!({ goal: 'test' }, {} as never)) as {
				started: boolean;
				reused: boolean;
				result: string;
			};

			expect(result.started).toBe(false);
			expect(result.reused).toBe(false);
			expect(result.result).toBe('Error: background task support not available.');
		});
	});
});
