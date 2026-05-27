import type { BuiltTool } from '@n8n/agents';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiEventBus } from '../../../event-bus/event-bus.interface';
import { createToolRegistry } from '../../../tool-registry';
import type { OrchestrationContext, TaskStorage } from '../../../types';

const {
	createBrowserCredentialSetupTool,
	__testHasPermanentBrowserDenial,
	__testIsPermanentDenialResult,
	__testWrapBrowserToolsForDenialDetection,
} =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../browser-credential-setup.tool') as typeof import('../browser-credential-setup.tool');

const PERMANENT_DENIAL_MESSAGE = 'User permanently denied access to browser: https://example.com';

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
	const mcpTools = createToolRegistry([
		[
			'browser_click',
			{
				name: 'browser_click',
				description: 'Click in the browser',
				handler: jest.fn(),
			},
		],
	]);

	return {
		threadId: 'thread-123',
		runId: 'run-123',
		userId: 'test-user',
		orchestratorAgentId: 'agent-001',
		modelId: 'anthropic/claude-sonnet-4-5',
		subAgentMaxSteps: 10,
		eventBus: createMockEventBus(),
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
		domainTools: createToolRegistry(),
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

function makeTool(name: string, handler: NonNullable<BuiltTool['handler']>): BuiltTool {
	return {
		name,
		description: name,
		handler,
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

	it('detects permanent browser denial in native MCP error results', () => {
		expect(
			__testIsPermanentDenialResult({
				isError: true,
				structuredContent: { error: PERMANENT_DENIAL_MESSAGE },
				content: [{ type: 'text', text: JSON.stringify({ error: PERMANENT_DENIAL_MESSAGE }) }],
			}),
		).toBe(true);

		expect(
			__testIsPermanentDenialResult({
				isError: true,
				structuredContent: { error: 'User denied access to browser: https://example.com' },
			}),
		).toBe(false);
	});

	it('wraps browser tools to flag permanent denial before nudging', async () => {
		const onDenied = jest.fn();
		const registry = createToolRegistry([
			[
				'browser_click',
				makeTool(
					'browser_click',
					async () =>
						await Promise.resolve({
							isError: true,
							structuredContent: { error: PERMANENT_DENIAL_MESSAGE },
							content: [
								{ type: 'text', text: JSON.stringify({ error: PERMANENT_DENIAL_MESSAGE }) },
							],
						}),
				),
			],
		]);

		const wrapped = __testWrapBrowserToolsForDenialDetection(registry, onDenied);
		await wrapped.get('browser_click')?.handler?.({}, {});

		expect(onDenied).toHaveBeenCalledTimes(1);
	});

	it('does not flag permanent denial from non-browser tools', async () => {
		const onDenied = jest.fn();
		const registry = createToolRegistry([
			[
				'research',
				makeTool(
					'research',
					async () =>
						await Promise.resolve({
							isError: true,
							structuredContent: { error: PERMANENT_DENIAL_MESSAGE },
						}),
				),
			],
		]);

		const wrapped = __testWrapBrowserToolsForDenialDetection(registry, onDenied);
		await wrapped.get('research')?.handler?.({}, {});

		expect(onDenied).not.toHaveBeenCalled();
	});

	it('detects permanent browser denial from stream work summaries', () => {
		expect(
			__testHasPermanentBrowserDenial({
				toolCalls: [
					{
						toolCallId: 'tc-1',
						toolName: 'browser_click',
						succeeded: false,
						errorSummary: PERMANENT_DENIAL_MESSAGE,
					},
				],
				totalToolCalls: 1,
				totalToolErrors: 1,
			}),
		).toBe(true);
	});
});
