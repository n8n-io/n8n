// Mock heavy Mastra dependencies to inspect the builder agent wiring without
// running an LLM stream.
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn().mockImplementation(() => ({
		__registerMastra: jest.fn(),
		stream: jest.fn().mockResolvedValue({
			fullStream: (async function* () {})(),
			text: Promise.resolve('builder done'),
		}),
	})),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));
jest.mock('@mastra/core/tools', () => ({
	createTool: jest.fn((config: unknown) => config),
}));
jest.mock('@n8n/workflow-sdk', () => ({
	generateWorkflowCode: jest.fn(() => '// generated code'),
}));
jest.mock('../../../agent/register-with-mastra', () => ({
	registerWithMastra: jest.fn(),
}));
jest.mock('../../../stream/consume-with-hitl', () => ({
	consumeStreamWithHitl: jest.fn().mockResolvedValue({
		text: Promise.resolve('builder done'),
		workSummary: {},
	}),
}));

import { Agent } from '@mastra/core/agent';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { createBuildWorkflowAgentTool } from '../build-workflow-agent.tool';

type ToolSchema = {
	safeParse(input: unknown): { success: boolean };
};

type SpawnedTool = {
	inputSchema?: ToolSchema;
	execute?: (...args: unknown[]) => unknown;
};

type SpawnedAgentConfig = {
	tools: Record<string, SpawnedTool>;
};

type BuildExecutable = {
	execute(input: Record<string, unknown>): Promise<{ result: string; taskId: string }>;
};

type BackgroundTaskInput = {
	run: (
		signal: AbortSignal,
		drainCorrections: () => string[],
		waitForCorrection: () => Promise<void>,
	) => Promise<unknown>;
};

function createDomainContext(): InstanceAiContext {
	return {
		userId: 'test-user',
		permissions: DEFAULT_INSTANCE_AI_PERMISSIONS,
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			unarchive: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		},
		executionService: {},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
			searchCredentialTypes: jest.fn(),
		},
		nodeService: {},
		dataTableService: {},
	} as unknown as InstanceAiContext;
}

function createContext(spawnBackgroundTask: jest.Mock): OrchestrationContext {
	return {
		threadId: 'test-thread',
		runId: 'test-run',
		userId: 'test-user',
		orchestratorAgentId: 'test-agent',
		modelId: 'test-model' as OrchestrationContext['modelId'],
		storage: { id: 'test-storage' } as OrchestrationContext['storage'],
		subAgentMaxSteps: 5,
		taskStorage: {
			get: jest.fn(),
			save: jest.fn(),
		},
		eventBus: {
			publish: jest.fn(),
			subscribe: jest.fn(),
			getEventsAfter: jest.fn(),
			getNextEventId: jest.fn(),
			getEventsForRun: jest.fn().mockReturnValue([]),
			getEventsForRuns: jest.fn().mockReturnValue([]),
		},
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainContext: createDomainContext(),
		domainTools: {
			'build-workflow': { execute: jest.fn() },
		},
		spawnBackgroundTask,
		abortSignal: new AbortController().signal,
	} as OrchestrationContext;
}

function getSpawnedToolSchemas(): Record<string, SpawnedTool> {
	const agentConfig = jest.mocked(Agent).mock.calls.at(-1)?.[0] as SpawnedAgentConfig | undefined;
	if (!agentConfig) throw new Error('Builder agent was not constructed');
	return agentConfig.tools;
}

describe('builder sub-agent tool surface', () => {
	const originalPlanGuard = process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;

	afterEach(() => {
		jest.clearAllMocks();
		if (originalPlanGuard === undefined) {
			delete process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN;
		} else {
			process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = originalPlanGuard;
		}
	});

	it('spawns the builder with scoped workflow and credential action schemas', async () => {
		process.env.N8N_INSTANCE_AI_ENFORCE_BUILD_VIA_PLAN = 'false';
		let capturedRun: BackgroundTaskInput['run'] | undefined;
		const spawnBackgroundTask = jest.fn((input: BackgroundTaskInput) => {
			capturedRun = input.run;
			return { status: 'started', taskId: 'build-task', agentId: 'agent-builder' };
		});
		const context = createContext(spawnBackgroundTask);
		const tool = createBuildWorkflowAgentTool(context) as unknown as BuildExecutable;

		await tool.execute({ task: 'Build a Slack notifier' });
		expect(capturedRun).toBeDefined();

		await capturedRun?.(
			new AbortController().signal,
			() => [],
			async () => {},
		);
		const tools = getSpawnedToolSchemas();

		expect(
			tools.workflows?.inputSchema?.safeParse({ action: 'get-as-code', workflowId: 'w1' }).success,
		).toBe(true);
		expect(
			tools.workflows?.inputSchema?.safeParse({ action: 'publish', workflowId: 'w1' }).success,
		).toBe(false);
		expect(
			tools.workflows?.inputSchema?.safeParse({ action: 'setup', workflowId: 'w1' }).success,
		).toBe(false);
		expect(
			tools.credentials?.inputSchema?.safeParse({ action: 'test', credentialId: 'c1' }).success,
		).toBe(true);
		expect(
			tools.credentials?.inputSchema?.safeParse({
				action: 'setup',
				credentials: [{ credentialType: 'slackApi', reason: 'Send Slack messages' }],
			}).success,
		).toBe(false);
	});
});
