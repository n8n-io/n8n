import type { BuiltTool } from '@n8n/agents';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { createToolRegistry } from '../../../tool-registry';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { buildEvalSetupTools, startEvalSetupAgentTask } from '../eval-setup-agent.tool';

const sentinelNodesTool: BuiltTool = { name: 'nodes', description: 'nodes-sentinel' };
const sentinelOriginalWorkflows: BuiltTool = {
	name: 'workflows',
	description: 'workflows-original-sentinel',
};

function makeContext(
	updateWorkflow: NonNullable<InstanceAiContext['permissions']>['updateWorkflow'],
): OrchestrationContext {
	const domainContext = mock<InstanceAiContext>();
	domainContext.permissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS, updateWorkflow };
	domainContext.workflowService.get = jest
		.fn()
		.mockResolvedValue({ id: 'w1', name: 'Test', nodes: [], connections: {}, active: false });
	domainContext.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);
	domainContext.workflowService.updateVersion = jest.fn().mockResolvedValue(undefined);

	const ctx = mock<OrchestrationContext>();
	ctx.domainTools = createToolRegistry([
		['workflows', sentinelOriginalWorkflows],
		['nodes', sentinelNodesTool],
	]);
	ctx.domainContext = domainContext;
	ctx.threadId = 'thread-1';
	ctx.runId = 'run-1';
	ctx.orchestratorAgentId = 'root-agent';
	ctx.modelId = 'test-model' as OrchestrationContext['modelId'];
	ctx.eventBus = { publish: jest.fn() } as unknown as OrchestrationContext['eventBus'];
	ctx.tracing = undefined;
	return ctx;
}

function getInputSchema(tool: BuiltTool | undefined): {
	safeParse: (input: unknown) => { success: boolean };
} {
	return (tool as { inputSchema: { safeParse: (input: unknown) => { success: boolean } } })
		.inputSchema;
}

describe('buildEvalSetupTools', () => {
	it('allows saving workflow JSON without prompting when parent permission is require_approval', async () => {
		const ctx = makeContext('require_approval');
		const tools = buildEvalSetupTools(ctx);
		const suspend = jest.fn();
		const workflows = tools.get('workflows');
		const workflow = { name: 'Eval setup', nodes: [], connections: {} };

		const result = (await workflows?.handler!(
			{
				action: 'update-json',
				workflowId: 'w1',
				workflow,
			},
			{ suspend, resumeData: undefined } as never,
		)) as Record<string, unknown>;

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.domainContext!.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'w1',
			workflow,
		);
		expect(result).toMatchObject({ success: true, workflowId: 'w1' });
	});

	it('exposes only the workflow actions the eval setup agent needs', () => {
		const ctx = makeContext('require_approval');
		const tools = buildEvalSetupTools(ctx);
		const schema = getInputSchema(tools.get('workflows'));

		expect(schema.safeParse({ action: 'get-json', workflowId: 'w1' }).success).toBe(true);
		expect(schema.safeParse({ action: 'get', workflowId: 'w1' }).success).toBe(false);
		expect(
			schema.safeParse({
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Eval setup', nodes: [], connections: {} },
			}).success,
		).toBe(false);
		expect(
			schema.safeParse({
				action: 'update-json',
				workflowId: 'w1',
				workflow: { name: 'Eval setup', nodes: [], connections: {} },
			}).success,
		).toBe(true);
		expect(
			schema.safeParse({
				action: 'update-version',
				workflowId: 'w1',
				versionId: 'v1',
				name: 'Eval setup',
			}).success,
		).toBe(false);
	});

	it('leaves the original workflows tool in place when admin has blocked updates', () => {
		const ctx = makeContext('blocked');
		const tools = buildEvalSetupTools(ctx);
		expect(tools.get('workflows')).toBe(sentinelOriginalWorkflows);
	});
});

describe('startEvalSetupAgentTask', () => {
	it('deduplicates eval setup background tasks by workflow id', () => {
		const ctx = makeContext('require_approval');
		ctx.spawnBackgroundTask = jest.fn().mockReturnValue({
			status: 'started',
			taskId: 'task-1',
			agentId: 'agent-1',
		});

		startEvalSetupAgentTask(ctx, {
			workflowId: 'w1',
			task: 'Set up evals',
			plannedTaskId: 'planned-1',
		});

		expect(ctx.spawnBackgroundTask).toHaveBeenCalledWith(
			expect.objectContaining({
				dedupeKey: {
					role: 'eval-setup',
					workflowId: 'w1',
					plannedTaskId: 'planned-1',
				},
			}),
		);
	});
});
