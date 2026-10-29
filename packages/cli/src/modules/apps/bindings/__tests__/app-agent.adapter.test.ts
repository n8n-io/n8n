import type { AgentSseEvent } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AppCallContext } from '@n8n/backend-module-apps';
import { Container } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AppAgentAdapter } from '../app-agent.adapter';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@/modules/agents/agents.service', () => ({ AgentsService: class {} }));
vi.mock('@/modules/agents/agent-execution-orchestrator.service', () => ({
	AgentExecutionOrchestratorService: class {},
}));
vi.mock('@/modules/agents/integrations/n8n-checkpoint-storage', () => ({
	N8NCheckpointStorage: class {},
}));

const SESSION = '0190a8d6-4a2e-4000-8000-000000000001';

const userCtx: AppCallContext = {
	appId: 'app-1',
	namespace: 'crm',
	projectId: 'project-1',
	bindingKey: 'support',
	visitor: { type: 'user', userId: 'user-1' },
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
	});

	it('scopes memory to the app and the visitor', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {});
		const other: AppCallContext = { ...userCtx, visitor: { type: 'user', userId: 'user-2' } };

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
	});

	it('stores a hash of an anonymous visitor ID', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {});
		const anonymous: AppCallContext = {
			...userCtx,
			visitor: { type: 'anonymous', id: 'secret-cookie' },
		};

		await adapter.chat(
			anonymous,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);

		const [config] = orchestrator.executeForChatPublished.mock.calls[0];
		expect(config.memory.resourceId).toMatch(/^app:app-1:anon:[a-f0-9]{64}$/);
		expect(config.memory.threadId).not.toContain('secret-cookie');
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
		orchestrator.resumeForChat.mockImplementation(async function* () {});

		await adapter.resume(
			userCtx,
			'agent-1',
			{ sessionId: SESSION, runId: 'r1', toolCallId: 't1', resumeData: { approved: true } },
			new AbortController().signal,
		);

		expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				expectedMemory: { threadId: `agent-1:app:app-1:user:user-1:${SESSION}` },
				usePublishedVersion: true,
			}),
		);
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
});
