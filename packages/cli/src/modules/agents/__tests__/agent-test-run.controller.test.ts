import type { Agent as RuntimeAgent, BuiltTool } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest, User } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentRuntime, AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentTestRunController } from '../agent-test-run.controller';
import { HeldActionCommitService } from '../simulation/held-action-commit.service';
import type { SafeTestingFlagGate } from '../simulation/safe-testing-flag-gate';
import { SimulationSession } from '../simulation/simulation-session';
import type { SimulationSessionService } from '../simulation/simulation-session.service';
import type { SimulationWorld } from '../simulation/tool-simulation.contracts';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

describe('AgentTestRunController', () => {
	const user = mock<User>({ id: 'user-1' });
	const req = mock<AuthenticatedRequest<{ projectId: string }>>({ user });

	beforeEach(() => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('lists which tools can run in a test run', async () => {
		const sessions = mock<SimulationSessionService>();
		sessions.describeTools.mockResolvedValue([
			{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' },
		]);
		const controller = new AgentTestRunController(
			mock<SafeTestingFlagGate>(),
			sessions,
			mock<HeldActionCommitService>(),
		);

		await expect(
			controller.listTestRunTools(req, mock<Response>(), 'project-1', 'agent-1'),
		).resolves.toEqual({
			tools: [{ toolName: 'Send_Slack', kind: 'node', testability: 'simulated' }],
		});
		expect(sessions.describeTools).toHaveBeenCalledWith('agent-1', 'project-1');
	});

	it('returns 404 while the flag is off for listTestRunTools', async () => {
		const sessions = mock<SimulationSessionService>();
		const flagGate = mock<SafeTestingFlagGate>();
		flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));
		const controller = new AgentTestRunController(
			flagGate,
			sessions,
			mock<HeldActionCommitService>(),
		);

		await expect(
			controller.listTestRunTools(req, mock<Response>(), 'project-1', 'agent-1'),
		).rejects.toThrow(NotFoundError);
		expect(sessions.describeTools).not.toHaveBeenCalled();
	});

	it('returns 404 while the flag is off for commitHeldActions', async () => {
		const flagGate = mock<SafeTestingFlagGate>();
		flagGate.assertEnabled.mockRejectedValue(new NotFoundError('Not found'));
		const commitService = mock<HeldActionCommitService>();
		const controller = new AgentTestRunController(
			flagGate,
			mock<SimulationSessionService>(),
			commitService,
		);

		await expect(
			controller.commitHeldActions(req, mock<Response>(), 'project-1', 'agent-1', {
				testChatId: 'chat-1',
				actionIds: ['tc-1'],
			}),
		).rejects.toThrow(NotFoundError);
		expect(commitService.commitHeldActions).not.toHaveBeenCalled();
	});

	it('rejects an invalid commit payload with BadRequestError', async () => {
		const commitService = mock<HeldActionCommitService>();
		const controller = new AgentTestRunController(
			mock<SafeTestingFlagGate>(),
			mock<SimulationSessionService>(),
			commitService,
		);

		await expect(
			controller.commitHeldActions(req, mock<Response>(), 'project-1', 'agent-1', {
				testChatId: 'chat-1',
				actionIds: [],
			}),
		).rejects.toThrow(BadRequestError);
		expect(commitService.commitHeldActions).not.toHaveBeenCalled();
	});

	it('replays held actions once through POST /:agentId/test-run/commit and returns already_committed on duplicate calls', async () => {
		const world: SimulationWorld = {
			worldId: 'world-1',
			backend: 'llm-mock',
			handleRequest: vi.fn().mockResolvedValue({
				outcome: 'served',
				source: 'world_state',
				status: 200,
				body: { ok: true },
			}),
		};
		const session = new SimulationSession({
			testChatId: 'chat-1',
			world,
			capabilities: [{ toolName: 'send_slack', kind: 'node', testability: 'simulated' }],
		});

		const realHandler = vi.fn().mockResolvedValue({ ok: true });
		const additionalData = mock<IWorkflowExecuteAdditionalData>();
		session.instrumentation().configureToolAdditionalData?.(additionalData, {
			toolName: 'send_slack',
			toolKind: 'node',
		});
		const slackNode = mock<INode>({ type: 'n8n-nodes-base.slack', name: 'Slack' });
		const simTool: BuiltTool = {
			name: 'send_slack',
			description: 'Send Slack',
			metadata: {
				kind: 'node',
				nodeType: 'n8n-nodes-base.slack',
				nodeParameters: { operation: 'post' },
			},
			handler: async () =>
				await additionalData.evalLlmMockHandler!(
					{ url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { text: 'Hi' } },
					slackNode,
				),
		};

		await session.interceptor(
			{ tool: simTool, toolCallId: 'tc-1', input: { channel: '#general', text: 'Hi' } },
			async () => await simTool.handler!({}, {}),
		);
		expect(realHandler).not.toHaveBeenCalled();

		const sessions = mock<SimulationSessionService>();
		sessions.getSession.mockResolvedValue(session);

		const agent = {
			declaredTools: [{ name: 'send_slack', description: 'Send Slack', handler: realHandler }],
			listMcpTools: vi.fn().mockResolvedValue([]),
		} as unknown as RuntimeAgent;
		const runtimeCache = mock<AgentRuntimeCacheService>();
		runtimeCache.getRuntime.mockResolvedValue(mock<AgentRuntime>({ agent }));

		const commitService = new HeldActionCommitService(mock<Logger>(), sessions, runtimeCache);
		const controller = new AgentTestRunController(
			mock<SafeTestingFlagGate>(),
			sessions,
			commitService,
		);

		const first = await controller.commitHeldActions(
			req,
			mock<Response>(),
			'project-1',
			'agent-1',
			{
				testChatId: 'chat-1',
				executionId: 'exec-1',
				actionIds: ['tc-1'],
			},
		);
		expect(Date.parse(first.committedAt)).not.toBeNaN();
		expect(first.results).toEqual([{ actionId: 'tc-1', toolName: 'send_slack', status: 'done' }]);
		expect(realHandler).toHaveBeenCalledTimes(1);
		expect(realHandler).toHaveBeenCalledWith(
			{ channel: '#general', text: 'Hi' },
			expect.objectContaining({ toolCallId: 'tc-1', toolName: 'send_slack', runId: 'exec-1' }),
		);

		const second = await controller.commitHeldActions(
			req,
			mock<Response>(),
			'project-1',
			'agent-1',
			{
				testChatId: 'chat-1',
				actionIds: ['tc-1'],
			},
		);
		expect(second.results).toEqual([
			{ actionId: 'tc-1', toolName: 'send_slack', status: 'already_committed' },
		]);
		expect(realHandler).toHaveBeenCalledTimes(1);
	});
});
