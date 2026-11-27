import type { BuiltTool } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { CredentialAccessRepository, CredentialsRepository, type CredentialsEntity } from '@n8n/db';
import nock from 'nock';
import { Slack } from 'n8n-nodes-base/dist/nodes/Slack/Slack.node';
import type {
	ICredentialsHelper,
	IHttpRequestOptions,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { NodeTypes } from '@/node-types';
import { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import { PolicyEnforcementService } from '@/policy/policy-enforcement.service';
import { DeprecatedNodesValidationService } from '@/workflows/deprecated-nodes-validation.service';

import { SimulationSession } from '../simulation-session';
import {
	AgentSimulationGymProvider,
	type AgentSimulationGymTenant,
	type GymRequest,
} from '../gym/agent-simulation-gym';
import { GymSimulationBackend } from '../gym/gym-simulation-backend';

const mockGetBase = vi.fn();
vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: (...args: unknown[]) => mockGetBase(...args),
}));

/**
 * The real Slack node posts through the real node executor and request helpers, in a test chat
 * world on the Gym backend. The Gym tenant answers; Slack gets nothing.
 */
describe('a Slack tool in a test chat on the Gym backend', () => {
	const nodeTypes = mockInstance(NodeTypes);
	const logger = mockInstance(Logger);
	logger.scoped.mockReturnValue(logger);
	const credentialsRepository = mockInstance(CredentialsRepository);
	const executor = new EphemeralNodeExecutor(
		nodeTypes,
		credentialsRepository,
		logger,
		mockInstance(PolicyEnforcementService),
		mockInstance(CredentialAccessRepository),
		mockInstance(DeprecatedNodesValidationService),
	);
	const slackVersion = 2.3;
	const slackNodeType = new Slack().getNodeType(slackVersion);
	const postMessage = {
		authentication: 'accessToken',
		resource: 'message',
		operation: 'post',
		select: 'channel',
		channelId: { __rl: true, mode: 'id', value: 'C0123456789' },
		messageType: 'text',
		text: 'The release is out',
		otherOptions: {},
	};

	beforeAll(() => nock.disableNetConnect());
	afterAll(() => nock.enableNetConnect());

	beforeEach(() => {
		nock.cleanAll();
		nodeTypes.getByNameAndVersion.mockReturnValue(slackNodeType);
		// The user's real Slack credential is attached, as in production.
		credentialsRepository.findCredentialsUsableInProject.mockResolvedValue([
			mock<CredentialsEntity>({ id: 'cred-1', name: 'Slack', type: 'slackApi' }),
		]);
		const credentialsHelper = mock<ICredentialsHelper>();
		credentialsHelper.getParentTypes.mockReturnValue([]);
		credentialsHelper.isCredentialUsableByNode.mockReturnValue(true);
		credentialsHelper.getDecrypted.mockResolvedValue({ accessToken: 'xoxb-real-looking-token' });
		credentialsHelper.getCredentialsProperties.mockReturnValue([
			{
				displayName: 'Access Token',
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
		]);
		credentialsHelper.authenticate.mockImplementation(
			async (_credentials, _type, options) => options as IHttpRequestOptions,
		);
		mockGetBase.mockResolvedValue({ credentialsHelper, variables: {}, restApiUrl: '' });
	});

	function slackTool(session: SimulationSession): BuiltTool {
		return {
			name: 'Send_Slack',
			description: 'Post to Slack',
			metadata: { kind: 'node', nodeType: 'n8n-nodes-base.slack' },
			handler: async () => {
				const result = await executor.executeInline({
					nodeType: 'n8n-nodes-base.slack',
					nodeTypeVersion: slackVersion,
					nodeParameters: postMessage,
					inputData: [{ json: {} }],
					projectId: 'project-1',
					nodeName: 'Send_Slack',
					credentialDetails: { slackApi: { id: 'cred-1', name: 'Slack' } },
					configureAdditionalData: (additionalData: IWorkflowExecuteAdditionalData) =>
						session.instrumentation().configureToolAdditionalData?.(additionalData, {
							toolName: 'Send_Slack',
							toolKind: 'node',
						}),
				});
				if (result.status === 'error') throw new Error(result.error);
				return result.data;
			},
		};
	}

	async function openSession(answer: AgentSimulationGymTenant['handle']) {
		const provider = new AgentSimulationGymProvider();
		const handle = vi.fn(answer);
		provider.bind({
			vendorForNodeType: async (nodeType) =>
				nodeType.startsWith('n8n-nodes-base.slack') ? 'slack' : undefined,
			vendorForHost: async (host) => (host === 'slack.com' ? 'slack' : undefined),
			openTenant: async (id) => ({ id, handle, close: async () => {} }),
		});
		const backend = new GymSimulationBackend(provider, logger);
		const agent = {
			agentId: 'agent-1',
			projectId: 'project-1',
			name: 'Release bot',
			instructions: '',
			tools: [{ toolName: 'Send_Slack', kind: 'node' as const, nodeType: 'n8n-nodes-base.slack' }],
		};
		const session = new SimulationSession({
			testChatId: 'chat-1',
			world: await backend.openWorld({
				ownerId: 'user-1',
				testChatId: 'chat-1',
				agent,
				firstMessage: '',
			}),
			capabilities: await backend.describeTools(agent),
		});
		return { session, handle };
	}

	async function runSlackTool(session: SimulationSession) {
		const tool = slackTool(session);
		return await session.interceptor(
			{ tool, toolCallId: 'tc-1', input: {} },
			async () => await tool.handler!({}, {}),
		);
	}

	it('posts into the Gym tenant, not to Slack, and labels it served from the world', async () => {
		const slackApi = nock('https://slack.com').post(/.*/).reply(200, { ok: true });
		const { session, handle } = await openSession(async () => ({
			statusCode: 200,
			headers: { 'content-type': 'application/json' },
			body: { ok: true, channel: 'C0123456789', ts: '1700000000.000100', message: {} },
		}));

		await runSlackTool(session);

		expect(handle).toHaveBeenCalledTimes(1);
		const [vendor, request] = handle.mock.calls[0] as [string, GymRequest];
		expect(vendor).toBe('slack');
		expect(request).toMatchObject({
			method: 'POST',
			url: expect.stringContaining('slack.com/api/chat.postMessage'),
		});
		expect(JSON.stringify(request)).not.toContain('xoxb-real-looking-token');
		expect(slackApi.isDone()).toBe(false);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated',
			reason: 'served_from_world',
			evidence: ['world_write'],
		});
	});

	it('blocks the post when the Gym does not support the route, and never asks an LLM', async () => {
		const slackApi = nock('https://slack.com').post(/.*/).reply(200, { ok: true });
		const { session } = await openSession(async () => ({ statusCode: 501, headers: {}, body: {} }));

		await expect(runSlackTool(session)).rejects.toThrow();

		expect(slackApi.isDone()).toBe(false);
		expect(session.takeDecision('tc-1')).toMatchObject({
			route: 'blocked',
			reason: 'unsupported_by_simulator',
		});
	});
});
