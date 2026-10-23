import type { z as zType } from 'zod';

const { createInstanceAgent } = vi.hoisted(() => ({ createInstanceAgent: vi.fn() }));

vi.mock('@n8n/instance-ai', async () => {
	const { z } = await vi.importActual<{ z: typeof zType }>('zod');
	return {
		McpClientManager: class {
			disconnect = vi.fn();
		},
		createDomainAccessTracker: vi.fn(),
		createSandbox: vi.fn(),
		createWorkspace: vi.fn(),
		createLazyRuntimeWorkspace: vi.fn(),
		setupSandboxWorkspace: vi.fn(),
		workflowBuildOutcomeSchema: z.object({}),
		handleBuildOutcome: vi.fn(),
		handleVerificationVerdict: vi.fn(),
		createInstanceAgent,
		createInternalOperationTraceContext: vi.fn(async () => undefined),
		releaseTraceClient: vi.fn(),
		generateTitleForRun: vi.fn(),
		patchThread: vi.fn(),
		setTracePromptVersion: vi.fn(),
		setTraceModelId: vi.fn(),
		modelIdTraceMetadata: () => ({}),
		modelConfigId: () => undefined,
	};
});

import type { User } from '@n8n/db';

import { InstanceAiService } from '../instance-ai.service';

describe('InstanceAiService — agent model transport', () => {
	it('passes the labeled model transport to the orchestrator agent', async () => {
		const modelFetch = vi.fn();
		createInstanceAgent.mockResolvedValue({ agent: {}, mcpConnectionFailures: [] });
		const service = Object.assign(Object.create(InstanceAiService.prototype) as object, {
			bindAgentContextReader: vi.fn(),
			bindAgentPreviewSession: vi.fn(),
			buildMcpServers: vi.fn(async () => []),
			createAgentMemoryOptions: vi.fn(() => ({})),
			memoryTaskObserverFor: vi.fn(),
			subscribeToAgentErrors: vi.fn(),
			instanceAiConfig: { thinkingEnabled: true },
			_mcpClientManager: {},
			modelService: { getLabeledModelFetch: vi.fn(() => modelFetch) },
		}) as unknown as {
			createAgentFromEnvironment: (...args: unknown[]) => Promise<unknown>;
		};

		await service.createAgentFromEnvironment(
			{ modelId: 'anthropic/claude-sonnet-4-6', context: {}, orchestrationContext: {} },
			'thread-1',
			'run-1',
			{ id: 'user-1' } as User,
			undefined,
		);

		expect(createInstanceAgent).toHaveBeenCalledWith(expect.objectContaining({ modelFetch }));
		expect(
			(service as unknown as { modelService: { getLabeledModelFetch: unknown } }).modelService
				.getLabeledModelFetch,
		).toHaveBeenCalledWith({ runId: 'run-1', threadId: 'thread-1' });
	});
});
