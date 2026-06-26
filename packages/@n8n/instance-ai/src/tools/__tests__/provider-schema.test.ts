import type { BuiltTool } from '@n8n/agents';
import { z } from 'zod';

import { createAllTools, createOrchestrationTools, createOrchestratorDomainTools } from '..';
import type { InstanceAiContext, OrchestrationContext } from '../../types';

function createCallableService() {
	return new Proxy(
		{},
		{
			get: () => vi.fn(),
		},
	);
}

function createInstanceAiContext(): InstanceAiContext {
	const service = createCallableService();

	return {
		userId: 'user-1',
		workflowService: service,
		executionService: service,
		credentialService: service,
		nodeService: service,
		dataTableService: service,
		workspaceService: service,
		logger: {
			debug: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		},
	} as unknown as InstanceAiContext;
}

function createOrchestrationContext(): OrchestrationContext {
	const domainContext = createInstanceAiContext();

	return {
		threadId: 'thread-1',
		runId: 'run-1',
		userId: 'user-1',
		orchestratorAgentId: 'agent-1',
		modelId: 'test-model',
		subAgentMaxSteps: 1,
		eventBus: {},
		logger: domainContext.logger,
		domainTools: createAllTools(domainContext),
		abortSignal: new AbortController().signal,
		taskStorage: {},
		workflowTaskService: {
			getBuildOutcome: vi.fn(),
			getLatestBuildOutcomeForWorkflow: vi.fn(),
		},
		domainContext,
		plannedTaskService: {},
		schedulePlannedTasks: vi.fn(),
	} as unknown as OrchestrationContext;
}

function isProviderObjectInputSchema(schema: BuiltTool['inputSchema']): boolean {
	if (!schema) return true;

	if (schema instanceof z.ZodObject || schema instanceof z.ZodRecord) {
		return true;
	}

	if (typeof schema === 'object' && schema !== null && !Array.isArray(schema)) {
		return Reflect.get(schema, 'type') === 'object';
	}

	return false;
}

describe('provider-facing tool schemas', () => {
	it('registers only top-level object input schemas for native Instance AI tools', () => {
		const domainContext = createInstanceAiContext();
		const orchestrationContext = createOrchestrationContext();
		const toolSets = [
			createAllTools(domainContext),
			createOrchestratorDomainTools(domainContext),
			createOrchestrationTools(orchestrationContext),
		];
		const invalidTools = toolSets.flatMap((tools) =>
			Array.from(tools)
				.filter(([, tool]) => !isProviderObjectInputSchema(tool.inputSchema))
				.map(([name, tool]) => `${name}:${tool.inputSchema?.constructor.name ?? 'unknown'}`),
		);

		expect(invalidTools).toEqual([]);
	});
});
