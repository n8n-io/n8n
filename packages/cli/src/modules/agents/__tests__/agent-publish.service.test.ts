import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { Telemetry } from '@/telemetry';

import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentPublishService } from '../agent-publish.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentSetupCompletionService } from '../agent-setup-completion.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentValidationService } from '../agent-validation.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SubAgentCleanupService } from '../sub-agents/sub-agent-cleanup.service';

const agentId = 'agent-1';
const projectId = 'project-1';
const versionId = 'version-1';
const user = { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' } as User;

const byUser = { by: 'user', trigger: 'explicit' } as const;
const byBuilder = { by: 'builder', trigger: 'explicit' } as const;

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		name: 'Support Agent',
		versionId,
		activeVersionId: null,
		activeVersion: null,
		schema,
		tools: {},
		skills: {},
		integrations: [],
		setupCompletedAt: null,
		...overrides,
	} as unknown as Agent;
}

function makeHistory(overrides: Partial<AgentHistory> = {}): AgentHistory {
	return {
		versionId,
		agentId,
		schema,
		tools: null,
		skills: null,
		author: 'Ada Lovelace',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		...overrides,
	} as unknown as AgentHistory;
}

function makeTaskSnapshot(overrides: Partial<AgentTaskSnapshot> = {}): AgentTaskSnapshot {
	return {
		versionId,
		taskId: 'task-1',
		enabled: true,
		name: 'Daily summary',
		objective: 'Summarize messages',
		cronExpression: '0 9 * * *',
		...overrides,
	} as AgentTaskSnapshot;
}

function makeTransaction() {
	const taskRepo = {
		findBy: vi.fn().mockResolvedValue([]),
		delete: vi.fn(),
		update: vi.fn(),
		insert: vi.fn(),
	};
	const trx = {
		save: vi.fn(),
		getRepository: vi.fn().mockReturnValue(taskRepo),
	};
	const transaction = vi.fn(async (callback: (manager: typeof trx) => Promise<void>) => {
		await callback(trx);
	});

	return { trx, taskRepo, transaction };
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const agentHistoryRepository = mock<AgentHistoryRepository>();
	const taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	const customToolsService = mock<AgentCustomToolsService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const taskService = mock<AgentTaskService>();
	const subAgentCleanupService = mock<SubAgentCleanupService>();
	const agentValidationService = mock<AgentValidationService>();
	const credentialsService = mock<CredentialsService>();
	const telemetry = mock<Telemetry>();
	const { trx, taskRepo, transaction } = makeTransaction();

	Object.defineProperty(agentRepository, 'manager', {
		value: { transaction },
		configurable: true,
	});

	agentRepository.claimSetupCompleted.mockResolvedValue(true);
	agentHistoryRepository.saveVersion.mockResolvedValue(makeHistory());
	customToolsService.snapshotConfiguredTools.mockReturnValue(null);
	chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
	chatIntegrationService.disconnect.mockResolvedValue();
	chatIntegrationService.disconnectChannel.mockResolvedValue();
	taskService.requestReconcile.mockResolvedValue();
	subAgentCleanupService.removeSubAgentFromParents.mockResolvedValue();
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	agentValidationService.validateAgentEntityConfiguration.mockResolvedValue({
		status: 'valid',
		issues: [],
	});
	agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
		status: 'valid',
		issues: [],
	});
	Container.set(ChatIntegrationService, chatIntegrationService);
	Container.set(AgentTaskService, taskService);

	const service = new AgentPublishService(
		mockLogger(),
		agentRepository,
		agentHistoryRepository,
		taskSnapshotRepository,
		agentTaskRepository,
		customToolsService,
		runtimeCacheService,
		subAgentCleanupService,
		agentValidationService,
		credentialsService,
		telemetry,
		new AgentSetupCompletionService(agentValidationService, telemetry, agentRepository),
		new AgentModificationTelemetryService(telemetry),
	);

	return {
		service,
		agentRepository,
		agentHistoryRepository,
		taskSnapshotRepository,
		agentTaskRepository,
		customToolsService,
		runtimeCacheService,
		chatIntegrationService,
		taskService,
		subAgentCleanupService,
		agentValidationService,
		credentialsService,
		telemetry,
		trx,
		taskRepo,
	};
}

describe('AgentPublishService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
	});

	it('rejects publishing the current draft when validation reports it invalid', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			taskSnapshotRepository,
			agentValidationService,
			runtimeCacheService,
			trx,
		} = makeService();
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentValidationService.validateAgentEntityConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Agent configuration has errors that must be resolved before publishing',
		);

		expect(agentValidationService.validateAgentEntityConfiguration).toHaveBeenCalledWith(
			agent,
			projectId,
			expect.anything(),
			expect.anything(),
		);
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
		expect(taskSnapshotRepository.saveForVersion).not.toHaveBeenCalled();
		expect(trx.save).not.toHaveBeenCalled();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBeNull();
	});

	it('rejects publishing a specific version when its snapshot fails validation, without touching the current draft validator', async () => {
		const { service, agentRepository, agentHistoryRepository, agentValidationService } =
			makeService();
		const agent = makeAgent({ versionId: 'draft-v2', activeVersionId: 'v0' });
		const target = makeHistory({ versionId: 'v1' });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);
		agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [
				{
					code: 'missing_reference',
					path: 'tools.0.id',
					capability: { kind: 'tool', id: 'gone', toolType: 'custom' },
				},
			],
		});

		await expect(service.publishAgent(agentId, projectId, user, byUser, 'v1')).rejects.toThrow(
			'Agent configuration has errors that must be resolved before publishing',
		);
		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledTimes(1);
		expect(agentValidationService.validateAgentHistoryConfiguration).toHaveBeenCalledWith(
			agentId,
			projectId,
			target,
			agent.integrations,
			expect.anything(),
		);
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
		expect(agentValidationService.validateAgentEntityConfiguration).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBe('v0');
	});

	it('publishes the current draft as a snapshot and activates that version', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			agentTaskRepository,
			taskSnapshotRepository,
			customToolsService,
			runtimeCacheService,
			chatIntegrationService,
			agentValidationService,
			telemetry,
			trx,
		} = makeService();
		const configuredTools = { tool: { descriptor: { name: 'tool' } } };
		const configuredSkills = {
			skill: { name: 'Skill', description: 'desc', instructions: 'Use it' },
		};
		const integrations = [
			{ type: 'slack', credentialId: 'slack-1' },
			{
				type: 'telegram',
				credentialId: 'telegram-1',
				settings: { accessMode: 'private', allowedUsers: ['123'] },
			},
		] satisfies Agent['integrations'];
		const agent = makeAgent({
			schema: {
				...schema,
				tools: [{ type: 'custom', id: 'tool' }],
				skills: [{ type: 'skill', id: 'skill' }],
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			},
			skills: configuredSkills,
			integrations,
		});
		const draftValidation = { status: 'valid' as const, issues: [] };
		const task = {
			id: 'task-1',
			name: 'Daily summary',
			objective: 'Summarize messages',
			cronExpression: '0 9 * * *',
		};

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentValidationService.validateAgentEntityConfiguration.mockResolvedValue(draftValidation);
		customToolsService.snapshotConfiguredTools.mockReturnValue(configuredTools as never);
		agentTaskRepository.findByAgentId.mockResolvedValue([task] as never);

		const result = await service.publishAgent(agentId, projectId, user, byBuilder);

		expect(result.draftValidation).toBe(draftValidation);
		expect(agentValidationService.validateAgentEntityConfiguration).toHaveBeenCalledTimes(1);
		expect(agentValidationService.validateAgentEntityConfiguration).toHaveBeenCalledWith(
			agent,
			projectId,
			new Map([['task-1', task]]),
			expect.anything(),
		);
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();

		expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
			{
				versionId,
				agentId,
				schema: agent.schema,
				tools: configuredTools,
				skills: configuredSkills,
				publishedBy: user,
			},
			trx,
		);
		expect(taskSnapshotRepository.saveForVersion).toHaveBeenCalledWith(
			[expect.objectContaining({ versionId, taskId: 'task-1', objective: 'Summarize messages' })],
			trx,
		);
		expect(agent.activeVersionId).toBe(versionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(chatIntegrationService.syncToConfig).toHaveBeenCalledWith(agent, [], integrations);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_PUBLISHED_AGENT,
			expect.objectContaining({
				agent_id: agentId,
				project_id: projectId,
				user_id: user.id,
				event_version: '1',
				trigger: 'explicit',
				version_id: versionId,
			}),
		);
	});

	it('marks setup complete when publishing an agent that never passed the config-save path', async () => {
		// Explicit publish can be the first path to observe a complete setup, so
		// the publish backstop must mark the agent before it becomes active.
		const { service, agentRepository, telemetry } = makeService();
		const agent = makeAgent({ integrations: [{ type: 'slack', credentialId: 'slack-cred' }] });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.publishAgent(agentId, projectId, user, byUser);

		expect(agent.setupCompletedAt).toBeInstanceOf(Date);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED,
			expect.objectContaining({ agent_id: agentId, trigger_count: 1, status: 'production' }),
		);
	});

	it('does not re-report setup completion for an already marked agent', async () => {
		const { service, agentRepository, telemetry } = makeService();
		const completedAt = new Date('2026-01-01T00:00:00.000Z');
		const agent = makeAgent({
			integrations: [{ type: 'slack', credentialId: 'slack-cred' }],
			setupCompletedAt: completedAt,
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.publishAgent(agentId, projectId, user, byUser);

		expect(agent.setupCompletedAt).toBe(completedAt);
		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.AGENT_SETUP_COMPLETED,
			expect.anything(),
		);
	});

	it('rejects publishing when a configured task body is missing', async () => {
		const { service, agentRepository, runtimeCacheService, telemetry } = makeService();
		const agent = makeAgent({
			schema: {
				...schema,
				tasks: [{ type: 'task', id: 'missing_task', enabled: true }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Cannot publish agent with missing task bodies: missing_task',
		);

		expect(agent.activeVersionId).toBeNull();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('rejects publishing when a configured skill body is missing', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent({
			schema: {
				...schema,
				skills: [{ type: 'skill', id: 'missing_skill' }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Cannot publish agent with missing skill bodies: missing_skill',
		);

		expect(agent.activeVersionId).toBeNull();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('avoids duplicate history inserts but creates a fresh version after unpublish', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			agentValidationService,
			chatIntegrationService,
			subAgentCleanupService,
			telemetry,
		} = makeService();
		const agent = makeAgent({
			versionId: 'v1',
			activeVersionId: 'v1',
			activeVersion: makeHistory({ versionId: 'v1' }),
			integrations: [{ type: 'slack', credentialId: 'slack-1' }],
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const result = await service.publishAgent(agentId, projectId, user, byUser);
		expect(result).toStrictEqual({ agent });
		expect(Object.hasOwn(result, 'draftValidation')).toBe(false);
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
		expect(agentValidationService.validateAgentEntityConfiguration).not.toHaveBeenCalled();
		// Idempotent no-op publish (already the active version) must not emit.
		expect(telemetry.track).not.toHaveBeenCalled();

		await service.unpublishAgent(agentId, projectId, user, 'user');
		expect(agent.activeVersionId).toBeNull();
		expect(agent.versionId).not.toBe('v1');
		expect(subAgentCleanupService.removeSubAgentFromParents).toHaveBeenCalledWith(
			agentId,
			projectId,
		);
		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith(
			agentId,
			{
				type: 'slack',
				credentialId: 'slack-1',
			},
			{ deleteSubscriptions: false },
		);
		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_UNPUBLISHED_AGENT, {
			agent_id: agentId,
			project_id: projectId,
			user_id: user.id,
			event_version: '2',
		});

		const draftVersion = agent.versionId;
		if (!draftVersion) throw new Error('Expected unpublish to assign a draft version');
		agentHistoryRepository.saveVersion.mockResolvedValue(makeHistory({ versionId: draftVersion }));
		await service.publishAgent(agentId, projectId, user, byUser);

		expect(agent.activeVersionId).toBe(draftVersion);
		expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
			expect.objectContaining({ versionId: draftVersion }),
			expect.anything(),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT,
			expect.objectContaining({
				agent_id: agentId,
				event_version: '2',
				trigger: 'explicit',
				version_id: draftVersion,
			}),
		);
	});

	it('switches to an existing history row when publishing a specific version', async () => {
		const { service, agentRepository, agentHistoryRepository, trx } = makeService();
		const agent = makeAgent({ versionId: 'draft-v2', activeVersionId: 'v0' });
		const target = makeHistory({ versionId: 'v1' });

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);

		const result = await service.publishAgent(agentId, projectId, user, byUser, 'v1');

		expect(result).toStrictEqual({ agent });
		expect(Object.hasOwn(result, 'draftValidation')).toBe(false);
		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledTimes(1);
		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledWith('v1', agentId);
		expect(agent.activeVersionId).toBe('v1');
		expect(agent.activeVersion).toBe(target);
		expect(agent.versionId).not.toBe('draft-v2');
		expect(trx.save).toHaveBeenCalledWith(agent);
	});

	it('reports activating an older version as a republish, not the explicit publish the caller asked for', async () => {
		const { service, agentRepository, agentHistoryRepository, telemetry } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ versionId: 'draft-v2', activeVersionId: 'v0' }),
		);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(
			makeHistory({ versionId: 'v1' }),
		);

		await service.publishAgent(agentId, projectId, user, byUser, 'v1');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT,
			expect.objectContaining({ trigger: 'republish', version_id: 'v1' }),
		);
	});

	it('attributes an MCP publish to MCP rather than to the builder', async () => {
		const { service, agentRepository, telemetry } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		await service.publishAgent(agentId, projectId, user, { by: 'mcp', trigger: 'explicit' });

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.MCP_PUBLISHED_AGENT,
			expect.objectContaining({ agent_id: agentId, event_version: '1', trigger: 'explicit' }),
		);
		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_PUBLISHED_AGENT,
			expect.anything(),
		);
	});

	it('reverts draft fields and task bodies from the active published snapshot', async () => {
		const { service, agentRepository, taskSnapshotRepository, taskRepo } = makeService();
		const activeVersion = makeHistory({
			versionId: 'published-v1',
			schema,
			tools: { tool: { descriptor: { name: 'published' } } } as unknown as AgentHistory['tools'],
			skills: { skill: { name: 'Skill', description: 'desc', instructions: 'Use it' } },
		});
		const agent = makeAgent({
			name: 'Draft Agent',
			versionId: 'draft-v2',
			activeVersionId: 'published-v1',
			activeVersion,
			schema: { ...schema, name: 'Draft Agent' },
			tools: {},
			skills: {},
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([makeTaskSnapshot()]);
		taskRepo.findBy.mockResolvedValue([{ id: 'task-1' }, { id: 'draft-only' }]);

		await expect(service.revertToPublishedAgent(agentId, projectId, user, 'user')).resolves.toBe(
			agent,
		);

		expect(agent.schema).toEqual(schema);
		expect(agent.name).toBe(schema.name);
		expect(agent.versionId).toBe('published-v1');
		expect(agent.tools).toEqual(activeVersion.tools);
		expect(agent.skills).toEqual(activeVersion.skills);
		expect(taskRepo.delete).toHaveBeenCalledWith(['draft-only']);
		expect(taskRepo.update).toHaveBeenCalledWith(
			'task-1',
			expect.objectContaining({ objective: 'Summarize messages' }),
		);
	});

	it('reverts to a selected history row and task snapshot without changing the active published version', async () => {
		const { service, agentRepository, agentHistoryRepository, taskSnapshotRepository, taskRepo } =
			makeService();
		const agent = makeAgent({
			activeVersionId: 'current-active',
			activeVersion: makeHistory({ versionId: 'current-active' }),
		});
		const target = makeHistory({
			versionId: 'older-version',
			schema: { ...schema, name: 'Older Agent' },
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([
			makeTaskSnapshot({
				versionId: 'older-version',
				taskId: 'task-1',
				name: 'Older task',
				objective: 'Use the older task objective',
			}),
		]);
		taskRepo.findBy.mockResolvedValue([{ id: 'task-1' }, { id: 'draft-only' }]);

		await service.revertToVersion(agentId, projectId, 'older-version', user, 'user');

		expect(agent.schema).toEqual(target.schema);
		expect(agent.name).toBe('Older Agent');
		expect(agent.activeVersionId).toBe('current-active');
		expect(agent.versionId).not.toBe('older-version');
		expect(taskRepo.delete).toHaveBeenCalledWith(['draft-only']);
		expect(taskRepo.update).toHaveBeenCalledWith(
			'task-1',
			expect.objectContaining({ objective: 'Use the older task objective' }),
		);
	});

	it('reports a revert as a modification of the parts the restored schema changed', async () => {
		const { service, agentRepository, agentHistoryRepository, taskSnapshotRepository, telemetry } =
			makeService();
		const agent = makeAgent({
			activeVersionId: 'current-active',
			activeVersion: makeHistory({ versionId: 'current-active' }),
			schema: { ...schema, instructions: 'Draft instructions' },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(
			makeHistory({ versionId: 'older-version', schema: { ...schema, name: 'Older Agent' } }),
		);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([]);

		await service.revertToVersion(agentId, projectId, 'older-version', user, 'user');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
			expect.objectContaining({
				agent_id: agentId,
				user_id: user.id,
				changed_parts: ['instructions', 'name'],
				has_published_version: true,
			}),
		);
	});

	it('reports sidecar body-only reverts when schema references are unchanged', async () => {
		const { service, agentRepository, taskSnapshotRepository, taskRepo, telemetry } = makeService();
		const schemaWithRefs: AgentJsonConfig = {
			...schema,
			tools: [{ type: 'custom', id: 'tool-1' }],
			skills: [{ type: 'skill', id: 'skill-1' }],
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
		};
		const publishedTools = {
			'tool-1': { code: 'published', descriptor: { name: 'tool-1' } },
		} as unknown as AgentHistory['tools'];
		const publishedSkills = {
			'skill-1': { name: 'Skill', description: 'published', instructions: 'Use published' },
		};
		const activeVersion = makeHistory({
			versionId: 'published-v1',
			schema: schemaWithRefs,
			tools: publishedTools,
			skills: publishedSkills,
		});
		const agent = makeAgent({
			activeVersionId: 'published-v1',
			activeVersion,
			schema: schemaWithRefs,
			tools: { 'tool-1': { code: 'draft', descriptor: { name: 'tool-1' } } } as never,
			skills: {
				'skill-1': { name: 'Skill', description: 'draft', instructions: 'Use draft' },
			},
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([
			makeTaskSnapshot({
				objective: 'Published objective',
			}),
		]);
		taskRepo.findBy.mockResolvedValue([
			{
				id: 'task-1',
				name: 'Daily summary',
				objective: 'Draft objective',
				cronExpression: '0 9 * * *',
			},
		]);

		await service.revertToPublishedAgent(agentId, projectId, user, 'user');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
			expect.objectContaining({
				agent_id: agentId,
				changed_parts: ['tools', 'skills', 'tasks'],
				has_published_version: true,
			}),
		);
		expect(telemetry.track).toHaveBeenCalledTimes(1);
	});

	it('returns a version snapshot with its task snapshots', async () => {
		const { service, agentRepository, agentHistoryRepository, taskSnapshotRepository } =
			makeService();
		const version = makeHistory({ versionId: 'old-version' });
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(version);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([makeTaskSnapshot()]);

		const result = await service.getVersion(agentId, projectId, 'old-version');

		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledWith(
			'old-version',
			agentId,
		);
		expect(result.version).toBe(version);
		expect(result.tasks).toEqual([makeTaskSnapshot()]);
	});

	it('throws when the requested version does not exist for the agent', async () => {
		const { service, agentRepository, agentHistoryRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(null);

		await expect(service.getVersion(agentId, projectId, 'nope')).rejects.toThrow(
			'Version "nope" not found for agent "agent-1"',
		);
	});

	it('maps publish history rows and marks the active version', async () => {
		const { service, agentRepository, agentHistoryRepository } = makeService();
		const active = makeHistory({ versionId: 'active-version', author: 'Ada Lovelace' });
		const inactive = makeHistory({ versionId: 'old-version', author: 'Grace Hopper' });

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersionId: 'active-version' }),
		);
		agentHistoryRepository.findByAgentId.mockResolvedValue([active, inactive]);

		await expect(service.listPublishHistory(agentId, projectId, 20, 0)).resolves.toEqual([
			expect.objectContaining({
				versionId: 'active-version',
				author: 'Ada Lovelace',
				isActive: true,
			}),
			expect.objectContaining({
				versionId: 'old-version',
				author: 'Grace Hopper',
				isActive: false,
			}),
		]);
	});
});
