import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { AI_GATEWAY_SENTINEL } from '../constants';
import { createApplyWorkflowCredentialsTool } from '../apply-workflow-credentials.tool';

function makeContext(overrides: Partial<InstanceAiContext> = {}): OrchestrationContext {
	const workflowJson = {
		nodes: [
			{
				id: 'node-1',
				name: 'Gemini',
				type: 'n8n-nodes-base.lmChatGoogleGemini',
				typeVersion: 1,
				position: [0, 0] as [number, number],
				parameters: {},
				credentials: {} as Record<string, unknown>,
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
		...overrides,
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

describe('createApplyWorkflowCredentialsTool — n8n Connect sentinel', () => {
	const input = {
		workItemId: 'wi_test',
		workflowId: 'wf-1',
		credentials: { googlePalmApi: AI_GATEWAY_SENTINEL },
	};

	it('applies n8n Connect credential when type is supported', async () => {
		const context = makeContext({
			isAiGatewayCredentialTypeSupported: vi.fn().mockResolvedValue(true),
		});
		const tool = createApplyWorkflowCredentialsTool(context);
		const result = await executeTool(tool, input);

		expect(result).toEqual({ success: true, appliedNodes: ['Gemini'] });
		expect(context.domainContext!.workflowService.updateFromWorkflowJSON).toHaveBeenCalled();
	});

	it('applies n8n Connect credential when isAiGatewayCredentialTypeSupported is absent (no guard)', async () => {
		const context = makeContext(); // no support check
		const tool = createApplyWorkflowCredentialsTool(context);
		const result = await executeTool(tool, input);

		expect(result).toEqual({ success: true, appliedNodes: ['Gemini'] });
		expect(context.domainContext!.workflowService.updateFromWorkflowJSON).toHaveBeenCalled();
	});

	it('returns error when credential type is unsupported by n8n Connect', async () => {
		const context = makeContext({
			isAiGatewayCredentialTypeSupported: vi.fn().mockResolvedValue(false),
		});
		const tool = createApplyWorkflowCredentialsTool(context);
		const result = await executeTool(tool, input);

		expect(result).toMatchObject({
			success: false,
			error: expect.stringContaining('googlePalmApi'),
		});
		expect(context.domainContext!.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it('does not call credentialService.get for the sentinel', async () => {
		const context = makeContext({
			isAiGatewayCredentialTypeSupported: vi.fn().mockResolvedValue(true),
		});
		const tool = createApplyWorkflowCredentialsTool(context);
		await executeTool(tool, input);

		expect(context.domainContext!.credentialService.get).not.toHaveBeenCalled();
	});

	it('still handles a falsy credId as before (skip credential, node still listed)', async () => {
		const context = makeContext();
		const tool = createApplyWorkflowCredentialsTool(context);
		const result = await executeTool(tool, {
			...input,
			credentials: { googlePalmApi: '' },
		});
		// Empty string is falsy → credential skipped, but node still pushed to appliedNodes
		expect(result).toEqual({ success: true, appliedNodes: ['Gemini'] });
		expect(context.domainContext!.credentialService.get).not.toHaveBeenCalled();
	});
});
