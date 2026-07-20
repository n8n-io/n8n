import type {
	BuiltTelemetry,
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
} from '@n8n/agents';
import type { User } from '@n8n/db';
import { Like } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { AgentThreadEntity } from '../entities/agent-thread.entity';
import type { Agent } from '../entities/agent.entity';
import {
	INSTANCE_AI_BUILDER_ADDENDUM,
	InstanceAiBuilderDelegateAdapterService,
} from '../instance-ai-builder-delegate.adapter';
import type { N8nMemory, N8nMemoryImpl } from '../integrations/n8n-memory';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';

function setup() {
	const agentsService = mock<AgentsService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const n8nMemory = mock<N8nMemory>();
	const agentThreadRepository = mock<AgentThreadRepository>();

	const service = new InstanceAiBuilderDelegateAdapterService(
		agentsService,
		agentsBuilderService,
		n8nMemory,
		agentThreadRepository,
	);

	const user = mock<User>({ id: 'user-1' });
	const credentialProvider = mock<CredentialProvider>();
	const delegate = service.createDelegate(user, 'project-1', credentialProvider);

	return {
		service,
		delegate,
		user,
		agentsService,
		agentsBuilderService,
		n8nMemory,
		agentThreadRepository,
		credentialProvider,
	};
}

async function* asAsyncGenerator<T>(values: T[]): AsyncGenerator<T> {
	for (const value of values) yield value;
}

describe('InstanceAiBuilderDelegateAdapterService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('streamBuild', () => {
		it('accumulates text-delta chunks into the text promise and forwards all chunks', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const chunks: StreamChunk[] = [
				{ type: 'text-delta', id: '1', delta: 'Hello ' },
				{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'read_config', input: {} },
				{ type: 'text-delta', id: '2', delta: 'world' },
			];
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator(chunks));

			const turn = await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			});

			const seen: unknown[] = [];
			for await (const chunk of turn.fullStream) seen.push(chunk);

			expect(seen).toHaveLength(3);
			await expect(turn.text).resolves.toBe('Hello world');
		});

		it('builds the sub-agent session from the delegate session: thread ids, run id, model config, and addendum', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));
			const sentinel = { functionId: 'host' } as unknown as BuiltTelemetry;

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				telemetry: sentinel,
			});

			expect(agentsBuilderService.buildAgent).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'hi',
				credentialProvider,
				user,
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
					telemetry: sentinel,
				},
			);
		});

		it('omits telemetry from the sub-agent session when the delegate session has none', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.buildAgent.mockReturnValue(asAsyncGenerator<StreamChunk>([]));

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			});

			const [, , , , , sessionArg] = agentsBuilderService.buildAgent.mock.calls[0];
			expect(sessionArg).not.toHaveProperty('telemetry');
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.streamBuild('agent-1', 'hi', {
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
				}),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.buildAgent).not.toHaveBeenCalled();
		});
	});

	describe('resumeBuild', () => {
		it('forwards to agentsBuilderService.resumeBuild and accumulates text-delta chunks', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			const chunks: StreamChunk[] = [
				{ type: 'text-delta', id: '1', delta: 'Using ' },
				{ type: 'text-delta', id: '2', delta: 'Slack.' },
			];
			agentsBuilderService.resumeBuild.mockReturnValue(asAsyncGenerator(chunks));

			const turn = await delegate.resumeBuild(
				'agent-1',
				{ runId: 'run-1', toolCallId: 'call-1', resumeData: { approved: true } },
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
				},
			);

			const seen: unknown[] = [];
			for await (const chunk of turn.fullStream) seen.push(chunk);

			expect(seen).toHaveLength(2);
			await expect(turn.text).resolves.toBe('Using Slack.');
			expect(agentsBuilderService.resumeBuild).toHaveBeenCalledWith(
				'agent-1',
				'project-1',
				'run-1',
				'call-1',
				{ approved: true },
				credentialProvider,
				user,
				{
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
				},
			);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.resumeBuild(
					'agent-1',
					{ runId: 'run-1', toolCallId: 'call-1', resumeData: {} },
					{
						threadId: 'ia-builder:t:agent-1',
						hostThreadId: 'thread-1',
						runId: 'run-1',
						modelConfig: 'anthropic/claude-sonnet-host-resolved',
					},
				),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.resumeBuild).not.toHaveBeenCalled();
		});
	});

	describe('findOpenSuspensions', () => {
		function checkpointWith(
			pendingToolCalls: SerializableAgentState['pendingToolCalls'],
		): SerializableAgentState {
			return {
				status: 'suspended',
				messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				pendingToolCalls,
			};
		}

		it('returns all suspended pending tool calls mapped to runId/toolCallId', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(
				checkpointWith({
					'call-1': {
						toolCallId: 'call-1',
						toolName: 'ask_questions',
						input: {},
						suspended: true,
						suspendPayload: { message: 'first' },
						resumeSchema: {},
						runId: 'run-1',
					},
					'call-2': {
						toolCallId: 'call-2',
						toolName: 'ask_credential',
						input: {},
						suspended: true,
						suspendPayload: { message: 'second' },
						resumeSchema: {},
						runId: 'run-2',
					},
				}),
			);

			const result = await delegate.findOpenSuspensions('agent-1', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			});

			expect(agentsBuilderService.findOpenCheckpointForThread).toHaveBeenCalledWith(
				'agent-1',
				'ia-builder:t:agent-1',
			);
			expect(result).toEqual([
				{ runId: 'run-1', toolCallId: 'call-1' },
				{ runId: 'run-2', toolCallId: 'call-2' },
			]);
		});

		it('returns [] when findOpenCheckpointForThread resolves null', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(null);

			const result = await delegate.findOpenSuspensions('agent-1', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			});

			expect(result).toEqual([]);
		});

		it('returns [] when the checkpoint has no suspended calls', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsBuilderService.findOpenCheckpointForThread.mockResolvedValue(
				checkpointWith({
					'call-1': { toolCallId: 'call-1', toolName: 'read_config', input: {}, suspended: false },
				}),
			);

			const result = await delegate.findOpenSuspensions('agent-1', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
			});

			expect(result).toEqual([]);
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(
				delegate.findOpenSuspensions('agent-1', {
					threadId: 'ia-builder:t:agent-1',
					hostThreadId: 'thread-1',
					runId: 'run-1',
					modelConfig: 'anthropic/claude-sonnet-host-resolved',
				}),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.findOpenCheckpointForThread).not.toHaveBeenCalled();
		});
	});

	describe('cancelOpenSuspension', () => {
		it('calls agentsBuilderService.cancelCheckpoint(agentId, runId)', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);

			await delegate.cancelOpenSuspension('agent-1', 'run-1');

			expect(agentsBuilderService.cancelCheckpoint).toHaveBeenCalledWith('agent-1', 'run-1');
		});

		it('rejects when the user lacks agent:update scope', async () => {
			const { delegate, agentsBuilderService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.cancelOpenSuspension('agent-1', 'run-1')).rejects.toThrow(
				ForbiddenError,
			);
			expect(agentsBuilderService.cancelCheckpoint).not.toHaveBeenCalled();
		});
	});

	describe('createAgent', () => {
		it('enforces agent:create scope and delegates to AgentsService', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.create.mockResolvedValue(mock<Agent>({ id: 'agent-9', name: 'New agent' }));

			const result = await delegate.createAgent('New agent');

			expect(agentsService.create).toHaveBeenCalledWith('project-1', 'New agent');
			expect(result).toEqual({ agentId: 'agent-9', projectId: 'project-1' });
		});

		it('rejects when the user lacks agent:create scope', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.createAgent('New agent')).rejects.toThrow(ForbiddenError);
			expect(agentsService.create).not.toHaveBeenCalled();
		});
	});

	describe('listAgents', () => {
		it('maps agent entities to listing rows, most recently updated first', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.findByProjectId.mockResolvedValue([
				mock<Agent>({
					id: 'agent-1',
					name: 'Published Agent',
					activeVersionId: 'v1',
					updatedAt: new Date('2026-07-14T00:00:00.000Z'),
				}),
				mock<Agent>({
					id: 'agent-2',
					name: 'Draft Agent',
					activeVersionId: null,
					updatedAt: new Date('2026-07-10T00:00:00.000Z'),
				}),
			]);

			const result = await delegate.listAgents();

			expect(agentsService.findByProjectId).toHaveBeenCalledWith('project-1');
			expect(result).toEqual([
				{
					agentId: 'agent-1',
					name: 'Published Agent',
					published: true,
					updatedAt: '2026-07-14T00:00:00.000Z',
				},
				{
					agentId: 'agent-2',
					name: 'Draft Agent',
					published: false,
					updatedAt: '2026-07-10T00:00:00.000Z',
				},
			]);
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentsService, user } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.listAgents()).rejects.toThrow(ForbiddenError);
			expect(agentsService.findByProjectId).not.toHaveBeenCalled();
			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'project-1',
			});
		});
	});

	describe('resolveAgentName', () => {
		it('returns the agent display name', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.findById.mockResolvedValue(mock<Agent>({ id: 'agent-1', name: 'Support Bot' }));

			await expect(delegate.resolveAgentName('agent-1')).resolves.toBe('Support Bot');
			expect(agentsService.findById).toHaveBeenCalledWith('agent-1', 'project-1');
		});

		it('returns undefined when the agent does not exist', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.findById.mockResolvedValue(null);

			await expect(delegate.resolveAgentName('agent-missing')).resolves.toBeUndefined();
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentsService, user } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.resolveAgentName('agent-1')).rejects.toThrow(ForbiddenError);
			expect(agentsService.findById).not.toHaveBeenCalled();
			expect(checkAccess.userHasScopes).toHaveBeenCalledWith(user, ['agent:read'], false, {
				projectId: 'project-1',
			});
		});
	});

	describe('deleteBuilderSessions', () => {
		it('deletes messages and thread state for every builder session of the instance thread, scoped per target agent', async () => {
			const { service, n8nMemory, agentThreadRepository } = setup();
			agentThreadRepository.find.mockResolvedValue([
				{ id: 'ia-builder:t1:agent-1' },
				{ id: 'ia-builder:t1:agent-2' },
			] as AgentThreadEntity[]);
			const impls = [mock<N8nMemoryImpl>(), mock<N8nMemoryImpl>()];
			n8nMemory.getImplementation.mockReturnValueOnce(impls[0]).mockReturnValueOnce(impls[1]);

			await service.deleteBuilderSessions('t1');

			expect(agentThreadRepository.find).toHaveBeenCalledWith({
				select: { id: true },
				where: { id: Like('ia-builder:t1:%') },
			});
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-1');
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith('agent-2');
			expect(impls[0].deleteMessagesByThread).toHaveBeenCalledWith('ia-builder:t1:agent-1');
			expect(impls[0].deleteThread).toHaveBeenCalledWith('ia-builder:t1:agent-1');
			expect(impls[1].deleteMessagesByThread).toHaveBeenCalledWith('ia-builder:t1:agent-2');
			expect(impls[1].deleteThread).toHaveBeenCalledWith('ia-builder:t1:agent-2');
		});

		it('is a no-op when the instance thread has no builder sessions', async () => {
			const { service, n8nMemory, agentThreadRepository } = setup();
			agentThreadRepository.find.mockResolvedValue([]);

			await service.deleteBuilderSessions('t1');

			expect(n8nMemory.getImplementation).not.toHaveBeenCalled();
		});
	});
});
