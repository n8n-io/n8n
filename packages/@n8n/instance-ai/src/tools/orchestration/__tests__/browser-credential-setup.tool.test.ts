import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import type { InstanceAiToolRegistry, OrchestrationContext, TaskStorage } from '../../../types';

const { createBrowserCredentialSetupTool } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../browser-credential-setup.tool') as typeof import('../browser-credential-setup.tool');

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
	const mcpTools: InstanceAiToolRegistry = {
		browser_click: {
			name: 'browser_click',
			description: 'Click in the browser',
			handler: jest.fn(),
		},
	};

	return {
		threadId: 'thread-123',
		runId: 'run-123',
		userId: 'test-user',
		orchestratorAgentId: 'agent-001',
		modelId: 'anthropic/claude-sonnet-4-5',
		subAgentMaxSteps: 10,
		eventBus: createMockEventBus(),
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools: {},
		abortSignal: new AbortController().signal,
		taskStorage: {} as TaskStorage,
		browserMcpConfig: { name: 'chrome-devtools', command: 'npx', args: [] },
		mcpTools,
		spawnBackgroundTask: jest.fn(() => ({
			status: 'started' as const,
			taskId: 'browser-task-id',
			agentId: 'browser-agent-id',
		})),
		cancelBackgroundTask: jest.fn(),
		...overrides,
	};
}

describe('browser-credential-setup tool', () => {
	it('spawns a detached browser task and returns immediately', async () => {
		const context = createMockContext();
		const tool = createBrowserCredentialSetupTool(context);

		const result = await executeTool<{ result: string }>(
			tool,
			{ credentialType: 'googleOAuth2Api', docsUrl: 'https://docs.example/credential' },
			{} as never,
		);

		expect(result.result).toContain('Browser credential setup started');
		type SpawnCall = {
			threadId: string;
			agentId: string;
			role: string;
			taskId: string;
			createTraceContext: unknown;
			run: unknown;
		};
		const spawnMock = context.spawnBackgroundTask as jest.Mock<unknown, [SpawnCall]>;
		const spawnCall = spawnMock.mock.calls[0]?.[0];
		expect(spawnCall).toBeDefined();
		if (!spawnCall) throw new Error('Expected spawnBackgroundTask to be called');
		expect(spawnCall.threadId).toBe('thread-123');
		expect(spawnCall.agentId).toMatch(/^agent-browser-/);
		expect(spawnCall.role).toBe('credential-setup-browser-agent');
		expect(spawnCall.taskId).toMatch(/^browser-credential-/);
		expect(typeof spawnCall.createTraceContext).toBe('function');
		expect(typeof spawnCall.run).toBe('function');

		const publishCall = (context.eventBus.publish as jest.Mock).mock.calls[0] as [
			string,
			{
				type: string;
				runId: string;
				payload: {
					role: string;
					kind: string;
					tools: string[];
				};
			},
		];
		expect(publishCall[0]).toBe('thread-123');
		expect(publishCall[1].type).toBe('agent-spawned');
		expect(publishCall[1].runId).toBe('run-123');
		expect(publishCall[1].payload.role).toBe('credential-setup-browser-agent');
		expect(publishCall[1].payload.kind).toBe('browser-setup');
		expect(publishCall[1].payload.tools).toEqual(
			expect.arrayContaining(['browser_click', 'pause-for-user', 'ask-user']),
		);
	});

	it('does not publish a browser agent when spawn is rejected as duplicate', async () => {
		const context = createMockContext({
			spawnBackgroundTask: jest.fn(() => ({
				status: 'duplicate' as const,
				existing: {
					taskId: 'task-existing',
					agentId: 'agent-existing',
					role: 'credential-setup-browser-agent',
				},
			})),
		});
		const tool = createBrowserCredentialSetupTool(context);

		const result = await executeTool<{ result: string }>(
			tool,
			{ credentialType: 'googleOAuth2Api' },
			{} as never,
		);

		expect(result.result).toContain('already running');
		expect(context.eventBus.publish).not.toHaveBeenCalled();
	});

	it('returns an error when background task support is missing', async () => {
		const context = createMockContext({ spawnBackgroundTask: undefined });
		const tool = createBrowserCredentialSetupTool(context);

		const result = await executeTool<{ result: string }>(
			tool,
			{ credentialType: 'googleOAuth2Api' },
			{} as never,
		);

		expect(result.result).toBe('Browser credential setup requires background task support.');
	});
});
