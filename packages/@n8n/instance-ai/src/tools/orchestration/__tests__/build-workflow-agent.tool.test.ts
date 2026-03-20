// Mock heavy Mastra dependencies to avoid ESM issues in Jest
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
jest.mock('../../../memory/sub-agent-memory', () => ({
	createSubAgentMemory: jest.fn(),
	subAgentResourceId: jest.fn(() => 'sub-agent-resource'),
}));
jest.mock('../../../stream/map-chunk', () => ({
	mapMastraChunkToEvent: jest.fn(),
}));

import type { ToolsInput } from '@mastra/core/agent';

import type { InstanceAiEventSink } from '../../../event-bus/event-bus.interface';
import type { OrchestrationContext, TaskStorage } from '../../../types';

const { createBuildWorkflowAgentTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../build-workflow-agent.tool') as typeof import('../build-workflow-agent.tool');

function createMockEventBus(): InstanceAiEventSink {
	return {
		publish: jest.fn(),
	};
}

function createMockContext(overrides?: Partial<OrchestrationContext>): OrchestrationContext {
	const domainTools: ToolsInput = {
		'build-workflow': { id: 'build-workflow' } as never,
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
			taskId: 'build-existing',
			executionKey: 'workflow-build:key',
		}),
		cancelBackgroundTask: jest.fn(),
		...overrides,
	};
}

describe('build-workflow-with-agent tool', () => {
	it('returns the started task metadata and publishes agent-spawned when creating a new task', async () => {
		const context = createMockContext();
		const tool = createBuildWorkflowAgentTool(context);

		const result = (await tool.execute!({ task: 'Build a weather workflow' }, {} as never)) as {
			started: boolean;
			reused: boolean;
			result: string;
			taskId?: string;
		};

		expect(result).toMatchObject({
			started: true,
			reused: false,
			taskId: 'build-existing',
		});
		expect(result.result).toContain('Workflow build started');
		const publishMock = context.eventBus.publish as jest.Mock;
		expect(publishMock).toHaveBeenCalledTimes(1);
		const [threadId, event] = publishMock.mock.calls[0] as [
			string,
			{
				type: string;
				runId: string;
				payload: {
					role: string;
					taskId: string;
				};
			},
		];
		expect(threadId).toBe('thread-123');
		expect(event.type).toBe('agent-spawned');
		expect(event.runId).toBe('run-123');
		expect(event.payload.role).toBe('workflow-builder');
		expect(event.payload.taskId).toBe('build-existing');
	});

	it('reuses an active build task without publishing a new agent-spawned event', async () => {
		const context = createMockContext({
			spawnBackgroundTask: jest.fn().mockReturnValue({
				started: true,
				reused: true,
				taskId: 'build-running',
				executionKey: 'workflow-build:key',
			}),
		});
		const tool = createBuildWorkflowAgentTool(context);

		const result = (await tool.execute!({ task: 'Build a weather workflow' }, {} as never)) as {
			started: boolean;
			reused: boolean;
			result: string;
			taskId?: string;
		};

		expect(result).toMatchObject({
			started: true,
			reused: true,
			taskId: 'build-running',
		});
		expect(result.result).toContain('already running');
		expect(context.eventBus.publish).not.toHaveBeenCalled();
	});
});
