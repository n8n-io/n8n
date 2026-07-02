import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { createApplyWorkflowCredentialsTool } from '../apply-workflow-credentials.tool';

function makeContext(): OrchestrationContext {
	const workflowJson = {
		nodes: [
			{
				id: 'node-1',
				name: 'Gemini',
				type: 'n8n-nodes-base.lmChatGoogleGemini',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
			},
		],
		connections: {},
	};

	const domainContext: InstanceAiContext = {
		userId: 'user-1',
		workflowService: {
			getAsWorkflowJSON: vi.fn().mockResolvedValue(workflowJson),
			updateFromWorkflowJSON: vi.fn().mockResolvedValue(undefined),
		} as never,
		credentialService: {
			get: vi.fn().mockResolvedValue({ id: 'cred-1', name: 'My Key' }),
		} as never,
		executionService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
	};

	return {
		workflowTaskService: {
			getBuildOutcome: vi.fn().mockResolvedValue({
				mockedCredentialsByNode: { Gemini: ['googlePalmApi'] },
			}),
			updateBuildOutcome: vi.fn().mockResolvedValue(undefined),
		},
		domainContext,
	} as unknown as OrchestrationContext;
}

describe('createApplyWorkflowCredentialsTool', () => {
	it('applies AI Gateway-managed credentials from the setup tag', async () => {
		const context = makeContext();
		const tool = createApplyWorkflowCredentialsTool(context);

		const result = await executeTool(tool, {
			workItemId: 'wi_test',
			workflowId: 'wf-1',
			credentials: { googlePalmApi: AI_GATEWAY_MANAGED_TAG },
		});

		expect(result).toEqual({ success: true, appliedNodes: ['Gemini'] });
		expect(context.domainContext!.credentialService.get).not.toHaveBeenCalled();
		expect(context.domainContext!.workflowService.updateFromWorkflowJSON).toHaveBeenCalledWith(
			'wf-1',
			expect.objectContaining({
				nodes: [
					expect.objectContaining({
						credentials: {
							googlePalmApi: { id: null, name: '', __aiGatewayManaged: true },
						},
					}),
				],
			}),
		);
	});
});
