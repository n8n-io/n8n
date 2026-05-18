import type { BuiltTool } from '@n8n/agents';
import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import { createToolRegistry } from '../../../tool-registry';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { buildEvalSetupTools } from '../eval-setup-agent.tool';

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
	return ctx;
}

describe('buildEvalSetupTools', () => {
	it('overrides update-gated workflow actions so they do not prompt when parent permission is require_approval', async () => {
		const ctx = makeContext('require_approval');
		const tools = buildEvalSetupTools(ctx);
		const suspend = jest.fn();
		const workflows = tools.get('workflows');

		const result = (await workflows?.handler!(
			{
				action: 'update-version',
				workflowId: 'w1',
				versionId: 'v1',
				name: 'Eval setup',
			},
			{ suspend, resumeData: undefined } as never,
		)) as Record<string, unknown>;

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.domainContext!.workflowService.updateVersion).toHaveBeenCalledWith(
			'w1',
			'v1',
			expect.objectContaining({ name: 'Eval setup' }),
		);
		expect(result).toMatchObject({ success: true });
	});

	it('leaves the original workflows tool in place when admin has blocked updates', () => {
		const ctx = makeContext('blocked');
		const tools = buildEvalSetupTools(ctx);
		expect(tools.get('workflows')).toBe(sentinelOriginalWorkflows);
	});
});
