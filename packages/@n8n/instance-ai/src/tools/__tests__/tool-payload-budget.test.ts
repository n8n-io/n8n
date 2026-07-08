import type { BuiltTool } from '@n8n/agents';
import { zodToJsonSchema } from '@n8n/agents';

import { createOrchestratorDomainTools, createOrchestrationTools } from '..';
import type { InstanceAiContext, OrchestrationContext } from '../../types';
import { ORCHESTRATION_TOOL_IDS } from '../tool-ids';
import { createBuildWorkflowTool } from '../workflows/build-workflow.tool';
import { createWorkflowsTool } from '../workflows.tool';

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
		eventBus: {},
		logger: domainContext.logger,
		domainTools: createOrchestratorDomainTools(domainContext),
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

function serializeToolPayload(tool: BuiltTool): string {
	const schema = zodToJsonSchema(tool.inputSchema);
	return JSON.stringify({
		name: tool.name,
		description: tool.description,
		input_schema: schema,
	});
}

function payloadChars(tool: BuiltTool): number {
	return serializeToolPayload(tool).length;
}

/** Workflow-builder recommended set after trimming deferred phase tools. */
const WORKFLOW_BUILDER_RECOMMENDED_TOOL_IDS = [
	'build-workflow',
	'workflows',
	'nodes',
	'verify-built-workflow',
] as const;

const TOOL_PAYLOAD_CHAR_BUDGETS: Record<string, number> = {
	'build-workflow': 1_900,
	workflows: 3_200,
	nodes: 3_400,
	'verify-built-workflow': 2_500,
	'workflow-versions': 1_600,
	executions: 2_800,
	credentials: 2_200,
	'data-tables': 3_200,
};

const WORKFLOW_BUILDER_RECOMMENDED_SET_BUDGET = 10_500;

describe('tool payload budgets', () => {
	const context = createInstanceAiContext();
	const orchestrationContext = createOrchestrationContext();
	const orchestratorTools = createOrchestratorDomainTools(context);
	const orchestrationTools = createOrchestrationTools(orchestrationContext);

	it('keeps workflow-builder recommended tools under per-tool budgets', () => {
		const toolsByName = new Map<string, BuiltTool>([...orchestratorTools, ...orchestrationTools]);

		for (const toolId of WORKFLOW_BUILDER_RECOMMENDED_TOOL_IDS) {
			const tool = toolsByName.get(toolId);
			expect(tool, `missing tool ${toolId}`).toBeDefined();
			const chars = payloadChars(tool!);
			expect(chars).toBeLessThanOrEqual(
				TOOL_PAYLOAD_CHAR_BUDGETS[toolId] ?? Number.MAX_SAFE_INTEGER,
			);
		}
	});

	it('keeps the workflow-builder recommended set under a total budget', () => {
		const toolsByName = new Map<string, BuiltTool>([...orchestratorTools, ...orchestrationTools]);

		const totalChars = WORKFLOW_BUILDER_RECOMMENDED_TOOL_IDS.reduce((sum, toolId) => {
			const tool = toolsByName.get(toolId);
			expect(tool, `missing tool ${toolId}`).toBeDefined();
			return sum + payloadChars(tool!);
		}, 0);

		expect(totalChars).toBeLessThanOrEqual(WORKFLOW_BUILDER_RECOMMENDED_SET_BUDGET);
	});

	it('excludes version-management actions from orchestrator workflows surface', () => {
		const tool = createWorkflowsTool(context, 'orchestrator');
		const schema = tool.inputSchema as { safeParse: (input: unknown) => { success: boolean } };

		expect(schema.safeParse({ action: 'list', workflowId: 'w1' }).success).toBe(true);
		expect(schema.safeParse({ action: 'get-as-code', workflowId: 'w1' }).success).toBe(true);
		expect(schema.safeParse({ action: 'list-versions', workflowId: 'w1' }).success).toBe(false);
		expect(
			schema.safeParse({ action: 'restore-version', workflowId: 'w1', versionId: 'v1' }).success,
		).toBe(false);
		expect(schema.safeParse({ action: 'unarchive', workflowId: 'w1' }).success).toBe(false);
	});

	it('keeps workflow-versions as a separate deferred tool', () => {
		const tool = orchestratorTools.get('workflow-versions');
		expect(tool).toBeDefined();
		const schema = tool!.inputSchema as { safeParse: (input: unknown) => { success: boolean } };

		expect(schema.safeParse({ action: 'list-versions', workflowId: 'w1' }).success).toBe(true);
		expect(
			schema.safeParse({ action: 'restore-version', workflowId: 'w1', versionId: 'v1' }).success,
		).toBe(true);
		expect(schema.safeParse({ action: 'list', workflowId: 'w1' }).success).toBe(false);
	});

	it('keeps build-workflow under budget', () => {
		const tool = createBuildWorkflowTool(context);
		expect(payloadChars(tool)).toBeLessThanOrEqual(TOOL_PAYLOAD_CHAR_BUDGETS['build-workflow']);
	});

	it('keeps verify-built-workflow under budget', () => {
		const tool = orchestrationTools.get(ORCHESTRATION_TOOL_IDS.VERIFY_BUILT_WORKFLOW);
		expect(tool).toBeDefined();
		expect(payloadChars(tool!)).toBeLessThanOrEqual(
			TOOL_PAYLOAD_CHAR_BUDGETS['verify-built-workflow'],
		);
	});
});
