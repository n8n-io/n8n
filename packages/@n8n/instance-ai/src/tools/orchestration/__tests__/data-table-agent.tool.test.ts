import type { ToolsInput } from '@mastra/core/agent';

import type { OrchestrationContext, TaskStorage } from '../../../types';

jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: Record<string, unknown>) => config),
}));
jest.mock('../../../stream/map-chunk', () => ({
	mapMastraChunkToEvent: jest.fn(),
}));

const { createDataTableAgentTool, dataTableAgentInputSchema, startDataTableAgentTask } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../data-table-agent.tool') as typeof import('../data-table-agent.tool');

function getSpawnOptions(context: OrchestrationContext) {
	const spawnMock = context.spawnBackgroundTask as jest.MockedFunction<
		NonNullable<OrchestrationContext['spawnBackgroundTask']>
	>;
	const options = spawnMock.mock.calls[0]?.[0];
	if (!options) throw new Error('Expected spawnBackgroundTask to be called');
	return options;
}

function getPublishedEvent(context: OrchestrationContext) {
	const publishMock = context.eventBus.publish as jest.MockedFunction<
		OrchestrationContext['eventBus']['publish']
	>;
	const event = publishMock.mock.calls[0]?.[1];
	if (!event) throw new Error('Expected eventBus.publish to be called');
	return event;
}

function createMockContext(overrides: Partial<OrchestrationContext> = {}): OrchestrationContext {
	const domainTools: ToolsInput = {
		'data-tables': { id: 'data-tables' } as never,
		'parse-file': { id: 'parse-file' } as never,
	};

	return {
		threadId: 'thread-123',
		runId: 'run-123',
		userId: 'test-user',
		orchestratorAgentId: 'agent-001',
		modelId: 'anthropic/claude-sonnet-4-5',
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 10,
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
			getEventsForRuns: jest.fn().mockReturnValue([]),
		},
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

describe('data-table-agent tool', () => {
	describe('schema validation', () => {
		it('accepts a valid data-table task', () => {
			const result = dataTableAgentInputSchema.safeParse({
				task: 'Create a table named Leads with email and score columns',
			});

			expect(result.success).toBe(true);
		});

		it('rejects missing task', () => {
			const result = dataTableAgentInputSchema.safeParse({});

			expect(result.success).toBe(false);
		});
	});

	describe('execute', () => {
		it('spawns a background task with the data-table tools and publishes after spawn succeeds', async () => {
			const context = createMockContext();
			const tool = createDataTableAgentTool(context);

			const result = (await tool.execute!({ task: 'Create a table named Leads' }, {} as never)) as {
				result: string;
				taskId: string;
			};

			expect(result.result).toContain('Data table operation started');
			expect(getSpawnOptions(context)).toMatchObject({
				role: 'data-table-manager',
				dedupeKey: { role: 'data-table-manager', plannedTaskId: undefined },
			});
			expect(getPublishedEvent(context)).toMatchObject({
				type: 'agent-spawned',
				payload: {
					role: 'data-table-manager',
					tools: ['data-tables', 'parse-file'],
					goal: 'Create a table named Leads',
				},
			});
		});

		it('uses the typed handoff as the source of truth for planned data-table dispatch', async () => {
			const context = createMockContext();

			await startDataTableAgentTask(context, {
				task: 'fallback task',
				conversationContext: 'fallback context',
				plannedTaskId: 'table-plan-1',
				handoff: {
					taskKey: 'table-plan-1',
					kind: 'manage-data-tables',
					input: {
						goal: 'Create the Leads table with email and score columns',
						conversationContext: 'The workflow needs this table before building.',
					},
				},
			});

			expect(getSpawnOptions(context)).toMatchObject({
				plannedTaskId: 'table-plan-1',
				dedupeKey: { role: 'data-table-manager', plannedTaskId: 'table-plan-1' },
			});
			expect(getPublishedEvent(context)).toMatchObject({
				type: 'agent-spawned',
				payload: {
					goal: 'Create the Leads table with email and score columns',
					subtitle: 'Create the Leads table with email and score columns',
				},
			});
		});

		it('returns an error when data-tables is not available', async () => {
			const context = createMockContext({ domainTools: {} });
			const tool = createDataTableAgentTool(context);

			const result = (await tool.execute!({ task: 'Create table' }, {} as never)) as {
				result: string;
				taskId: string;
			};

			expect(result).toEqual({
				result: 'Error: data-tables tool not available.',
				taskId: '',
			});
			expect(context.spawnBackgroundTask).not.toHaveBeenCalled();
		});

		it('does not publish agent-spawned when spawn returns duplicate', async () => {
			const context = createMockContext({
				spawnBackgroundTask: jest.fn(() => ({
					status: 'duplicate' as const,
					existing: {
						taskId: 'datatable-existing',
						agentId: 'agent-existing',
						role: 'data-table-manager',
					},
				})),
			});
			const tool = createDataTableAgentTool(context);

			const result = (await tool.execute!({ task: 'Create table' }, {} as never)) as {
				result: string;
				taskId: string;
			};

			expect(result.result).toContain('Data table operation already in progress');
			expect(result.taskId).toBe('datatable-existing');
			expect(context.eventBus.publish).not.toHaveBeenCalled();
		});
	});
});
