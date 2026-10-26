import { isZodSchema } from '@n8n/agents';
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
				activeVersionId: null,
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
		workflowTemplateService: {} as never,
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

		expect(result).toMatchObject({ success: true, appliedNodes: ['Gemini'] });
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

		expect(result).toMatchObject({ success: true, appliedNodes: ['Notion'] });
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

	it.each([
		{ activeVersionId: null, live: 'unpublished' },
		{ activeVersionId: 'v-published', live: 'stale' },
		{ activeVersionId: 'v-saved', live: 'current' },
	])('reports $live state from the credential save', async ({ activeVersionId, live }) => {
		const context = makeContext();
		vi.mocked(context.domainContext!.workflowService.updateFromWorkflowJSON).mockResolvedValue({
			id: 'wf-1',
			versionId: 'v-saved',
			activeVersionId,
			checksum: 'saved-checksum',
		} as never);
		const tool = createApplyWorkflowCredentialsTool(context);
		const result = await executeTool(tool, {
			workItemId: 'wi_test',
			workflowId: 'wf-1',
			credentials: { googlePalmApi: 'cred-1' },
		});

		expect(result).toMatchObject({
			success: true,
			publishState: { live, savedVersionId: 'v-saved', activeVersionId },
		});
		if (!isZodSchema(tool.outputSchema)) throw new Error('Expected an output schema');
		expect(tool.outputSchema.parse(result)).toMatchObject({ publishState: result.publishState });
		if (live === 'stale') expect(result.publishStateNote).toContain('this save is a draft');
	});

	it('returns no saved revision when there are no nodes to update', async () => {
		const context = makeContext({ workflowJson: { nodes: [], connections: {} } });
		const result = await executeTool(createApplyWorkflowCredentialsTool(context), {
			workItemId: 'wi_test',
			workflowId: 'wf-1',
			credentials: { googlePalmApi: 'cred-1' },
		});

		expect(result).toEqual({ success: true, appliedNodes: [] });
		expect(context.domainContext!.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
	});

	it.each([{}, { slackApi: 'unrelated' }])(
		'does not save when supplied credentials do not match the mocked node: %j',
		async (credentials) => {
			const context = makeContext();
			const result = await executeTool(createApplyWorkflowCredentialsTool(context), {
				workItemId: 'wi_test',
				workflowId: 'wf-1',
				credentials,
			});

			expect(result).toEqual({ success: true, appliedNodes: [] });
			expect(context.domainContext!.credentialService.get).not.toHaveBeenCalled();
			expect(context.domainContext!.workflowService.updateFromWorkflowJSON).not.toHaveBeenCalled();
		},
	);

	it('reports only nodes that receive a credential and leaves unmatched nodes unchanged', async () => {
		const workflowJson = {
			nodes: [
				{ name: 'Gemini', type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', parameters: {} },
				{ name: 'Slack', type: 'n8n-nodes-base.slack', parameters: {} },
			],
			connections: {},
		};
		const context = makeContext({
			workflowJson,
			buildOutcome: { mockedCredentialsByNode: { Gemini: ['googlePalmApi'], Slack: ['slackApi'] } },
		});
		const result = await executeTool(createApplyWorkflowCredentialsTool(context), {
			workItemId: 'wi_test',
			workflowId: 'wf-1',
			credentials: { googlePalmApi: 'cred-1' },
		});

		expect(result).toMatchObject({
			success: true,
			appliedNodes: ['Gemini'],
			publishState: { savedVersionId: 'v-1' },
		});
		expect(workflowJson.nodes[1]).not.toHaveProperty('credentials');
		expect(context.domainContext!.workflowService.updateFromWorkflowJSON).toHaveBeenCalledTimes(1);
	});

	it('returns no saved revision when the credential save fails', async () => {
		const context = makeContext();
		vi.mocked(context.domainContext!.workflowService.updateFromWorkflowJSON).mockRejectedValue(
			new Error('Save failed'),
		);
		const result = await executeTool(createApplyWorkflowCredentialsTool(context), {
			workItemId: 'wi_test',
			workflowId: 'wf-1',
			credentials: { googlePalmApi: 'cred-1' },
		});

		expect(result.success).toBe(false);
		expect(result).not.toHaveProperty('publishState');
		expect(result).not.toHaveProperty('publishStateNote');
	});
});
