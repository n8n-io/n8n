import type { AgentSseEvent } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AppCallContext } from '@n8n/backend-module-apps';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import {
	AgentAppTurnService,
	APP_MAX_BUFFERED_EVENTS,
	APP_VISITOR_TOO_SLOW_MESSAGE,
} from '@/modules/agents/agent-app-turn.service';
import { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import { AgentPublishService } from '@/modules/agents/agent-publish.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';
import { testTurns } from '@/modules/agents/__tests__/test-utils/turns';
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
	const turns = testTurns();
	Container.set(
		AgentAppTurnService,
		new AgentAppTurnService(
			mock<Logger>({ scoped: () => mock<Logger>() }),
			orchestrator,
			turns.dispatcher,
			turns.handlers,
		),
	);
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(active);
	const adapter = new AppAgentAdapter(moduleRegistry);
	return { adapter, agents, orchestrator, checkpoints };
}

describe('AppAgentAdapter', () => {
	// The adapter imports these lazily. The first import of their module graph is slow.
	beforeAll(async () => {
		await Promise.all([
			import('@/modules/agents/agent-app-turn.service.js'),
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
	});

	it('scopes memory to the app and the visitor', async () => {
		const { adapter, orchestrator } = setup();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {});
		const other: AppCallContext = { ...userCtx, userId: 'user-2' };

		for (const ctx of [userCtx, other]) {
			const turn = await adapter.chat(
				ctx,
				'agent-1',
				{ message: 'Hi', sessionId: SESSION },
				new AbortController().signal,
			);
			await collect(turn.events);
		}

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
		orchestrator.resumeForChat.mockImplementation(async function* () {});

		const turn = await adapter.resume(
			userCtx,
			'agent-1',
			{ sessionId: SESSION, runId: 'r1', toolCallId: 't1', resumeData: { approved: true } },
			new AbortController().signal,
		);
		await collect(turn.events);

		expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({
				expectedMemory: { threadId: `agent-1:app:app-1:user:user-1:${SESSION}` },
				usePublishedVersion: true,
				allowBackgroundTasks: false,
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

	it('stops the turn when the visitor reads its events too slowly', async () => {
		const { adapter, orchestrator } = setup();
		let stopped = false;
		orchestrator.executeForChatPublished.mockImplementation(async function* ({ abortSignal }) {
			for (let i = 0; i <= APP_MAX_BUFFERED_EVENTS + 10; i++) {
				if (abortSignal?.aborted) {
					stopped = true;
					return;
				}
				yield { type: 'text-delta', id: '1', delta: 'x' };
			}
		});

		const turn = await adapter.chat(
			userCtx,
			'agent-1',
			{ message: 'Hi', sessionId: SESSION },
			new AbortController().signal,
		);
		const iterator = turn.events[Symbol.asyncIterator]();
		// The visitor reads one event, then stops to read until the turn fills the buffer.
		await iterator.next();
		await vi.waitFor(() => expect(stopped).toBe(true));
		const rest: unknown[] = [];
		for (let next = await iterator.next(); !next.done; next = await iterator.next()) {
			rest.push(next.value);
		}

		expect(rest).toContainEqual({ type: 'error', message: APP_VISITOR_TOO_SLOW_MESSAGE });
		expect(rest.length).toBeLessThanOrEqual(APP_MAX_BUFFERED_EVENTS + 1);
	});
});
