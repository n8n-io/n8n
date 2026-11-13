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

import { SimulationBlockedError, SimulationSession } from '../simulation-session';
import type { SimulatedReply, SimulationWorld } from '../tool-simulation.contracts';

const mockGetBase = vi.fn();
vi.mock('@/workflow-execute-additional-data', () => ({
	getBase: (...args: unknown[]) => mockGetBase(...args),
}));

/**
 * The real Slack node posts a message through the real node executor and the
 * real n8n-core request helpers. The test run must send nothing to Slack.
 */
describe('a write tool in a test run', () => {
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

	function sessionWith(reply: SimulatedReply) {
		const world: SimulationWorld = {
			worldId: 'world-1',
			backend: 'llm-mock',
			handleRequest: vi.fn(async () => await Promise.resolve(reply)),
			save: () => ({}),
		};
		const session = new SimulationSession({
			testChatId: 'chat-1',
			world,
			capabilities: [{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' }],
		});
		return { session, world };
	}

	async function runSlackTool(session: SimulationSession) {
		const tool = slackTool(session);
		return await session.interceptor(
			{ tool, toolCallId: 'tc-1', input: {} },
			async () => await tool.handler!({}, {}),
		);
	}

	it('sends the post to the simulation, not to Slack', async () => {
		const slackApi = nock('https://slack.com').post(/.*/).reply(200, { ok: true });
		const { session, world } = sessionWith({
			outcome: 'served',
			source: 'made_up',
			status: 200,
			body: { ok: true, channel: 'C0123456789', ts: '1700000000.000100', message: {} },
		});

		await runSlackTool(session);

		expect(world.handleRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				protocol: 'http',
				method: 'POST',
				url: expect.stringContaining('slack.com/api/chat.postMessage'),
			}),
			expect.objectContaining({ toolCallId: 'tc-1', nodeType: 'n8n-nodes-base.slack' }),
		);
		const [request] = vi.mocked(world.handleRequest).mock.calls[0];
		expect(JSON.stringify(request)).not.toContain('xoxb-real-looking-token');
		expect(slackApi.isDone()).toBe(false);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'simulated_made_up',
			reason: 'invented_by_llm',
		});
	});

	it('blocks the post and sends nothing when the simulator cannot serve it', async () => {
		const slackApi = nock('https://slack.com').post(/.*/).reply(200, { ok: true });
		const { session } = sessionWith({ outcome: 'unsupported', detail: 'Slack is not supported' });

		await expect(runSlackTool(session)).rejects.toThrow(SimulationBlockedError);

		expect(slackApi.isDone()).toBe(false);
		expect(session.takeDecision('tc-1')).toEqual({
			route: 'blocked',
			reason: 'unsupported_by_simulator',
			detail: 'Slack is not supported',
		});
	});

	it('control: the same tool outside a test run does reach Slack', async () => {
		const slackApi = nock('https://slack.com')
			.post('/api/chat.postMessage')
			.reply(200, { ok: true, channel: 'C0123456789', ts: '1700000000.000100', message: {} });

		const result = await executor.executeInline({
			nodeType: 'n8n-nodes-base.slack',
			nodeTypeVersion: slackVersion,
			nodeParameters: postMessage,
			inputData: [{ json: {} }],
			projectId: 'project-1',
			credentialDetails: { slackApi: { id: 'cred-1', name: 'Slack' } },
		});

		expect(result.error).toBeUndefined();
		expect(result).toMatchObject({ status: 'success' });
		expect(slackApi.isDone()).toBe(true);
	});
});
