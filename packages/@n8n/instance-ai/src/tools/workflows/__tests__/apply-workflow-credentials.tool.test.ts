import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext, OrchestrationContext } from '../../../types';
import { createApplyWorkflowCredentialsTool } from '../apply-workflow-credentials.tool';

interface MakeContextOptions {
	buildOutcome?: Record<string, unknown>;
	workflowJson?: Record<string, unknown>;
	availableCredentials?: Array<{ id: string; name: string; type: string }>;
}

function makeContext(options: MakeContextOptions = {}): OrchestrationContext {
	const workflowJson = options.workflowJson ?? {
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
			updateFromWorkflowJSON: vi.fn().mockResolvedValue({
				id: 'wf-1',
				versionId: 'v-1',
				checksum: 'checksum-1',
			}),
		} as never,
		credentialService: {
			get: vi.fn().mockResolvedValue({ id: 'cred-1', name: 'My Key' }),
			list: vi.fn().mockResolvedValue(options.availableCredentials ?? []),
		} as never,
		executionService: {} as never,
		nodeService: {} as never,
		dataTableService: {} as never,
		logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } as never,
	};

	return {
		workflowTaskService: {
			getBuildOutcome: vi.fn().mockResolvedValue(
				options.buildOutcome ?? {
					mockedCredentialsByNode: { Gemini: ['googlePalmApi'] },
				},
			),
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

	it('refreshes the stale simulation plan instead of stranding the mocked verdict', async () => {
		const context = makeContext({
			buildOutcome: {
				mockedNodeNames: ['Notion'],
				mockedCredentialTypes: ['notionApi'],
				mockedCredentialsByNode: { Notion: ['notionApi'] },
				nodeSimulationPlan: [
					{
						nodeName: 'Notion',
						verdict: 'simulate',
						reason: 'Credentials are not configured for this node',
						confidence: 'high',
						source: 'deterministic',
					},
				],
				simulationFixtures: { Notion: [{ page: 'mock' }] },
			},
			workflowJson: {
				nodes: [
					{
						id: 'node-1',
						name: 'Notion',
						type: 'n8n-nodes-base.notion',
						typeVersion: 1,
						position: [0, 0] as [number, number],
						parameters: { operation: 'get' },
					},
				],
				connections: {
					Trigger: { main: [[{ node: 'Notion', type: 'main', index: 0 }]] },
				},
			},
			availableCredentials: [{ id: 'cred-1', name: 'My Key', type: 'notionApi' }],
		});
		const tool = createApplyWorkflowCredentialsTool(context);

		const result = await executeTool(tool, {
			workItemId: 'wi_test',
			workflowId: 'wf-1',
			credentials: { notionApi: 'cred-1' },
		});

		expect(result).toEqual({ success: true, appliedNodes: ['Notion'] });
		expect(context.workflowTaskService!.updateBuildOutcome).toHaveBeenCalledWith(
			'wi_test',
			expect.objectContaining({
				mockedNodeNames: undefined,
				mockedCredentialTypes: undefined,
				mockedCredentialsByNode: undefined,
				verificationPinData: undefined,
				nodeSimulationPlan: [expect.objectContaining({ nodeName: 'Notion', verdict: 'execute' })],
				simulationFixtures: undefined,
			}),
		);
	});
});
