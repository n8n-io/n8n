import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';

import type { InstanceAiContext, OrchestrationContext } from '../../../types';

// Mock heavy Mastra dependencies to avoid ESM issues in Jest
jest.mock('@mastra/core/agent', () => ({
	Agent: jest.fn(),
}));
jest.mock('@mastra/core/mastra', () => ({
	Mastra: jest.fn(),
}));

// Lazy-require so the mocks above are in place before the module's transitive
// Mastra imports execute.
const { buildEvalSetupTools } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../eval-setup-agent.tool') as typeof import('../eval-setup-agent.tool');

const sentinelNodesTool = { id: 'nodes-sentinel' } as never;
const sentinelOriginalWorkflows = { id: 'workflows-original-sentinel' } as never;

function makeContext(
	updateWorkflow: InstanceAiContext['permissions'] extends infer P
		? P extends undefined
			? never
			: P extends { updateWorkflow: infer M }
				? M
				: never
		: never,
): OrchestrationContext {
	const domainContext = mock<InstanceAiContext>();
	domainContext.permissions = { ...DEFAULT_INSTANCE_AI_PERMISSIONS, updateWorkflow };
	domainContext.workflowService.get = jest
		.fn()
		.mockResolvedValue({ id: 'w1', name: 'Test', nodes: [], connections: {}, active: false });
	domainContext.workflowService.updateFromWorkflowJSON = jest.fn().mockResolvedValue(undefined);

	const ctx = mock<OrchestrationContext>();
	ctx.domainTools = { workflows: sentinelOriginalWorkflows, nodes: sentinelNodesTool };
	ctx.domainContext = domainContext;
	return ctx;
}

describe('buildEvalSetupTools', () => {
	it('overrides workflows.update so it does not prompt when parent permission is require_approval', async () => {
		const ctx = makeContext('require_approval');
		const tools = buildEvalSetupTools(ctx);
		const suspend = jest.fn();

		const result = (await tools.workflows.execute!(
			{
				action: 'update',
				workflowId: 'w1',
				workflow: { name: 'Test', nodes: [], connections: {} },
			},
			{ agent: { suspend, resumeData: undefined } } as never,
		)) as Record<string, unknown>;

		expect(suspend).not.toHaveBeenCalled();
		expect(ctx.domainContext!.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'w1',
			expect.objectContaining({ name: 'Test' }),
		);
		expect(result).toMatchObject({ success: true, workflowId: 'w1' });
	});

	it('leaves the original workflows tool in place when admin has blocked updates', () => {
		const ctx = makeContext('blocked');
		const tools = buildEvalSetupTools(ctx);
		expect(tools.workflows).toBe(sentinelOriginalWorkflows);
	});
});
