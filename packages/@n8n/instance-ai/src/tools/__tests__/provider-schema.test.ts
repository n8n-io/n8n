import type { BuiltTool } from '@n8n/agents';
import { zodSchema } from 'ai';
import { z } from 'zod';

import { createOrchestrationTools, createOrchestratorDomainTools } from '..';
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
		evaluationConfigService: service,
		mcpService: service,
		activityService: service,
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
		eventBus: {},
		logger: domainContext.logger,
		abortSignal: new AbortController().signal,
		taskStorage: {},
		workflowTaskService: {
			getBuildOutcome: vi.fn(),
			getLatestBuildOutcomeForWorkflow: vi.fn(),
		},
		domainContext,
	} as unknown as OrchestrationContext;
}

async function isProviderObjectInputSchema(schema: BuiltTool['inputSchema']): Promise<boolean> {
	if (!schema) return true;

	// Check the JSON schema that the AI SDK sends, not the Zod class: a
	// refinement wraps the object in ZodEffects but serializes as the object.
	if (schema instanceof z.ZodType) {
		const jsonSchema = await zodSchema(schema).jsonSchema;
		return jsonSchema.type === 'object';
	}

	if (typeof schema === 'object' && schema !== null && !Array.isArray(schema)) {
		return Reflect.get(schema, 'type') === 'object';
	}

	return false;
}

describe('provider-facing tool schemas', () => {
	it('registers only top-level object input schemas for native Instance AI tools', async () => {
		const domainContext = createInstanceAiContext();
		const orchestrationContext = createOrchestrationContext();
		const toolSets = [
			createOrchestratorDomainTools(domainContext),
			createOrchestrationTools(orchestrationContext),
		];
		const invalidTools: string[] = [];
		for (const [name, tool] of toolSets.flatMap((tools) => Array.from(tools))) {
			if (!(await isProviderObjectInputSchema(tool.inputSchema))) {
				invalidTools.push(`${name}:${tool.inputSchema?.constructor.name ?? 'unknown'}`);
			}
		}

		expect(invalidTools).toEqual([]);
	});
});
