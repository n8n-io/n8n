import type {
	BuiltTelemetry,
	BuiltTool,
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
} from '@n8n/agents';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Like } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import * as checkAccess from '@/permissions.ee/check-access';

import type { AgentsService } from '../agents.service';
import type { AgentsBuilderService } from '../builder/agents-builder.service';
import type { AgentThreadEntity } from '../entities/agent-thread.entity';
import type { Agent } from '../entities/agent.entity';
import {
	INSTANCE_AI_BUILDER_ADDENDUM,
	InstanceAiBuilderDelegateAdapterService,
} from '../instance-ai-builder-delegate.adapter';
import type { AgentConfigService } from '../agent-config.service';
import { getAgentConfigHash } from '../utils/agent-config-hash';
import type { AgentSkillsService } from '../agent-skills.service';
import type { N8nMemory, N8nMemoryImpl } from '../integrations/n8n-memory';
import type { AgentThreadRepository } from '../repositories/agent-thread.repository';

function setup() {
	const agentsService = mock<AgentsService>();
	const agentsBuilderService = mock<AgentsBuilderService>();
	const n8nMemory = mock<N8nMemory>();
	const agentThreadRepository = mock<AgentThreadRepository>();
	const agentConfig = mock<AgentConfigService>();
	const agentSkills = mock<AgentSkillsService>();

	const service = new InstanceAiBuilderDelegateAdapterService(
		agentsService,
		agentsBuilderService,
		n8nMemory,
		agentThreadRepository,
		agentConfig,
		agentSkills,
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
		agentConfig,
		agentSkills,
		credentialProvider,
	};
}

async function* asAsyncGenerator<T>(values: T[]): AsyncGenerator<T> {
	for (const value of values) yield value;
}

const abortSignal = new AbortController().signal;

function fakeMcpTools(): Map<string, BuiltTool> {
	const notionSearch: BuiltTool = {
		name: 'notion_search',
		description: 'Search connected Notion content',
	};
	return new Map([[notionSearch.name, notionSearch]]);
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
				abortSignal,
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
			const mcpTools = fakeMcpTools();

			await delegate.streamBuild('agent-1', 'hi', {
				threadId: 'ia-builder:t:agent-1',
				hostThreadId: 'thread-1',
				runId: 'run-1',
				modelConfig: 'anthropic/claude-sonnet-host-resolved',
				abortSignal,
				telemetry: sentinel,
				mcpTools,
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
					abortSignal,
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
					telemetry: sentinel,
					mcpTools,
					onRequiredArtifact: expect.any(Function),
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
				abortSignal,
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
					abortSignal,
				}),
			).rejects.toThrow(ForbiddenError);
			expect(agentsBuilderService.buildAgent).not.toHaveBeenCalled();
		});
	});

	describe('resumeBuild', () => {
		it('forwards to agentsBuilderService.resumeBuild and accumulates text-delta chunks', async () => {
			const { delegate, agentsBuilderService, user, credentialProvider } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			const mcpTools = fakeMcpTools();

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
					abortSignal,
					mcpTools,
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
					abortSignal,
					instructionsAddendum: INSTANCE_AI_BUILDER_ADDENDUM,
					mcpTools,
					onRequiredArtifact: expect.any(Function),
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
						abortSignal,
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
				abortSignal,
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
				abortSignal,
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
				abortSignal,
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
					abortSignal,
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

	describe('readAgentArtifact', () => {
		const CONFIG = { name: 'Support Triage' } as unknown as AgentJsonConfig;

		it('returns the config, the skill bodies, and the builder-s own config hash', async () => {
			const { delegate, agentConfig, agentSkills } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentConfig.getConfig.mockResolvedValue(CONFIG);
			const skills = { skill_triage_rules: mock<AgentSkill>({ name: 'Triage rules' }) };
			agentSkills.listSkills.mockResolvedValue(skills);

			const result = await delegate.readAgentArtifact!('agent-1');

			expect(agentConfig.getConfig).toHaveBeenCalledWith('agent-1', 'project-1');
			expect(agentSkills.listSkills).toHaveBeenCalledWith('agent-1', 'project-1');
			// The same value read_config hands the model, so a consumer can dedupe on it.
			expect(result).toEqual({ config: CONFIG, skills, configHash: getAgentConfigHash(CONFIG) });
		});

		it('returns null for an agent with no config yet, rather than throwing', async () => {
			// A freshly created agent the builder has not written to: nothing to
			// snapshot, and not a failure worth surfacing on a build.
			const { delegate, agentConfig, agentSkills } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentConfig.getConfig.mockRejectedValue(new UserError('Agent has no JSON config yet.'));

			await expect(delegate.readAgentArtifact!('agent-1')).resolves.toBeNull();
			expect(agentSkills.listSkills).not.toHaveBeenCalled();
		});

		it('propagates a read failure instead of reporting it as no config', async () => {
			// A missing agent or a dead DB is not "nothing to snapshot" — the callers
			// treat a throw as no snapshot and log it, so it stays diagnosable.
			const { delegate, agentConfig } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentConfig.getConfig.mockRejectedValue(new NotFoundError('Agent not found'));

			await expect(delegate.readAgentArtifact!('agent-1')).rejects.toThrow('Agent not found');
		});

		it('rejects when the user lacks agent:read scope', async () => {
			const { delegate, agentConfig } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);

			await expect(delegate.readAgentArtifact!('agent-1')).rejects.toThrow(ForbiddenError);
			expect(agentConfig.getConfig).not.toHaveBeenCalled();
		});
	});

	describe('createAgent', () => {
		it('enforces agent:create scope and delegates to AgentsService', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.create.mockResolvedValue(mock<Agent>({ id: 'agent-9', name: 'New agent' }));

			const result = await delegate.createAgent('New agent');

			expect(agentsService.create).toHaveBeenCalledWith('project-1', 'New agent', {
				id: undefined,
				adoptUnconfiguredOnCollision: true,
			});
			expect(result).toEqual({ agentId: 'agent-9', projectId: 'project-1' });
		});

		it('creates under the id the caller minted for its unsaved artifact', async () => {
			const { delegate, agentsService } = setup();
			vi.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			agentsService.create.mockResolvedValue(
				mock<Agent>({ id: 'aBcDeFgHiJkLmNoP', name: 'New agent' }),
			);

			await delegate.createAgent('New agent', 'aBcDeFgHiJkLmNoP');

			expect(agentsService.create).toHaveBeenCalledWith('project-1', 'New agent', {
				id: 'aBcDeFgHiJkLmNoP',
				adoptUnconfiguredOnCollision: true,
			});
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

describe('INSTANCE_AI_BUILDER_ADDENDUM', () => {
	it('tells the builder the orchestrator can create workflows and data tables', () => {
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain(
			'The Instance AI orchestrator can create workflows and data tables',
		);
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain('never ask the user to create them manually');
		expect(INSTANCE_AI_BUILDER_ADDENDUM).toContain(
			'the orchestrator will provision them and call you again',
		);
	});
});
