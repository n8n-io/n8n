import { DELEGATE_SUB_AGENT_TOOL_NAME } from '@n8n/agents';
import type { AgentSseEvent } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AppCallContext } from '@n8n/backend-module-apps';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AppAgentAdapter } from '../app-agent.adapter';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@/modules/agents/agent-publish.service', () => ({ AgentPublishService: class {} }));
vi.mock('@/modules/agents/agents.service', () => ({ AgentsService: class {} }));
vi.mock('@/modules/agents/agent-execution-orchestrator.service', () => ({
	AgentExecutionOrchestratorService: class {},
}));
vi.mock('@/modules/agents/integrations/n8n-checkpoint-storage', () => ({
	N8NCheckpointStorage: class {},
}));

type ProjectAgent = NonNullable<Awaited<ReturnType<AgentsService['findById']>>>;

const SESSION = '0190a8d6-4a2e-4000-8000-000000000001';

const userCtx: AppCallContext = {
	appId: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	bindingKey: 'support',
	userId: 'user-1',
};

async function collect(events: AsyncIterable<AgentSseEvent>) {
	const result: AgentSseEvent[] = [];
	for await (const event of events) result.push(event);
	return result;
}

function setup({ active = true, published = true } = {}) {
	const agents = mock<AgentsService>();
	agents.findById.mockResolvedValue(
		mock({ id: 'agent-1', name: 'Support', activeVersionId: published ? 'v1' : null }),
	);
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	const checkpoints = mock<N8NCheckpointStorage>();
	checkpoints.findSuspendedForThread.mockResolvedValue(null);
	Container.set(AgentsService, agents);
	Container.set(AgentExecutionOrchestratorService, orchestrator);
	Container.set(N8NCheckpointStorage, checkpoints);
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(active);
	const adapter = new AppAgentAdapter(moduleRegistry, mock<Logger>());
	return { adapter, agents, orchestrator, checkpoints };
}

describe('AppAgentAdapter', () => {
	// The adapter imports these lazily. The first import of their module graph is slow.
	beforeAll(async () => {
		await Promise.all([
			import('@n8n/agents'),
			import('@/modules/agents/agent-sandbox-principal.js'),
			import('@/modules/agents/agent-sse-stream.js'),
			import('@/modules/agents/utils/messages-envelope.js'),
		]);
	}, 60_000);

	afterEach(() => Container.reset());

	describe('assertCanBind', () => {
		const binding = {
			key: 'support',
			kind: 'agent' as const,
			agentId: 'agent-1',
			permissions: ['chat' as const],
		};

		it('accepts an agent of the project that the user can run', async () => {
			const { adapter, agents } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(true);

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).resolves.toBeUndefined();
			expect(agents.findById).toHaveBeenCalledWith('agent-1', 'project-1');
			expect(userHasScopes).toHaveBeenCalledWith(expect.anything(), ['agent:execute'], false, {
				projectId: 'project-1',
			});
		});

		it('refuses when the agents module is off', async () => {
			const { adapter, agents } = setup({ active: false });

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).rejects.toThrow(
				BadRequestError,
			);
			expect(agents.findById).not.toHaveBeenCalled();
		});

		it('refuses an agent that is not in the project', async () => {
			const { adapter, agents } = setup();
			agents.findById.mockResolvedValue(null);

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('refuses a user without the agent:execute scope', async () => {
			const { adapter } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(adapter.assertCanBind(mock(), 'project-1', binding)).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('publishing', () => {
		const binding = {
			key: 'support',
			kind: 'agent' as const,
			agentId: 'agent-1',
			permissions: ['chat' as const],
		};

		it.each([true, false])('reports the agent:publish scope (%s)', async (allowed) => {
			const { adapter } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(allowed);

			await expect(adapter.canPublish(mock(), 'project-1', binding)).resolves.toBe(allowed);
			expect(userHasScopes).toHaveBeenCalledWith(expect.anything(), ['agent:publish'], false, {
				projectId: 'project-1',
			});
		});

		it.each([
			['is not published', null, 'v1', { published: false, hasChanges: false }],
			[
				'has a draft that differs from the published version',
				'v1',
				'v2',
				{ published: true, hasChanges: true },
			],
			[
				'has a draft that matches the published version',
				'v1',
				'v1',
				{ published: true, hasChanges: false },
			],
		])('reports an agent that %s', async (_, activeId, draftId, expected) => {
			const { adapter, agents } = setup();
			agents.findById.mockResolvedValue(
				mock<ProjectAgent>({
					id: 'agent-1',
					name: 'Support',
					versionId: draftId,
					activeVersionId: activeId,
				}),
			);

			await expect(adapter.getPublishState('project-1', binding)).resolves.toEqual({
				name: 'Support',
				...expected,
			});
		});

		it('reports nothing for an agent that is not in the project', async () => {
			const { adapter, agents } = setup();
			agents.findById.mockResolvedValue(null);

			await expect(adapter.getPublishState('project-1', binding)).resolves.toBeNull();
		});

		it('reports nothing when the agents module is off', async () => {
			const { adapter, agents } = setup({ active: false });

			await expect(adapter.getPublishState('project-1', binding)).resolves.toBeNull();
			expect(agents.findById).not.toHaveBeenCalled();
		});

		it('publishes the agent as the acting user', async () => {
			const { adapter } = setup();
			const publishService = mock<AgentPublishService>();
			Container.set(AgentPublishService, publishService);
			vi.mocked(userHasScopes).mockResolvedValue(true);
			const user = mock<User>();

			await adapter.publish(user, 'project-1', binding);

			expect(publishService.publishAgent).toHaveBeenCalledWith('agent-1', 'project-1', user, {
				by: 'user',
				trigger: 'explicit',
			});
		});

		it('does not publish without the agent:publish scope', async () => {
			const { adapter } = setup();
			const publishService = mock<AgentPublishService>();
			Container.set(AgentPublishService, publishService);
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(adapter.publish(mock(), 'project-1', binding)).rejects.toThrow(ForbiddenError);
			expect(publishService.publishAgent).not.toHaveBeenCalled();
		});
	});

	describe('describe', () => {
		const binding = {
			key: 'support',
			kind: 'agent' as const,
			agentId: 'agent-1',
			permissions: ['chat' as const],
		};

		it('describes the agent with its name and publish state', async () => {
			const { adapter } = setup({ published: false });

			expect(await adapter.describe('project-1', binding)).toEqual({
				...binding,
				name: 'Support',
				published: false,
			});
		});

		it('describes a missing agent or a disabled module as null', async () => {
			const missing = setup();
			missing.agents.findById.mockResolvedValue(null);
			expect(await missing.adapter.describe('project-1', binding)).toBeNull();

			const disabled = setup({ active: false });
			expect(await disabled.adapter.describe('project-1', binding)).toBeNull();
		});
	});

	describe('messages', () => {
		it('returns the history of the visitor thread with its open suspensions', async () => {
			const { adapter, orchestrator, checkpoints } = setup();
			const message = { id: 'm1', role: 'user', content: [{ type: 'text', text: 'Hi' }] };
			orchestrator.getConversationHistory.mockResolvedValue({ messages: [message] } as never);
			checkpoints.findSuspendedForThread.mockResolvedValue({
				pendingToolCalls: {
					t1: { toolCallId: 't1', runId: 'r1', suspended: true, suspendPayload: { step: 1 } },
				},
				messageList: { messages: [] },
			} as never);

			const result = await adapter.messages(userCtx, 'agent-1', SESSION);

			expect(orchestrator.getConversationHistory).toHaveBeenCalledWith({
				threadId: `agent-1:app:app-1:user:user-1:${SESSION}`,
				projectId: 'project-1',
				agentId: 'agent-1',
				userId: 'app:app-1:user:user-1',
			});
			expect(result).toMatchObject({
				messages: [message],
				openSuspensions: [{ toolCallId: 't1', runId: 'r1', suspendPayload: { step: 1 } }],
			});
		});

		it('returns an empty history for an unknown session', async () => {
			const { adapter, orchestrator } = setup();
			orchestrator.getConversationHistory.mockResolvedValue(null as never);

			expect(await adapter.messages(userCtx, 'agent-1', SESSION)).toEqual({
				messages: [],
				openSuspensions: [],
			});
		});

		it('projects history for visitors and drops reasoning, tool payloads, and raw errors', async () => {
			const { adapter, orchestrator } = setup();
			orchestrator.getConversationHistory.mockResolvedValue({
				messages: [
					{
						id: 'm1',
						role: 'assistant',
						executionId: 'exec-1',
						createdAt: '2026-11-27T00:00:00.000Z',
						references: [{ internal: 'ref-secret' }],
						content: [
							{ type: 'reasoning', text: 'internal thoughts' },
							{ type: 'host-event', name: 'internal', payload: { secret: 'nope' } },
							{
								type: 'tool-call',
								toolName: 'lookup',
								toolCallId: 'tc-1',
								input: { query: 'SELECT * FROM secrets' },
								output: { row: 'sensitive-data' },
								state: 'resolved',
								startTime: 100,
								endTime: 200,
								childTrace: { parts: [{ type: 'text', text: 'subagent output' }] },
							},
							{
								type: 'tool-call',
								toolName: 'db',
								toolCallId: 'tc-2',
								input: { host: 'db-internal:5432' },
								error: 'ECONNREFUSED db-internal:5432',
								state: 'rejected',
								canceled: true,
							},
							{
								type: 'tool-call',
								toolName: 'send_email',
								toolCallId: 'tc-3',
								suspendPayload: {
									type: 'approval',
									toolName: 'send_email',
									description: 'Send email',
									args: { to: 'ada@example.com', apiKey: 'sk-secret-value' },
								},
							},
							{ type: 'text', text: 'Done.' },
						],
					},
					{
						id: 'm2',
						role: 'assistant',
						content: [{ type: 'reasoning', text: 'only thinking' }],
					},
					{
						id: 'm3',
						role: 'assistant',
						content: [],
						executionStatus: 'error',
						executionError: 'Credentials could not be decrypted with encryptionKey',
					},
					{
						id: 'm4',
						role: 'assistant',
						content: [],
						stopReport: true,
						executionStatus: 'cancelled',
					},
				],
			} as never);

			const result = await adapter.messages(userCtx, 'agent-1', SESSION);

			expect(result.messages).toEqual([
				{
					id: 'm1',
					role: 'assistant',
					executionId: 'exec-1',
					createdAt: '2026-11-27T00:00:00.000Z',
					content: [
						{
							type: 'tool-call',
							toolName: 'lookup',
							toolCallId: 'tc-1',
							state: 'resolved',
							startTime: 100,
							endTime: 200,
						},
						{
							type: 'tool-call',
							toolName: 'db',
							toolCallId: 'tc-2',
							state: 'rejected',
							canceled: true,
							error: 'Tool execution failed.',
						},
						{
							type: 'tool-call',
							toolName: 'send_email',
							toolCallId: 'tc-3',
							suspendPayload: {
								type: 'approval',
								toolName: 'send_email',
								description: 'Send email',
								args: { to: 'ada@example.com', apiKey: '[REDACTED]' },
							},
						},
						{ type: 'text', text: 'Done.' },
					],
				},
				{
					id: 'm3',
					role: 'assistant',
					content: [],
					executionStatus: 'error',
					executionError: 'The agent could not answer.',
				},
				{
					id: 'm4',
					role: 'assistant',
					content: [],
					stopReport: true,
					executionStatus: 'cancelled',
				},
			]);
		});

		it('marks a failed delegation in history without its output', async () => {
			const { adapter, orchestrator } = setup();
			const delegation = {
				type: 'tool-call',
				toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
				state: 'resolved',
			};
			orchestrator.getConversationHistory.mockResolvedValue({
				messages: [
					{
						id: 'm1',
						role: 'assistant',
						content: [
							{
								...delegation,
								toolCallId: 'tc-1',
								output: { status: 'failed', answer: '', error: 'child-secret-error' },
							},
							{
								...delegation,
								toolCallId: 'tc-2',
								output: { status: 'completed', answer: 'child-answer' },
							},
						],
					},
				],
			} as never);

			const result = await adapter.messages(userCtx, 'agent-1', SESSION);

			expect(result.messages[0].content).toEqual([
				{
					...delegation,
					toolCallId: 'tc-1',
					state: 'rejected',
					error: 'Tool execution failed.',
				},
				{ ...delegation, toolCallId: 'tc-2' },
			]);
		});
	});

	it('scopes memory to the app and the visitor', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {});
		const other: AppCallContext = { ...userCtx, userId: 'user-2' };

		await adapter.chat(
			userCtx,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);
		await adapter.chat(
			other,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);

		const [first, second] = orchestrator.executeForChatPublished.mock.calls.map(
			([config]) => config,
		);
		expect(first.memory).toEqual({
			resourceId: 'app:app-1:user:user-1',
			threadId: `agent-1:app:app-1:user:user-1:${SESSION}`,
		});
		expect(second.memory.threadId).not.toBe(first.memory.threadId);
		expect(first.projectId).toBe('project-1');
		expect(first.integrationType).toBe('app');
		expect(first.allowBackgroundTasks).toBe(false);
	});

	it('refuses a new message while a run waits for an answer', async () => {
		const { adapter, checkpoints, orchestrator } = setup();
		checkpoints.findSuspendedForThread.mockResolvedValue(mock());

		await expect(
			adapter.chat(
				userCtx,
				'agent-1',
				{ message: 'Hi', sessionId: SESSION },
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: 'run_in_progress' });
		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	it('refuses an unpublished agent and a disabled agents module', async () => {
		const unpublished = setup({ published: false });
		await expect(
			unpublished.adapter.chat(
				userCtx,
				'agent-1',
				{ message: 'Hi', sessionId: SESSION },
				new AbortController().signal,
			),
		).rejects.toMatchObject({ code: 'agent_not_published' });

		const disabled = setup({ active: false });
		await expect(disabled.adapter.messages(userCtx, 'agent-1', SESSION)).rejects.toMatchObject({
			code: 'agents_disabled',
		});
	});

	it('resumes only on the thread of the visitor', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.resumeForChat.mockImplementation(async function* () {
			yield { type: 'reasoning-delta', id: 'r1', delta: 'private resume reasoning' };
			yield { type: 'tool-result', toolCallId: 't1', toolName: 'lookup', output: { secret: 1 } };
			yield { type: 'text-delta', id: '1', delta: 'Approved.' };
		});

		const turn = await adapter.resume(
			userCtx,
			'agent-1',
			{ sessionId: SESSION, runId: 'r1', toolCallId: 't1', resumeData: { approved: true } },
			new AbortController().signal,
		);
		const events = await collect(turn.events);

		expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				expectedMemory: { threadId: `agent-1:app:app-1:user:user-1:${SESSION}` },
				usePublishedVersion: true,
				allowBackgroundTasks: false,
			}),
		);
		expect(events).toEqual([
			{ type: 'tool-result', toolCallId: 't1', toolName: 'lookup' },
			{ type: 'text-delta', id: '1', delta: 'Approved.' },
			{ type: 'done', sessionId: SESSION },
		]);
	});

	it('streams text, hides internal errors, and ends with done', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield { type: 'text-delta', id: '1', delta: 'Hi' };
			yield { type: 'error', error: new Error('connection to db-internal:5432 refused') };
		});

		const turn = await adapter.chat(
			userCtx,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);
		const events = await collect(turn.events);

		expect(events).toContainEqual({ type: 'text-delta', id: '1', delta: 'Hi' });
		expect(JSON.stringify(events)).not.toContain('db-internal');
		expect(events).toContainEqual(
			expect.objectContaining({ type: 'error', message: 'The agent could not answer.' }),
		);
		expect(events.at(-1)).toEqual({ type: 'done', sessionId: SESSION });
	});

	it('projects stream events for visitors and drops reasoning, usage, warnings, and tool payloads', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield { type: 'start-step' };
			yield { type: 'reasoning-start', id: 'r1' };
			yield { type: 'reasoning-delta', id: 'r1', delta: 'private thinking' };
			yield { type: 'reasoning-end', id: 'r1' };
			yield { type: 'tool-input-start', toolCallId: 'tc-1', toolName: 'lookup' };
			yield { type: 'tool-input-delta', toolCallId: 'tc-1', delta: '{"secret":"input"}' };
			yield { type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: { secret: 'in' } };
			yield { type: 'tool-execution-start', toolCallId: 'tc-1', toolName: 'lookup', startTime: 10 };
			yield {
				type: 'tool-execution-end',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				isError: false,
				endTime: 20,
			};
			yield {
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				output: { row: 'sensitive-output' },
				isError: false,
			};
			yield {
				type: 'tool-result',
				toolCallId: 'tc-2',
				toolName: 'db',
				output: 'ECONNREFUSED db-internal:5432',
				isError: true,
				canceled: true,
			};
			yield {
				type: 'subagent-chunk',
				parentToolCallId: 'tc-1',
				taskName: 'child',
				taskPath: 'child',
				chunk: { type: 'text-delta', id: 'c1', delta: 'subagent text' },
			};
			yield {
				type: 'warning',
				message: 'MCP server failed: ECONNREFUSED mcp-internal',
				source: 'mcp',
				server: 'mcp-internal',
			};
			yield {
				type: 'usage',
				model: 'anthropic/claude-sonnet-5-5',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
			};
			yield {
				type: 'message',
				message: {
					role: 'assistant',
					content: [{ type: 'reasoning', text: 'reasoning only message' }],
				},
			};
			yield {
				type: 'message',
				message: {
					role: 'assistant',
					content: [
						{ type: 'reasoning', text: 'hidden message reasoning' },
						{ type: 'text', text: 'Visible note' },
					],
				},
			};
			yield { type: 'text-start', id: 't1' };
			yield { type: 'text-delta', id: 't1', delta: 'Checked.' };
			yield { type: 'text-end', id: 't1' };
			yield { type: 'finish-step' };
			yield {
				type: 'finish',
				finishReason: 'stop',
				usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
				guardrail: { code: 'max_steps' },
			};
		});

		const turn = await adapter.chat(
			userCtx,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);
		const events = await collect(turn.events);

		expect(events).toEqual([
			{ type: 'start-step' },
			{ type: 'tool-input-start', toolCallId: 'tc-1', toolName: 'lookup' },
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup' },
			{ type: 'tool-execution-start', toolCallId: 'tc-1', toolName: 'lookup', startTime: 10 },
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				isError: false,
				endTime: 20,
			},
			{ type: 'tool-result', toolCallId: 'tc-1', toolName: 'lookup', isError: false },
			{
				type: 'tool-result',
				toolCallId: 'tc-2',
				toolName: 'db',
				isError: true,
				canceled: true,
				output: 'Tool execution failed.',
			},
			{
				type: 'message',
				message: { role: 'assistant', content: [{ type: 'text', text: 'Visible note' }] },
			},
			{ type: 'text-start', id: 't1' },
			{ type: 'text-delta', id: 't1', delta: 'Checked.' },
			{ type: 'text-end', id: 't1' },
			{ type: 'finish-step' },
			{ type: 'finish', finishReason: 'stop', guardrail: { code: 'max_steps' } },
			{ type: 'done', sessionId: SESSION },
		]);
	});

	it('flags a failed delegation as a tool error without its output', async () => {
		const { adapter, orchestrator } = setup();
		const toolName = DELEGATE_SUB_AGENT_TOOL_NAME;
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield {
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName,
				output: { status: 'failed', answer: '', error: 'child-secret-error' },
				isError: false,
			};
			yield {
				type: 'tool-result',
				toolCallId: 'tc-2',
				toolName,
				output: { status: 'completed', answer: 'child-answer' },
				isError: false,
			};
		});

		const turn = await adapter.chat(
			userCtx,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);
		const events = await collect(turn.events);

		expect(events).toEqual([
			{
				type: 'tool-result',
				toolCallId: 'tc-1',
				toolName,
				isError: true,
				output: 'Tool execution failed.',
			},
			{ type: 'tool-result', toolCallId: 'tc-2', toolName, isError: false },
			{ type: 'done', sessionId: SESSION },
		]);
	});

	it('keeps approval suspension payloads and redacts sensitive keys without emitting done', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield {
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tc-1',
				toolName: 'send_email',
				suspendPayload: {
					type: 'approval',
					toolName: 'send_email',
					description: 'Send email',
					args: { to: 'ada@example.com', token: 'secret-token' },
				},
			};
		});

		const turn = await adapter.chat(
			userCtx,
			'agent-1',
			{ message: 'Send it', sessionId: SESSION },
			new AbortController().signal,
		);
		const events = await collect(turn.events);

		expect(events).toEqual([
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-1',
					runId: 'run-1',
					toolName: 'send_email',
					input: {
						type: 'approval',
						toolName: 'send_email',
						description: 'Send email',
						args: { to: 'ada@example.com', token: '[REDACTED]' },
					},
				},
			},
		]);
	});
});
