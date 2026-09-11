import type { StreamChunk } from '@n8n/agents';
import type { SerializableAgentState } from '@n8n/agents';
import type { ModuleRegistry } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionOrchestratorService } from '@/modules/agents/agent-execution-orchestrator.service';
import type { AgentExecutionService } from '@/modules/agents/agent-execution.service';
import { hashAgentSandboxPrincipal } from '@/modules/agents/agent-sandbox-principal';
import type { AgentsService } from '@/modules/agents/agents.service';
import type { Agent } from '@/modules/agents/entities/agent.entity';
import type { IntegrationMessageContextService } from '@/modules/agents/integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '@/modules/agents/integrations/n8n-checkpoint-storage';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import { AppAgentRuntimeService } from '../app-agent-runtime.service';
import { AppRuntimeError } from '../app-runtime.error';

const SESSION_ID = '6f1b4a0e-2c3d-4e5f-8a9b-0c1d2e3f4a5b';
const THREAD_ID = `agent-1:app:app-1:${SESSION_ID}`;
const RESOURCE_ID = `app:app-1:${SESSION_ID}`;

const app = (permissions: Array<'chat' | 'history'> = ['chat', 'history']) =>
	({
		id: 'app-1',
		namespace: 'help',
		projectId: 'proj-1',
		bindings: [
			{ key: 'tasks', kind: 'dataTable', dataTableId: 'dt-1', permissions: ['read'] },
			{ key: 'support', kind: 'agent', agentId: 'agent-1', permissions },
		],
	}) as unknown as App;

const agent = (overrides: Partial<Agent> = {}) =>
	({
		id: 'agent-1',
		name: 'Support',
		projectId: 'proj-1',
		activeVersionId: 'v-1',
		...overrides,
	}) as Agent;

async function* chunks(): AsyncGenerator<StreamChunk> {
	yield { type: 'text-delta', id: 't', delta: 'hi' } as StreamChunk;
}

const failure = async (promise: Promise<unknown>) => {
	const error: unknown = await promise.catch((e: unknown) => e);
	expect(error).toBeInstanceOf(AppRuntimeError);
	return error as AppRuntimeError;
};

describe('AppAgentRuntimeService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let agentsService: ReturnType<typeof mock<AgentsService>>;
	let orchestrator: ReturnType<typeof mock<AgentExecutionOrchestratorService>>;
	let agentExecutionService: ReturnType<typeof mock<AgentExecutionService>>;
	let checkpointStorage: ReturnType<typeof mock<N8NCheckpointStorage>>;
	let messageContextService: ReturnType<typeof mock<IntegrationMessageContextService>>;
	let moduleRegistry: ReturnType<typeof mock<ModuleRegistry>>;
	let service: AppAgentRuntimeService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		agentsService = mock<AgentsService>();
		orchestrator = mock<AgentExecutionOrchestratorService>();
		agentExecutionService = mock<AgentExecutionService>();
		checkpointStorage = mock<N8NCheckpointStorage>();
		messageContextService = mock<IntegrationMessageContextService>();
		moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		appRepository.findByNamespace.mockResolvedValue(app());
		agentsService.findById.mockResolvedValue(agent());
		agentExecutionService.hasSuspendedRun.mockResolvedValue(false);
		orchestrator.executeForChatPublished.mockReturnValue(chunks());
		orchestrator.resumeForChat.mockReturnValue(chunks());
		service = new AppAgentRuntimeService(
			appRepository,
			agentsService,
			orchestrator,
			agentExecutionService,
			checkpointStorage,
			messageContextService,
			moduleRegistry,
		);
	});

	const chatBody = { message: 'hello', sessionId: SESSION_ID };

	describe('resolution', () => {
		it('answers 404 app_not_found for a namespace no app owns', async () => {
			appRepository.findByNamespace.mockResolvedValue(null);

			expect(await failure(service.chat('nobody', 'support', chatBody))).toMatchObject({
				status: 404,
				code: 'app_not_found',
			});
		});

		it('answers 404 binding_not_found for a key bound to a data table', async () => {
			expect(await failure(service.chat('help', 'tasks', chatBody))).toMatchObject({
				status: 404,
				code: 'binding_not_found',
			});
			expect(agentsService.findById).not.toHaveBeenCalled();
		});

		it('answers 403 permission_denied for a chat on a history-only binding', async () => {
			appRepository.findByNamespace.mockResolvedValue(app(['history']));

			expect(await failure(service.chat('help', 'support', chatBody))).toMatchObject({
				status: 403,
				code: 'permission_denied',
			});
			expect(agentsService.findById).not.toHaveBeenCalled();
		});

		it('answers 403 permission_denied for history on a chat-only binding', async () => {
			appRepository.findByNamespace.mockResolvedValue(app(['chat']));

			expect(
				await failure(service.messages('help', 'support', { sessionId: SESSION_ID })),
			).toMatchObject({ status: 403, code: 'permission_denied' });
		});

		it('answers 404 agent_not_found while the agents module is inactive', async () => {
			moduleRegistry.isActive.mockReturnValue(false);

			expect(await failure(service.chat('help', 'support', chatBody))).toMatchObject({
				status: 404,
				code: 'agent_not_found',
			});
			expect(moduleRegistry.isActive).toHaveBeenCalledWith('agents');
			expect(agentsService.findById).not.toHaveBeenCalled();
		});

		it('answers 404 agent_not_found when the agent left the project', async () => {
			agentsService.findById.mockResolvedValue(null);

			expect(await failure(service.chat('help', 'support', chatBody))).toMatchObject({
				status: 404,
				code: 'agent_not_found',
			});
			expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'proj-1');
		});

		it('answers 409 agent_not_published before the stream starts', async () => {
			agentsService.findById.mockResolvedValue(agent({ activeVersionId: null }));

			expect(await failure(service.chat('help', 'support', chatBody))).toMatchObject({
				status: 409,
				code: 'agent_not_published',
			});
			expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
		});
	});

	describe('chat', () => {
		it('answers 400 invalid_input with the failing paths for a bad body', async () => {
			expect(
				await failure(service.chat('help', 'support', { message: '', sessionId: 'nope' })),
			).toMatchObject({
				status: 400,
				code: 'invalid_input',
				issues: [
					{ path: ['message'], code: 'too_small' },
					{ path: ['sessionId'], code: 'invalid_string' },
				],
			});
		});

		it('answers 409 run_in_progress while a run is parked on the session', async () => {
			agentExecutionService.hasSuspendedRun.mockResolvedValue(true);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(mock<SerializableAgentState>());

			expect(await failure(service.chat('help', 'support', chatBody))).toMatchObject({
				status: 409,
				code: 'run_in_progress',
			});
			expect(checkpointStorage.findSuspendedForThread).toHaveBeenCalledWith('agent-1', THREAD_ID);
			expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
		});

		it('does not read checkpoints for a session that never parked a run', async () => {
			await service.chat('help', 'support', chatBody);

			expect(checkpointStorage.findSuspendedForThread).not.toHaveBeenCalled();
		});

		it('runs the published version on the session thread as an anonymous project session', async () => {
			const turn = await service.chat('help', 'support', chatBody);

			expect(turn.sessionId).toBe(SESSION_ID);
			expect(orchestrator.executeForChatPublished).toHaveBeenCalledWith({
				agentId: 'agent-1',
				projectId: 'proj-1',
				message: 'hello',
				memory: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
				integrationType: 'app',
				sandboxPrincipalHash: hashAgentSandboxPrincipal({
					type: 'project-session',
					projectId: 'proj-1',
					sessionId: THREAD_ID,
				}),
			});
			expect(messageContextService.setLatest).toHaveBeenCalledWith(
				THREAD_ID,
				RESOURCE_ID,
				expect.objectContaining({
					integrationConnectionId: 'app',
					platform: 'app',
					target: { type: 'dm', userId: SESSION_ID, threadId: THREAD_ID },
				}),
			);
		});
	});

	describe('resume', () => {
		const resumeBody = {
			sessionId: SESSION_ID,
			runId: 'run-1',
			toolCallId: 'call-1',
			resumeData: { approved: true },
		};

		it('pins the checkpoint to the session thread and the published version', async () => {
			const signal = new AbortController().signal;

			const turn = await service.resume('help', 'support', resumeBody, signal);

			expect(turn.sessionId).toBe(SESSION_ID);
			expect(orchestrator.resumeForChat).toHaveBeenCalledWith({
				agentId: 'agent-1',
				projectId: 'proj-1',
				runId: 'run-1',
				toolCallId: 'call-1',
				resumeData: { approved: true },
				usePublishedVersion: true,
				integrationType: 'app',
				expectedMemory: { threadId: THREAD_ID },
				source: 'app',
				abortSignal: signal,
			});
		});

		it('does not gate a resume on a parked run', async () => {
			agentExecutionService.hasSuspendedRun.mockResolvedValue(true);

			await service.resume('help', 'support', resumeBody, new AbortController().signal);

			expect(checkpointStorage.findSuspendedForThread).not.toHaveBeenCalled();
			expect(orchestrator.resumeForChat).toHaveBeenCalled();
		});

		it('answers 400 invalid_input for a resume without runId', async () => {
			expect(
				await failure(
					service.resume(
						'help',
						'support',
						{ sessionId: SESSION_ID, toolCallId: 'call-1' },
						new AbortController().signal,
					),
				),
			).toMatchObject({ status: 400, code: 'invalid_input' });
		});
	});

	describe('messages', () => {
		it('answers an empty history for a session nobody chatted in', async () => {
			orchestrator.getConversationHistory.mockResolvedValue(null);

			const result = await service.messages('help', 'support', { sessionId: SESSION_ID });

			expect(result).toEqual({ messages: [], openSuspensions: [] });
			expect(orchestrator.getConversationHistory).toHaveBeenCalledWith({
				threadId: THREAD_ID,
				projectId: 'proj-1',
				agentId: 'agent-1',
			});
		});

		it('reads history for an unpublished agent', async () => {
			agentsService.findById.mockResolvedValue(agent({ activeVersionId: null }));
			orchestrator.getConversationHistory.mockResolvedValue([]);

			await expect(service.messages('help', 'support', { sessionId: SESSION_ID })).resolves.toEqual(
				{ messages: [], openSuspensions: [] },
			);
		});

		it('answers 400 invalid_input without a session id', async () => {
			expect(await failure(service.messages('help', 'support', {}))).toMatchObject({
				status: 400,
				code: 'invalid_input',
			});
		});
	});
});
