import type { Agent as RuntimeAgent, BuiltTool } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import type { INode, IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentRuntime, AgentRuntimeCacheService } from '../../agent-runtime-cache.service';
import { hashAgentSandboxPrincipal } from '../../agent-sandbox-principal';
import { draftChatMemoryResourceId } from '../../utils/agent-memory-scope';
import { HeldActionCommitService } from '../held-action-commit.service';
import { SimulationSession } from '../simulation-session';
import type { SimulationSessionService } from '../simulation-session.service';
import type { SimulationWorld } from '../tool-simulation.contracts';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn(),
}));

const user = mock<User>({ id: 'user-1' });
const slackNode = mock<INode>({ type: 'n8n-nodes-base.slack', name: 'Slack' });

function createSimulatedSession() {
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
		capabilities: [
			{ toolName: 'slack_post_message', kind: 'node', testability: 'simulated' },
			{ toolName: 'gmail_send_email', kind: 'node', testability: 'simulated' },
			{ toolName: 'crm_update_contact', kind: 'node', testability: 'simulated' },
		],
	});

	return { session, world };
}

async function captureHeldWrite(
	session: SimulationSession,
	toolName: string,
	toolCallId: string,
	input: Record<string, unknown>,
	realExecutor: (input: unknown) => Promise<unknown>,
) {
	const additionalData = mock<IWorkflowExecuteAdditionalData>();
	session.instrumentation().configureToolAdditionalData?.(additionalData, {
		toolName,
		toolKind: 'node',
	});

	const tool: BuiltTool = {
		name: toolName,
		description: toolName,
		metadata: {
			kind: 'node',
			nodeType: 'n8n-nodes-base.slack',
			nodeParameters: { operation: 'post' },
		},
		handler: async () => {
			// During test run, outbound HTTP hits the mock handler and never calls realExecutor.
			const res = await additionalData.evalLlmMockHandler!(
				{ url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: input },
				slackNode,
			);
			if (res === undefined) {
				await realExecutor(input);
			}
			return res;
		},
	};

	await session.interceptor(
		{ tool, toolCallId, input },
		async () => await tool.handler!(input, {}),
	);
}

function makeAgent(tools: BuiltTool[], mcpTools: BuiltTool[] = []) {
	return {
		declaredTools: tools,
		listMcpTools: vi.fn().mockResolvedValue(mcpTools),
	} as unknown as RuntimeAgent;
}

function makeRuntime(tools: BuiltTool[], mcpTools: BuiltTool[] = []) {
	const agent = makeAgent(tools, mcpTools);
	const runtime = mock<AgentRuntime>({ agent });
	const runtimeCache = mock<AgentRuntimeCacheService>();
	runtimeCache.getRuntime.mockResolvedValue(runtime);
	return { agent, runtime, runtimeCache };
}

describe('HeldActionCommitService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('rejects a commit from a user without agent:read, because the replay runs the draft', async () => {
		vi.mocked(userHasScopes).mockResolvedValue(false);
		const simulationSessions = mock<SimulationSessionService>();
		const runtimeCache = mock<AgentRuntimeCacheService>();
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		await expect(
			service.commitHeldActions({
				agentId: 'agent-1',
				projectId: 'project-1',
				user,
				testChatId: 'chat-1',
				actionIds: ['tc-1'],
			}),
		).rejects.toThrow(ForbiddenError);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
			projectId: 'project-1',
		});
		expect(simulationSessions.getSession).not.toHaveBeenCalled();
		expect(runtimeCache.getRuntime).not.toHaveBeenCalled();
	});

	it('holds writes during test run, replays them in order once, and returns already_committed on duplicate calls', async () => {
		const { session, world } = createSimulatedSession();
		const callOrder: string[] = [];
		const realSlack = vi.fn(async (input: unknown) => {
			callOrder.push(`slack:${JSON.stringify(input)}`);
			return { ok: true };
		});
		const realGmail = vi.fn(async (input: unknown) => {
			callOrder.push(`gmail:${JSON.stringify(input)}`);
			return { sent: true };
		});

		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Hello' }, realSlack);
		await captureHeldWrite(session, 'gmail_send_email', 'tc-2', { to: 'a@b.com' }, realGmail);

		// Writes did NOT fire during the test run.
		expect(realSlack).not.toHaveBeenCalled();
		expect(realGmail).not.toHaveBeenCalled();
		expect(world.handleRequest).toHaveBeenCalledTimes(2);
		expect(session.listHeldActions().map((a) => a.actionId)).toEqual(['tc-1', 'tc-2']);

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);

		const { agent, runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
			{ name: 'gmail_send_email', description: 'Gmail', handler: realGmail },
		]);

		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		const first = await service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			executionId: 'exec-1',
			actionIds: ['tc-1', 'tc-2'],
		});

		expect(Date.parse(first.committedAt)).not.toBeNaN();
		expect(first.results).toEqual([
			{ actionId: 'tc-1', toolName: 'slack_post_message', status: 'done' },
			{ actionId: 'tc-2', toolName: 'gmail_send_email', status: 'done' },
		]);
		expect(callOrder).toEqual(['slack:{"text":"Hello"}', 'gmail:{"to":"a@b.com"}']);
		expect(runtimeCache.getRuntime).toHaveBeenCalledWith({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			usePublishedVersion: false,
			sandboxPrincipalHash: expect.any(String),
		});
		expect(runtimeCache.releaseRuntimeLease).toHaveBeenCalledWith(agent);

		// Duplicate commit call: idempotent one-shot guard prevents re-execution.
		const second = await service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1', 'tc-2'],
		});

		expect(second.results).toEqual([
			{ actionId: 'tc-1', toolName: 'slack_post_message', status: 'already_committed' },
			{ actionId: 'tc-2', toolName: 'gmail_send_email', status: 'already_committed' },
		]);
		expect(realSlack).toHaveBeenCalledTimes(1);
		expect(realGmail).toHaveBeenCalledTimes(1);
		// No runtime lease needed when every action is already committed.
		expect(runtimeCache.getRuntime).toHaveBeenCalledTimes(1);
	});

	it('prevents double execution when duplicate actionIds arrive in the same request or concurrently', async () => {
		const { session } = createSimulatedSession();
		let releaseTool!: () => void;
		const realSlack = vi.fn(
			async () =>
				await new Promise<void>((resolve) => {
					releaseTool = resolve;
				}),
		);

		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Once' }, realSlack);

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
		]);

		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		const req1 = service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1', 'tc-1'],
		});
		const req2 = service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1'],
		});

		// Flush microtasks until tool handler starts.
		await vi.waitFor(() => expect(realSlack).toHaveBeenCalledTimes(1));
		releaseTool();

		const [res1, res2] = await Promise.all([req1, req2]);
		expect(res1.results).toEqual([
			{ actionId: 'tc-1', toolName: 'slack_post_message', status: 'done' },
			{ actionId: 'tc-1', toolName: 'slack_post_message', status: 'already_committed' },
		]);
		expect(res2.results).toEqual([
			{ actionId: 'tc-1', toolName: 'slack_post_message', status: 'already_committed' },
		]);
		expect(realSlack).toHaveBeenCalledTimes(1);
	});

	it('captures per-action failure with a safe error message and keeps remaining actions running', async () => {
		const { session } = createSimulatedSession();
		const realSlack = vi
			.fn()
			.mockRejectedValueOnce(new Error('Slack API error with Bearer sk-secret-token-12345\nstack'))
			.mockResolvedValueOnce({ ok: true });
		const realGmail = vi.fn().mockResolvedValue({ ok: true });

		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Fail' }, vi.fn());
		await captureHeldWrite(session, 'gmail_send_email', 'tc-2', { to: 'a@b.com' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
			{ name: 'gmail_send_email', description: 'Gmail', handler: realGmail },
		]);

		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		const first = await service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1', 'tc-2', 'tc-missing'],
		});

		expect(first.results[0]).toMatchObject({
			actionId: 'tc-1',
			toolName: 'slack_post_message',
			status: 'failed',
		});
		expect(first.results[0].error).not.toContain('sk-secret-token-12345');
		expect(first.results[0].error).not.toContain('\n');
		expect(first.results[1]).toEqual({
			actionId: 'tc-2',
			toolName: 'gmail_send_email',
			status: 'done',
		});
		expect(first.results[2]).toEqual({
			actionId: 'tc-missing',
			toolName: 'unknown',
			status: 'failed',
			error: 'Held action not found in this test chat.',
		});
	});

	it('does not run an action again after its handler rejected, because the service may have accepted the write', async () => {
		const { session } = createSimulatedSession();
		// The write reached the service, and then the response timed out.
		const realSlack = vi
			.fn()
			.mockRejectedValueOnce(new Error('timeout of 30000ms exceeded'))
			.mockResolvedValue({ ok: true });
		const realGmail = vi.fn().mockResolvedValue({ ok: true });

		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Once' }, vi.fn());
		await captureHeldWrite(session, 'gmail_send_email', 'tc-2', { to: 'a@b.com' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
			{ name: 'gmail_send_email', description: 'Gmail', handler: realGmail },
		]);
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);
		const request = {
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1', 'tc-2'],
		};

		const first = await service.commitHeldActions(request);
		expect(first.results[0]).toMatchObject({ actionId: 'tc-1', status: 'failed' });

		const retry = await service.commitHeldActions(request);

		expect(realSlack).toHaveBeenCalledTimes(1);
		expect(realGmail).toHaveBeenCalledTimes(1);
		expect(retry.results).toEqual([
			{
				actionId: 'tc-1',
				toolName: 'slack_post_message',
				status: 'failed',
				error: expect.stringContaining('timeout of 30000ms exceeded'),
			},
			{ actionId: 'tc-2', toolName: 'gmail_send_email', status: 'already_committed' },
		]);
		expect(retry.results[0].error).toContain('did not run again');
		expect(session.getHeldAction('tc-1')?.committedAt).toBeUndefined();
	});

	it('keeps an action replayable when the replay did not start', async () => {
		const { session } = createSimulatedSession();
		const realSlack = vi.fn().mockResolvedValue({ ok: true });
		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Later' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtime, runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
		]);
		const missingTool = mock<AgentRuntime>({ agent: makeAgent([]) });
		runtimeCache.getRuntime
			.mockRejectedValueOnce(new Error('Runtime build failed'))
			.mockResolvedValueOnce(missingTool)
			.mockResolvedValueOnce(runtime);
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);
		const request = {
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1'],
		};

		await expect(service.commitHeldActions(request)).rejects.toThrow('Runtime build failed');
		const withoutTool = await service.commitHeldActions(request);
		expect(withoutTool.results[0]).toMatchObject({ actionId: 'tc-1', status: 'failed' });
		expect(realSlack).not.toHaveBeenCalled();

		const replay = await service.commitHeldActions(request);

		expect(replay.results).toEqual([
			{ actionId: 'tc-1', toolName: 'slack_post_message', status: 'done' },
		]);
		expect(realSlack).toHaveBeenCalledTimes(1);
	});

	it('replays a held action of an MCP tool', async () => {
		const { session } = createSimulatedSession();
		const realMcp = vi.fn().mockResolvedValue({ ok: true });
		await captureHeldWrite(session, 'crm_update_contact', 'tc-1', { id: 'c-1' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime(
			[],
			[{ name: 'crm_update_contact', description: 'CRM', handler: realMcp, mcpTool: true }],
		);
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		const result = await service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1'],
		});

		expect(result.results).toEqual([
			{ actionId: 'tc-1', toolName: 'crm_update_contact', status: 'done' },
		]);
		expect(realMcp).toHaveBeenCalledWith({ id: 'c-1' }, expect.anything());
	});

	it('reports a policy refusal as failed and keeps the action replayable', async () => {
		const { session } = createSimulatedSession();
		const realSlack = vi
			.fn()
			.mockResolvedValueOnce({
				isPolicyRefusal: true,
				message: 'Slack is blocked by policy',
				violations: [{ message: 'Slack is blocked by policy' }],
				instruction: 'Do not retry.',
			})
			.mockResolvedValueOnce({ ok: true });
		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Hi' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
		]);
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);
		const request = {
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1'],
		};

		const refused = await service.commitHeldActions(request);
		expect(refused.results).toEqual([
			{
				actionId: 'tc-1',
				toolName: 'slack_post_message',
				status: 'failed',
				error: 'Slack is blocked by policy',
			},
		]);
		expect(session.getHeldAction('tc-1')?.committedAt).toBeUndefined();

		// The refused call sent nothing, so a later commit can run it.
		const replay = await service.commitHeldActions(request);
		expect(replay.results[0]).toMatchObject({ actionId: 'tc-1', status: 'done' });
	});

	it('replays in the thread scope of the test chat, so file inputs resolve', async () => {
		const { session } = createSimulatedSession();
		const realSlack = vi.fn().mockResolvedValue({ ok: true });
		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Hi' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: realSlack },
		]);
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		await service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1'],
		});

		expect(realSlack).toHaveBeenCalledWith(
			{ text: 'Hi' },
			expect.objectContaining({
				persistence: { threadId: 'chat-1', resourceId: draftChatMemoryResourceId('user-1') },
			}),
		);
	});

	it('builds the replay runtime with the sandbox scope of the test chat', async () => {
		const { session } = createSimulatedSession();
		await captureHeldWrite(session, 'slack_post_message', 'tc-1', { text: 'Hi' }, vi.fn());

		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(session);
		const { runtimeCache } = makeRuntime([
			{ name: 'slack_post_message', description: 'Slack', handler: vi.fn() },
		]);
		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		await service.commitHeldActions({
			agentId: 'agent-1',
			projectId: 'project-1',
			user,
			testChatId: 'chat-1',
			actionIds: ['tc-1'],
		});

		const params = runtimeCache.getRuntime.mock.calls[0][0];
		expect(params.sandboxPrincipalHash).toBe(
			hashAgentSandboxPrincipal({ type: 'test-chat', userId: 'user-1', threadId: 'chat-1' }),
		);
		// The replay must run live: a simulation session on the runtime would intercept it.
		expect(params.simulation).toBeUndefined();
	});

	it('throws NotFoundError when no simulation session is bound to the caller, agent, and test chat', async () => {
		const simulationSessions = mock<SimulationSessionService>();
		simulationSessions.getSession.mockReturnValue(undefined);
		const runtimeCache = mock<AgentRuntimeCacheService>();

		const service = new HeldActionCommitService(mock<Logger>(), simulationSessions, runtimeCache);

		await expect(
			service.commitHeldActions({
				agentId: 'agent-1',
				projectId: 'project-1',
				user,
				testChatId: 'other-chat',
				actionIds: ['tc-1'],
			}),
		).rejects.toThrow(NotFoundError);
		expect(simulationSessions.getSession).toHaveBeenCalledWith({
			userId: 'user-1',
			projectId: 'project-1',
			agentId: 'agent-1',
			testChatId: 'other-chat',
		});
		expect(runtimeCache.getRuntime).not.toHaveBeenCalled();
	});
});
