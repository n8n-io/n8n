import { NotFoundError } from '@n8n/errors';
import type { AgentPublishHistory } from '../entities/agent-publish-history.entity';
import type { AgentPublishHistoryRepository } from '../repositories/agent-publish-history.repository';
// Experiment cleanup (123_surface_mcp_to_claude_trial_users): restore a type-only EventService import; keep the import.
import type { EventService } from '@n8n/backend-services';
import type { ToolDescriptor } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User, TransactionRunner, OperationContext, Transaction } from '@n8n/db';
import { Container } from '@n8n/di';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@n8n/errors';
import type { Telemetry } from '@/telemetry';

import { runInBuilderTelemetrySession } from '../builder/builder-telemetry-session';
import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentSaveCompletionService } from '../agent-save-completion.service';
import { AgentDefinitionService } from '../agent-definition.service';
import { AgentPublishService } from '../agent-publish.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentModificationTelemetryService } from '../agent-modification-telemetry.service';
import { AgentSetupCompletionService } from '../agent-setup-completion.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentUpdateBroadcaster } from '../agent-update-broadcaster';
import type { AgentValidationService } from '../agent-validation.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent, ProjectAgent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentPolicyService } from '../agent-policy.service';
import {
	type AgentFixtureOverrides,
	type AgentHistoryFixtureOverrides,
	createAgentSkillRefsService,
	storedAgentConfig,
} from './test-utils/stored-agent-config';

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

function makeAgent(overrides: AgentFixtureOverrides = {}): ProjectAgent {
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
		revision: 0,
		publicationRevision: 0,
		...overrides,
	} as unknown as ProjectAgent;
}

function makeHistory(overrides: AgentHistoryFixtureOverrides = {}): AgentHistory {
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

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const agentHistoryRepository = mock<AgentHistoryRepository>();
	const publishHistory = mock<AgentPublishHistoryRepository>();
	const taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	const customToolsService = mock<AgentCustomToolsService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const taskService = mock<AgentTaskService>();
	const agentValidationService = mock<AgentValidationService>();
	const credentialsService = mock<CredentialsService>();
	const telemetry = mock<Telemetry>();
	const eventService = mock<EventService>();
	const agentUpdateBroadcaster = mock<AgentUpdateBroadcaster>();
	const ctx: OperationContext = { trx: mock<Transaction>() };
	const transactionRunner = mock<TransactionRunner>();
	transactionRunner.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
	taskSnapshotRepository.findByVersionId.mockResolvedValue([]);
	agentTaskRepository.replaceForAgent.mockResolvedValue(false);
	Container.set(AgentRuntimeCacheService, runtimeCacheService);
	const agentPolicyService = mock<AgentPolicyService>();
	const agentFileRepository = mock<AgentFileRepository>();
	agentFileRepository.getKnowledgeTotals.mockResolvedValue({ fileCount: 0, totalBytes: 0 });

	agentRepository.claimSetupCompleted.mockResolvedValue(true);
	agentRepository.setActiveVersionFenced.mockResolvedValue(true);
	agentRepository.lockForVersionCapture.mockImplementation(
		async () => await agentRepository.findByIdAndProjectId(agentId, projectId),
	);
	agentRepository.findById.mockImplementation(
		async () => await agentRepository.findByIdAndProjectId(agentId, projectId),
	);
	publishHistory.hasPublication.mockResolvedValue(false);
	publishHistory.findLatestForVersions.mockResolvedValue(new Map());
	agentRepository.saveDraftFenced.mockResolvedValue(true);
	agentHistoryRepository.saveVersion.mockResolvedValue(makeHistory());
	customToolsService.snapshotConfiguredTools.mockReturnValue(null);
	chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
	chatIntegrationService.disconnect.mockResolvedValue();
	chatIntegrationService.disconnectChannel.mockResolvedValue();
	taskService.requestReconcile.mockResolvedValue();
	agentTaskRepository.findByAgentId.mockResolvedValue([]);
	agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
		status: 'valid',
		issues: [],
	});
	Container.set(ChatIntegrationService, chatIntegrationService);
	Container.set(AgentTaskService, taskService);

	const skillRefs = createAgentSkillRefsService();
	const service = new AgentPublishService(
		mockLogger(),
		agentRepository,
		agentHistoryRepository,
		runtimeCacheService,
		agentValidationService,
		credentialsService,
		telemetry,
		eventService,
		new AgentSetupCompletionService(agentValidationService, telemetry, agentRepository),
		agentUpdateBroadcaster,
		transactionRunner,
		new AgentSaveCompletionService(
			eventService,
			agentUpdateBroadcaster,
			// Experiment cleanup (123_surface_mcp_to_claude_trial_users): remove only the mock<EventService>() argument.
			new AgentModificationTelemetryService(
				telemetry,
				mock<InstanceSettings>(),
				mock<EventService>(),
			),
		),
		new AgentDefinitionService(
			agentTaskRepository,
			agentHistoryRepository,
			taskSnapshotRepository,
			agentRepository,
			transactionRunner,
			skillRefs,
		),
		agentPolicyService,
		skillRefs,
		agentFileRepository,
		publishHistory,
	);

	return {
		publishHistory,
		service,
		agentFileRepository,
		skillRefs,
		agentPolicyService,
		agentUpdateBroadcaster,
		agentRepository,
		agentHistoryRepository,
		taskSnapshotRepository,
		agentTaskRepository,
		customToolsService,
		runtimeCacheService,
		chatIntegrationService,
		taskService,
		agentValidationService,
		credentialsService,
		telemetry,
		eventService,
		ctx,
		transactionRunner,
	};
}

describe('AgentPublishService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
	});

	it('records each publication transition in its transaction', async () => {
		const { service, agentRepository, publishHistory, ctx } = makeService();
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		await service.publishAgent(agentId, projectId, user, byUser);
		expect(publishHistory.record).toHaveBeenCalledWith(agentId, versionId, 'activated', user, ctx);
		await service.unpublishAgent(agentId, projectId, user, 'user');
		expect(publishHistory.record).toHaveBeenCalledWith(
			agentId,
			versionId,
			'deactivated',
			user,
			ctx,
		);
	});

	it('publishes the selected snapshot while an autosave creates a newer draft', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			agentValidationService,
			publishHistory,
			telemetry,
		} = makeService();
		const agent = makeAgent({ versionId: 'draft-v1' });
		const target = makeHistory({
			versionId: 'saved-v0',
			schema: { ...schema, instructions: 'Original instructions' },
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);
		agentValidationService.validateAgentHistoryConfiguration.mockImplementation(async () => {
			agent.versionId = 'draft-v2';
			agent.revision += 1;
			agent.schema = storedAgentConfig({ ...schema, instructions: 'New draft instructions' });
			return { status: 'valid', issues: [] };
		});
		const result = await service.publishAgent(agentId, projectId, user, byUser, 'saved-v0');
		expect(result.agent).toMatchObject({
			versionId: 'draft-v2',
			activeVersionId: 'saved-v0',
			schema: { instructions: 'New draft instructions' },
		});
		expect(result.agent.activeVersion).toBe(target);
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
		expect(publishHistory.record).toHaveBeenCalledWith(
			agentId,
			'saved-v0',
			'activated',
			user,
			expect.anything(),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT,
			expect.objectContaining({ trigger: 'explicit' }),
		);
	});

	it('uses the current publication state when updating channels', async () => {
		const { service, agentRepository, agentHistoryRepository, chatIntegrationService } =
			makeService();
		const integrations = [
			{ type: 'slack', credentialId: 'credential' },
		] satisfies Agent['integrations'];
		const agent = makeAgent({ integrations });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeHistory());
		agentRepository.findById.mockResolvedValue(
			makeAgent({ integrations, activeVersionId: null, publicationRevision: 2 }),
		);
		await service.publishAgent(agentId, projectId, user, byUser);
		expect(chatIntegrationService.syncToConfig).not.toHaveBeenCalled();
		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith(
			agentId,
			integrations[0],
			{ deleteSubscriptions: false },
		);
	});

	it('rejects publishing the current draft when validation reports it invalid', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			agentValidationService,
			runtimeCacheService,
			eventService,
			agentUpdateBroadcaster,
			telemetry,
		} = makeService();
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [{ code: 'missing_credential', path: 'credential', capability: { kind: 'agent' } }],
		});

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Agent configuration has errors that must be resolved before publishing',
		);

		expect(agentValidationService.validateAgentHistoryConfiguration).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ versionId }),
			[],
			expect.anything(),
		);
		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();
		expect(agentRepository.setActiveVersionFenced).not.toHaveBeenCalled();
		expect(agentHistoryRepository.recordPublisher).not.toHaveBeenCalled();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBeNull();
	});

	it('names unpublished workflow tools when rejecting the publish', async () => {
		const { service, agentRepository, agentValidationService } = makeService();
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [
				{
					code: 'incompatible_reference',
					path: 'tools.0.workflowId',
					capability: { kind: 'tool', toolType: 'workflow', id: 'Lookup' },
					reason: 'not_published',
				},
				{
					code: 'incompatible_reference',
					path: 'tools.1.workflowId',
					capability: { kind: 'tool', toolType: 'workflow', id: 'Notify' },
					reason: 'not_published',
				},
			],
		});

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Cannot publish agent: workflow "Lookup" is not published; workflow "Notify" is not published. Publish these workflows first.',
		);
		expect(agentRepository.setActiveVersionFenced).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBeNull();
	});

	describe('policy', () => {
		it('polices the draft it publishes before validating it', async () => {
			const { service, agentRepository, agentPolicyService, agentValidationService } =
				makeService();
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPolicyService.enforcePublish.mockRejectedValue(new Error('Blocked by policy'));

			await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
				'Blocked by policy',
			);

			expect(agentPolicyService.enforcePublish).toHaveBeenCalledWith(
				projectId,
				agentId,
				agent.schema,
				{ kind: 'user', user },
			);
			expect(agentValidationService.validateAgentEntityConfiguration).not.toHaveBeenCalled();
			expect(agent.activeVersionId).toBeNull();
		});

		it('polices the snapshot, not the draft, when republishing a version', async () => {
			const { service, agentRepository, agentHistoryRepository, agentPolicyService } =
				makeService();
			const agent = makeAgent({ versionId: 'draft-v2', activeVersionId: 'v0' });
			const target = makeHistory({ versionId: 'v1', schema: { ...schema, name: 'Older' } });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);
			agentPolicyService.enforcePublish.mockRejectedValue(new Error('Blocked by policy'));

			await expect(service.publishAgent(agentId, projectId, user, byUser, 'v1')).rejects.toThrow(
				'Blocked by policy',
			);

			expect(agentPolicyService.enforcePublish).toHaveBeenCalledWith(
				projectId,
				agentId,
				target.schema,
				{ kind: 'user', user },
			);
			expect(agent.activeVersionId).toBe('v0');
		});

		it('polices a revert as a save of the restored schema over the current draft', async () => {
			const {
				service,
				agentRepository,
				agentHistoryRepository,
				agentPolicyService,
				transactionRunner,
			} = makeService();
			const draft = { ...schema, name: 'Draft Agent' };
			const agent = makeAgent({ schema: draft });
			const target = makeHistory({ versionId: 'older', schema: { ...schema, name: 'Older' } });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);
			agentPolicyService.enforceSave.mockRejectedValue(new Error('Blocked by policy'));

			await expect(
				service.revertToVersion(agentId, projectId, 'older', user, 'user'),
			).rejects.toThrow('Blocked by policy');

			expect(agentPolicyService.enforceSave).toHaveBeenCalledWith(
				projectId,
				agentId,
				target.schema,
				draft,
				{ kind: 'user', user },
			);
			expect(transactionRunner.run).not.toHaveBeenCalled();
			expect(agent.schema).toBe(draft);
		});

		it('polices a revert to the published version the same way', async () => {
			const { service, agentRepository, agentPolicyService, transactionRunner } = makeService();
			const draft = { ...schema, name: 'Draft Agent' };
			const activeVersion = makeHistory({ versionId: 'published-v1', schema });
			const agent = makeAgent({
				schema: draft,
				activeVersionId: 'published-v1',
				activeVersion,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentPolicyService.enforceSave.mockRejectedValue(new Error('Blocked by policy'));

			await expect(
				service.revertToPublishedAgent(agentId, projectId, user, 'user'),
			).rejects.toThrow('Blocked by policy');

			expect(agentPolicyService.enforceSave).toHaveBeenCalledWith(
				projectId,
				agentId,
				schema,
				draft,
				{ kind: 'user', user },
			);
			expect(transactionRunner.run).not.toHaveBeenCalled();
		});
	});

	describe('channel startup preflight', () => {
		const telegram = { type: 'telegram', credentialId: 'cred-1' } as const;

		it('rejects the publish when a channel cannot start, without activating it', async () => {
			const {
				service,
				agentRepository,
				chatIntegrationService,
				runtimeCacheService,
				eventService,
				agentUpdateBroadcaster,
				telemetry,
			} = makeService();
			const agent = makeAgent({ integrations: [telegram] });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			chatIntegrationService.assertStartupPreconditions.mockRejectedValue(
				new ConflictError('This Telegram credential is already connected to agent "Other"'),
			);

			await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
				ConflictError,
			);

			expect(agentRepository.setActiveVersionFenced).not.toHaveBeenCalled();
			expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
			expect(chatIntegrationService.syncToConfig).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
			expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
			expect(agent.activeVersionId).toBeNull();
		});

		it('checks every configured channel and skips draft entries, which have no credential', async () => {
			const { service, agentRepository, chatIntegrationService } = makeService();
			const draft = { type: 'slack', credentialId: '' } as const;
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ integrations: [telegram, draft] }),
			);

			await service.publishAgent(agentId, projectId, user, byUser);

			expect(chatIntegrationService.assertStartupPreconditions).toHaveBeenCalledTimes(1);
			expect(chatIntegrationService.assertStartupPreconditions).toHaveBeenCalledWith(
				agentId,
				telegram,
				projectId,
			);
		});

		it('preflights a channel whose settings a later version made required', async () => {
			// Whether the preflight re-runs a platform's own `validateConfig` is
			// asserted against the real service in `chat-integration.service.test.ts`;
			// here the point is only that a legacy entry still reaches the preflight.
			const { service, agentRepository, chatIntegrationService } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ integrations: [{ type: 'telegram', credentialId: 'cred-1' }] }),
			);

			await expect(service.publishAgent(agentId, projectId, user, byUser)).resolves.toBeDefined();

			expect(chatIntegrationService.assertStartupPreconditions).toHaveBeenCalledWith(
				agentId,
				{ type: 'telegram', credentialId: 'cred-1' },
				projectId,
			);
		});

		it('runs before activation, so a rejection preserves publication state', async () => {
			const { service, agentRepository, chatIntegrationService, agentHistoryRepository } =
				makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ integrations: [telegram] }),
			);
			chatIntegrationService.assertStartupPreconditions.mockImplementation(async () => {
				expect(agentRepository.setActiveVersionFenced).not.toHaveBeenCalled();
			});

			await service.publishAgent(agentId, projectId, user, byUser);

			expect(agentHistoryRepository.saveVersion).toHaveBeenCalled();
		});
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
			runtimeCacheService,
			chatIntegrationService,
			agentValidationService,
			telemetry,
			eventService,
			agentUpdateBroadcaster,
			ctx,
			skillRefs,
		} = makeService();
		const configuredTools = {
			tool: { code: 'return 1;', descriptor: mock<ToolDescriptor>({ name: 'tool' }) },
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
			integrations: [...integrations, { type: 'n8n_chat', credentialId: '' }],
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
		agent.tools = configuredTools;
		agentTaskRepository.findByAgentId.mockResolvedValue([task] as never);

		const result = await service.publishAgent(agentId, projectId, user, byBuilder);

		expect(result.draftValidation).toBeUndefined();
		expect(agentValidationService.validateAgentHistoryConfiguration).toHaveBeenCalledTimes(1);

		expect(agentValidationService.validateAgentConfiguration).not.toHaveBeenCalled();

		expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
			{
				versionId,
				agentId,
				schema: {
					...agent.schema!,
					integrations: [{ type: 'n8n_chat', credentialId: '' }],
				},
				tools: configuredTools,
				savedBy: user,
			},
			ctx,
		);
		expect(skillRefs.pinVersion).toHaveBeenCalledWith(
			versionId,
			await skillRefs.versionSnapshot.mock.results[0].value,
			ctx,
		);
		expect(taskSnapshotRepository.saveForVersion).toHaveBeenCalledWith(
			[expect.objectContaining({ versionId, taskId: 'task-1', objective: 'Summarize messages' })],
			ctx,
		);
		expect(agent.activeVersionId).toBe(versionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(eventService.emit).toHaveBeenCalledWith('agent-saved', { agentId });
		expect(agentUpdateBroadcaster.notify).toHaveBeenCalledWith(
			{ projectId, agentId, source: 'builder' },
			undefined,
		);
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

	it('reports the Assistant thread and run on a builder publish inside a session', async () => {
		const { service, agentRepository, telemetry } = makeService();
		const agent = makeAgent({ integrations: [{ type: 'slack', credentialId: 'slack-cred' }] });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await runInBuilderTelemetrySession(
			{ threadId: 'thread-1', runId: 'run-1' },
			async () =>
				await service.publishAgent(agentId, projectId, user, {
					by: 'builder',
					trigger: 'explicit',
				}),
		);

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_PUBLISHED_AGENT,
			expect.objectContaining({ thread_id: 'thread-1', run_id: 'run-1' }),
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
		const { service, agentRepository, runtimeCacheService, telemetry, agentValidationService } =
			makeService();
		const agent = makeAgent({
			schema: {
				...schema,
				tasks: [{ type: 'task', id: 'missing_task', enabled: true }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [
				{
					code: 'missing_reference',
					path: 'tasks',
					capability: { kind: 'task', id: 'missing_task' },
				},
			],
		});

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Agent configuration has errors that must be resolved before publishing',
		);

		expect(agent.activeVersionId).toBeNull();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('rejects publishing a saved version with a missing skill', async () => {
		const { service, agentRepository, runtimeCacheService, agentValidationService } = makeService();
		const agent = makeAgent({
			schema: {
				...schema,
				skills: [{ type: 'skill', id: 'missing_skill' }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
			status: 'invalid',
			issues: [
				{
					code: 'missing_reference',
					path: 'skill:missing_skill',
					capability: { kind: 'skill', id: 'missing_skill' },
				},
			],
		});

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Agent configuration has errors that must be resolved before publishing',
		);

		expect(agent.activeVersionId).toBeNull();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('avoids duplicate history inserts and preserves the draft across unpublish', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			agentValidationService,
			chatIntegrationService,
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
		expect(agent.versionId).toBe('v1');
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

		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(
			makeHistory({ versionId: 'v1' }),
		);
		await service.publishAgent(agentId, projectId, user, byUser);
		expect(agent.activeVersionId).toBe('v1');
		expect(agent.versionId).toBe('v1');
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
	});

	it('keeps the startup snapshot when publishing the current draft', async () => {
		const { service, agentRepository, agentHistoryRepository } = makeService();
		const agent = makeAgent({ versionId: 'startup-version' });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(
			makeHistory({ versionId: 'startup-version' }),
		);

		await service.publishAgent(agentId, projectId, user, byUser);

		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
		expect(agent.versionId).toBe('startup-version');
		expect(agent.activeVersionId).toBe('startup-version');
	});

	it('switches to an existing history row when publishing a specific version', async () => {
		const { service, agentRepository, agentHistoryRepository, ctx } = makeService();
		const agent = makeAgent({
			versionId: 'draft-v2',
			activeVersionId: 'v0',
			integrations: [{ type: 'n8n_chat', credentialId: '' }],
		});
		const target = makeHistory({ versionId: 'v1', schema: { ...schema, integrations: [] } });

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);

		const result = await service.publishAgent(agentId, projectId, user, byUser, 'v1');

		expect(result).toStrictEqual({ agent });
		expect(Object.hasOwn(result, 'draftValidation')).toBe(false);
		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledTimes(1);
		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledWith('v1', agentId);
		expect(agent.activeVersionId).toBe('v1');
		expect(agent.activeVersion).toBe(target);
		expect(agent.integrations).toEqual([{ type: 'n8n_chat', credentialId: '' }]);
		expect(target.schema?.integrations).toEqual([]);
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
		expect(agent.versionId).toBe('draft-v2');
		expect(agentRepository.setActiveVersionFenced).toHaveBeenCalledWith(agent.id, 0, 'v1', ctx);
	});

	it('reports activating an older version as a republish, not the explicit publish the caller asked for', async () => {
		const { service, agentRepository, agentHistoryRepository, telemetry, publishHistory } =
			makeService();
		publishHistory.hasPublication.mockResolvedValue(true);
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

	it.each([
		['user', TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT],
		['builder', TELEMETRY_EVENT.AGENTS.BUILDER_PUBLISHED_AGENT],
		['mcp', TELEMETRY_EVENT.AGENTS.MCP_PUBLISHED_AGENT],
	] as const)(
		'adds the knowledge file totals to the %s publish event',
		async (by, publishedEvent) => {
			const { service, agentRepository, agentFileRepository, telemetry } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentFileRepository.getKnowledgeTotals.mockResolvedValue({
				fileCount: 3,
				totalBytes: 4096,
			});

			await service.publishAgent(agentId, projectId, user, { by, trigger: 'explicit' });

			expect(agentFileRepository.getKnowledgeTotals).toHaveBeenCalledWith(agentId);
			expect(telemetry.track).toHaveBeenCalledWith(
				publishedEvent,
				expect.objectContaining({ knowledge_file_count: 3, knowledge_total_bytes: 4096 }),
			);
		},
	);

	it('publishes and sends the event without knowledge totals when the totals read fails', async () => {
		const { service, agentRepository, agentFileRepository, telemetry } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentFileRepository.getKnowledgeTotals.mockRejectedValue(new Error('read failed'));

		await service.publishAgent(agentId, projectId, user, byUser);

		expect(agentRepository.setActiveVersionFenced).toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT,
			expect.not.objectContaining({ knowledge_file_count: expect.anything() }),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_PUBLISHED_AGENT,
			expect.not.objectContaining({ knowledge_total_bytes: expect.anything() }),
		);
	});

	it('reverts draft fields and task bodies from the active published snapshot', async () => {
		const { service, agentRepository, taskSnapshotRepository, agentTaskRepository, skillRefs } =
			makeService();
		const activeVersion = makeHistory({
			versionId: 'published-v1',
			schema: {
				...schema,
				tools: [
					{ type: 'custom', id: 'tool', enabled: false, requireApproval: true },
					{
						type: 'workflow',
						workflow: 'Test workflow',
						inputs: {
							constructor: { mode: 'ai' as const, description: 'Use the label.' },
							hasOwnProperty: { mode: 'fixed' as const, value: '=literal' },
						},
					},
				],
				skills: [{ type: 'skill', id: 'skill' }],
				subAgents: { agents: [{ agentId: 'agent-2', enabled: false, useWhen: 'Review notes' }] },
				tasks: [{ type: 'task', id: 'task-1', enabled: false }],
			},
			tools: { tool: { descriptor: { name: 'published' } } } as unknown as AgentHistory['tools'],
		});
		const agent = makeAgent({
			name: 'Draft Agent',
			versionId: 'draft-v2',
			activeVersionId: 'published-v1',
			activeVersion,
			schema: { ...schema, name: 'Draft Agent' },
			tools: {},
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([makeTaskSnapshot()]);
		agentTaskRepository.replaceForAgent.mockResolvedValue(true);

		await expect(service.revertToPublishedAgent(agentId, projectId, user, 'user')).resolves.toBe(
			agent,
		);

		const { skills: publishedSkillRefs, ...publishedConfig } =
			activeVersion.schema as AgentJsonConfig;
		expect(agent.schema).toEqual(publishedConfig);
		expect(agent.name).toBe(schema.name);
		expect(agent.versionId).not.toBe('published-v1');
		expect(agent.tools).toEqual(activeVersion.tools);
		// The skill refs are pinned to the versions that the published version ran.
		expect(skillRefs.restoreDraftRefs).toHaveBeenCalledWith(
			agent,
			activeVersion,
			publishedSkillRefs,
			expect.anything(),
		);
		expect(skillRefs.replaceDraftRefs).not.toHaveBeenCalled();
		expect(agentTaskRepository.replaceForAgent).toHaveBeenCalledWith(
			agentId,
			new Map([['task-1', expect.objectContaining({ objective: 'Summarize messages' })]]),
			expect.anything(),
		);
	});

	it('reverts to a selected history row and task snapshot without changing the active published version', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			taskSnapshotRepository,
			agentTaskRepository,
		} = makeService();
		const agent = makeAgent({
			activeVersionId: 'current-active',
			activeVersion: makeHistory({ versionId: 'current-active' }),
			integrations: [{ type: 'n8n_chat', credentialId: '' }],
		});
		const target = makeHistory({
			versionId: 'older-version',
			schema: { ...schema, name: 'Older Agent', integrations: [] },
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
		agentTaskRepository.replaceForAgent.mockResolvedValue(true);

		await service.revertToVersion(agentId, projectId, 'older-version', user, 'user');

		expect(agent.schema).toEqual({ ...schema, name: 'Older Agent' });
		expect(agent.name).toBe('Older Agent');
		expect(agent.activeVersionId).toBe('current-active');
		expect(agent.integrations).toEqual([{ type: 'n8n_chat', credentialId: '' }]);
		expect(agent.versionId).not.toBe('older-version');
		expect(agentTaskRepository.replaceForAgent).toHaveBeenCalledWith(
			agentId,
			new Map([['task-1', expect.objectContaining({ objective: 'Use the older task objective' })]]),
			expect.anything(),
		);
	});

	it.each(['published', 'selected'] as const)(
		'reports settings restored by a %s-version revert',
		async (target) => {
			const {
				service,
				agentRepository,
				agentHistoryRepository,
				taskSnapshotRepository,
				telemetry,
			} = makeService();
			const restoredSchema: AgentJsonConfig = {
				...schema,
				name: 'Older Agent',
				config: { toolCallConcurrency: 2 },
			};
			const agent = makeAgent({
				activeVersionId: 'current-active',
				activeVersion: makeHistory({ versionId: 'current-active', schema: restoredSchema }),
				schema: { ...schema, instructions: 'Draft instructions', config: { maxIterations: 20 } },
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(
				makeHistory({ versionId: 'older-version', schema: restoredSchema }),
			);
			taskSnapshotRepository.findByVersionId.mockResolvedValue([]);

			if (target === 'published') {
				await service.revertToPublishedAgent(agentId, projectId, user, 'user');
			} else {
				await service.revertToVersion(agentId, projectId, 'older-version', user, 'user');
			}

			expect(agent.schema).toEqual(restoredSchema);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
				expect.objectContaining({
					agent_id: agentId,
					user_id: user.id,
					changed_parts: ['instructions', 'name', 'config'],
					changed_settings: ['tool_concurrency', 'max_iterations'],
					event_version: '2',
					has_published_version: true,
				}),
			);
		},
	);

	it('reports sidecar body-only reverts when schema references are unchanged', async () => {
		const {
			service,
			agentRepository,
			taskSnapshotRepository,
			agentTaskRepository,
			telemetry,
			skillRefs,
		} = makeService();
		const schemaWithRefs: AgentJsonConfig = {
			...schema,
			tools: [{ type: 'custom', id: 'tool-1' }],
			skills: [{ type: 'skill', id: 'skill-1' }],
			tasks: [{ type: 'task', id: 'task-1', enabled: true }],
		};
		const publishedTools = {
			'tool-1': { code: 'published', descriptor: { name: 'tool-1' } },
		} as unknown as AgentHistory['tools'];
		const activeVersion = makeHistory({
			versionId: 'published-v1',
			schema: schemaWithRefs,
			tools: publishedTools,
		});
		const agent = makeAgent({
			activeVersionId: 'published-v1',
			activeVersion,
			schema: schemaWithRefs,
			tools: { 'tool-1': { code: 'draft', descriptor: { name: 'tool-1' } } } as never,
		});
		// The draft follows the latest version; the revert pins the published one.
		const pin = '0b2c6f1e-7d3a-4c1b-9f2e-5a6b7c8d9e0f';
		skillRefs.restoreDraftRefs.mockImplementation(async (draft) => {
			skillRefs.draftRefs.set(draft.id, [{ type: 'skill', id: 'skill-1', versionId: pin }]);
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([
			makeTaskSnapshot({
				objective: 'Published objective',
			}),
		]);
		agentTaskRepository.replaceForAgent.mockResolvedValue(true);

		await service.revertToPublishedAgent(agentId, projectId, user, 'user');

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_MODIFIED_AGENT,
			expect.objectContaining({
				agent_id: agentId,
				changed_parts: ['tools', 'skills', 'tasks'],
				changed_settings: [],
				has_published_version: true,
			}),
		);
		expect(telemetry.track).toHaveBeenCalledTimes(1);
	});

	it('reads the selected version without using draft or active-version bodies', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			taskSnapshotRepository,
			agentTaskRepository,
			skillRefs,
		} = makeService();
		const version = makeHistory({
			versionId: 'old-version',
			schema: {
				...schema,
				name: 'Older agent',
				tasks: [{ type: 'task', id: 'task-1', enabled: false }],
				integrations: [{ type: 'n8n_chat', credentialId: '' }],
			},
		});
		const olderSkill = {
			name: 'Older skill',
			description: 'Older description',
			instructions: 'Older body',
		};
		skillRefs.readVersion.mockResolvedValue({ skillRefs: [], skills: { skill: olderSkill } });
		const agent = makeAgent({
			schema: { ...schema, name: 'Draft agent' },
			tools: {
				draft_tool: { code: 'return 1;', descriptor: mock<ToolDescriptor>({ name: 'draft_tool' }) },
			},
			activeVersion: makeHistory({
				versionId: 'active-version',
				schema: { ...schema, name: 'Active agent' },
			}),
			activeVersionId: 'active-version',
			integrations: [{ type: 'slack', credentialId: 'current-credential' }],
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(version);
		const snapshot = makeTaskSnapshot({ versionId: 'old-version', enabled: false });
		taskSnapshotRepository.findByVersionId.mockResolvedValue([snapshot]);

		const result = await service.getVersion(agentId, projectId, 'old-version');

		expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledWith(
			'old-version',
			agentId,
		);
		expect(result.version).toBe(version);
		expect(result.definition).toEqual({
			schema: { ...version.schema, skills: [] },
			tools: {},
			skills: { skill: olderSkill },
			tasks: new Map([
				[
					'task-1',
					{
						name: 'Daily summary',
						objective: 'Summarize messages',
						cronExpression: '0 9 * * *',
						timezone: null,
					},
				],
			]),
		});
		expect(result.agent.integrations).toEqual([
			{ type: 'slack', credentialId: 'current-credential' },
		]);
		expect(agentTaskRepository.findByAgentId).not.toHaveBeenCalled();
	});

	describe('skill refs round trip', () => {
		const skillRefs = [
			{ type: 'skill' as const, id: 'zeta' },
			{ type: 'skill' as const, id: 'mid' },
		];

		it('pins the draft skill refs in the publish transaction', async () => {
			const {
				service,
				agentRepository,
				agentHistoryRepository,
				agentValidationService,
				skillRefs: refsService,
				ctx,
			} = makeService();
			const agent = makeAgent({ schema: { ...schema, skills: skillRefs } });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
				status: 'valid',
				issues: [],
			});

			await service.publishAgent(agentId, projectId, user, byBuilder);

			const [[saved, saveCtx]] = agentHistoryRepository.saveVersion.mock.calls;
			// The pins hold the skills, so publish writes no `agent_history.skills`.
			expect(saved).not.toHaveProperty('skills');
			expect(refsService.versionSnapshot).toHaveBeenCalledWith(agent, ctx);
			expect(refsService.pinVersion).toHaveBeenCalledWith(saved.versionId, expect.any(Map), ctx);
			expect(saveCtx).toBe(ctx);
			// The pins need the history row.
			expect(agentHistoryRepository.saveVersion.mock.invocationCallOrder[0]).toBeLessThan(
				refsService.pinVersion.mock.invocationCallOrder[0],
			);
		});

		it('reverts the draft skill refs to the pinned refs of the version', async () => {
			const {
				service,
				agentRepository,
				taskSnapshotRepository,
				agentTaskRepository,
				skillRefs: refsService,
			} = makeService();
			const activeVersion = makeHistory({
				versionId: 'published-v1',
				schema: { ...schema, skills: skillRefs },
			});
			const agent = makeAgent({
				versionId: 'draft-v2',
				activeVersionId: 'published-v1',
				activeVersion,
				schema: { ...schema, skills: [{ type: 'skill', id: 'draft_only' }] },
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			taskSnapshotRepository.findByVersionId.mockResolvedValue([]);
			agentTaskRepository.replaceForAgent.mockResolvedValue(false);
			// The published version ran these skill versions.
			refsService.versionPins.set('published-v1', { zeta: 'zeta-v1', mid: 'mid-v3' });

			await service.revertToPublishedAgent(agentId, projectId, user, 'user');

			// The draft gets the refs back, each pinned to the version that was published.
			const pinned = [
				{ type: 'skill', id: 'zeta', versionId: 'zeta-v1' },
				{ type: 'skill', id: 'mid', versionId: 'mid-v3' },
			];
			await expect(refsService.refsForDraft(agent, {})).resolves.toEqual(pinned);
			const [[, saveCtx]] = agentRepository.saveDraftFenced.mock.calls;
			const [[written, version, refs, refsCtx]] = refsService.restoreDraftRefs.mock.calls;
			expect(refsCtx).toBe(saveCtx);
			expect(written).toBe(agent);
			expect(version).toBe(activeVersion);
			expect(refs).toEqual(skillRefs);
		});

		it('shows the skill refs of a version in its document', async () => {
			const { service, agentRepository, agentHistoryRepository, taskSnapshotRepository } =
				makeService();
			const version = makeHistory({
				versionId: 'old-version',
				schema: { ...schema, skills: skillRefs },
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ schema: { ...schema, skills: [] } }),
			);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(version);
			taskSnapshotRepository.findByVersionId.mockResolvedValue([]);

			const { definition } = await service.getVersion(agentId, projectId, 'old-version');

			expect(definition.schema?.skills).toEqual(skillRefs);
		});
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

		await expect(service.listVersions(agentId, projectId, 20, 0)).resolves.toEqual([
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

	it('rejects a competing publication without changing the draft', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			telemetry,
			eventService,
			agentUpdateBroadcaster,
			ctx,
		} = makeService();
		const agent = makeAgent({ revision: 3, publicationRevision: 5 });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentRepository.setActiveVersionFenced.mockResolvedValue(false);

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Agent publication changed concurrently; please retry',
		);

		expect(agentRepository.setActiveVersionFenced).toHaveBeenCalledWith(agentId, 5, versionId, ctx);
		expect(agentHistoryRepository.saveVersion).toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBeNull();
		expect(agent.activeVersion).toBeNull();
		expect(agent.versionId).toBe(versionId);
		expect(agent.revision).toBe(3);
	});

	it('conflicts when a second publish races the same agent', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			telemetry,
			eventService,
			agentUpdateBroadcaster,
		} = makeService();
		const agent = makeAgent({ revision: 1 });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(
			makeHistory({ versionId: 'v1' }),
		);
		agentRepository.setActiveVersionFenced.mockResolvedValue(false);

		await expect(service.publishAgent(agentId, projectId, user, byUser, 'v1')).rejects.toThrow(
			'Agent publication changed concurrently; please retry',
		);

		// Republishing an existing snapshot skips the draft save, so the only
		// write attempted is the fenced UPDATE — which lost. The in-memory
		// entity must stay on the pre-publish active version.
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBeNull();
		expect(agent.versionId).toBe(versionId);
		expect(agent.revision).toBe(1);
	});

	it('conflicts when a concurrent publish already inserted the same draft version snapshot', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			telemetry,
			eventService,
			agentUpdateBroadcaster,
		} = makeService();
		const agent = makeAgent({ revision: 2 });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		// Both racers share the draft's versionId as the history primary key,
		// so the loser collides on the insert before reaching the fence.
		agentHistoryRepository.saveVersion.mockRejectedValue(
			new QueryFailedError(
				'insert',
				undefined,
				Object.assign(new Error('duplicate key'), { code: '23505' }),
			),
		);

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow(
			'Agent publication changed concurrently; please retry',
		);

		expect(agentRepository.setActiveVersionFenced).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBeNull();
		expect(agent.revision).toBe(2);
	});

	it('propagates non-unique-constraint failures from the draft snapshot insert as-is', async () => {
		const { service, agentRepository, agentHistoryRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
		agentHistoryRepository.saveVersion.mockRejectedValue(new Error('db down'));

		await expect(service.publishAgent(agentId, projectId, user, byUser)).rejects.toThrow('db down');
	});

	it('unpublish conflicts on a stale revision and skips telemetry', async () => {
		const { service, agentRepository, telemetry, eventService, agentUpdateBroadcaster } =
			makeService();
		const agent = makeAgent({ activeVersionId: 'v1', revision: 3 });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentRepository.setActiveVersionFenced.mockResolvedValue(false);

		await expect(service.unpublishAgent(agentId, projectId, user, 'user')).rejects.toThrow(
			'Agent publication changed concurrently; please retry',
		);

		// Losing the fence means the active version is left untouched and no
		// unpublish side effects or telemetry run.
		expect(telemetry.track).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalled();
		expect(agentUpdateBroadcaster.notify).not.toHaveBeenCalled();
		expect(agent.activeVersionId).toBe('v1');
	});

	it.each([undefined, versionId])(
		'rejects a stale caller revision before an idempotent publish of %s',
		async (targetVersionId) => {
			const { service, agentRepository, agentValidationService, transactionRunner, eventService } =
				makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ revision: 1, activeVersionId: versionId }),
			);

			await expect(
				service.publishAgent(agentId, projectId, user, byUser, targetVersionId, undefined, 0),
			).rejects.toBeInstanceOf(ConflictError);
			expect(agentValidationService.validateAgentEntityConfiguration).not.toHaveBeenCalled();
			expect(agentValidationService.validateAgentHistoryConfiguration).not.toHaveBeenCalled();
			expect(transactionRunner.run).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		},
	);

	it('passes the loaded revision as the fence expectation on publish', async () => {
		const { service, agentRepository, ctx } = makeService();
		const agent = makeAgent({ revision: 3, publicationRevision: 7 });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.publishAgent(agentId, projectId, user, byUser, undefined, undefined, 3);

		expect(agentRepository.setActiveVersionFenced).toHaveBeenCalledWith(agentId, 7, versionId, ctx);
		expect(agent.revision).toBe(3);
		expect(agent.publicationRevision).toBe(8);
		expect(agent.activeVersionId).toBe(versionId);
	});
	describe('version metadata', () => {
		it('writes publication labels inside the publication transaction', async () => {
			const { service, agentRepository, agentHistoryRepository, ctx } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeHistory());
			const metadata = { name: 'Release', description: 'Ready for support' };
			await service.publishAgent(
				agentId,
				projectId,
				user,
				byUser,
				versionId,
				undefined,
				undefined,
				metadata,
			);
			expect(agentHistoryRepository.updateMetadata).toHaveBeenCalledWith(
				agentId,
				versionId,
				metadata,
				ctx,
			);
		});

		it('keeps labels when publication fails validation', async () => {
			const { service, agentRepository, agentHistoryRepository, agentValidationService } =
				makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeHistory());
			agentValidationService.validateAgentHistoryConfiguration.mockResolvedValue({
				status: 'invalid',
				issues: [],
			});
			await expect(
				service.publishAgent(agentId, projectId, user, byUser, versionId, undefined, undefined, {
					name: 'Release',
				}),
			).rejects.toThrow();
			expect(agentHistoryRepository.updateMetadata).not.toHaveBeenCalled();
		});

		it('edits active version labels without another publication', async () => {
			const { service, agentRepository, agentHistoryRepository, publishHistory } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ activeVersionId: versionId }),
			);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(makeHistory());
			await service.publishAgent(
				agentId,
				projectId,
				user,
				byUser,
				versionId,
				undefined,
				undefined,
				{
					name: null,
				},
			);
			expect(agentHistoryRepository.updateMetadata).toHaveBeenCalledWith(agentId, versionId, {
				name: null,
			});
			expect(publishHistory.record).not.toHaveBeenCalled();
			expect(agentRepository.setActiveVersionFenced).not.toHaveBeenCalled();
		});

		it('does not edit another Agent version', async () => {
			const { service, agentRepository, agentHistoryRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(null);
			await expect(
				service.updateVersionMetadata(agentId, projectId, 'other-version', { name: 'Release' }),
			).rejects.toThrow(NotFoundError);
			expect(agentHistoryRepository.updateMetadata).not.toHaveBeenCalled();
		});
	});

	describe('publication timeline', () => {
		const event = (id: number, overrides: Partial<AgentPublishHistory> = {}): AgentPublishHistory =>
			({
				id,
				agentId,
				versionId,
				event: 'activated',
				author: 'Ada',
				isLegacy: false,
				createdAt: new Date(`2026-01-0${id}T00:00:00Z`),
				...overrides,
			}) as AgentPublishHistory;
		it('keeps repeated publications and bounds each period by the next event', async () => {
			const { service, agentRepository, publishHistory } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ activeVersionId: versionId }),
			);
			publishHistory.list.mockResolvedValue([
				event(3),
				event(2, { event: 'deactivated' }),
				event(1),
			]);
			const rows = await service.listPublishHistory(agentId, projectId, 20, 0);
			expect(rows.map(({ isActive, endedAt }) => ({ isActive, endedAt }))).toEqual([
				{ isActive: true, endedAt: null },
				{ isActive: false, endedAt: '2026-01-03T00:00:00.000Z' },
				{ isActive: false, endedAt: '2026-01-02T00:00:00.000Z' },
			]);
		});
		it('loads the preceding event across page boundaries and leaves legacy durations unknown', async () => {
			const { service, agentRepository, publishHistory } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ activeVersionId: versionId }),
			);
			publishHistory.list
				.mockResolvedValueOnce([event(3), event(2), event(1, { isLegacy: true })])
				.mockResolvedValueOnce([event(4)]);
			const rows = await service.listPublishHistory(agentId, projectId, 2, 2);
			expect(publishHistory.list).toHaveBeenNthCalledWith(1, agentId, 3, 1, {});
			expect(rows).toMatchObject([
				{ id: 2, isActive: false, endedAt: '2026-01-03T00:00:00.000Z' },
				{ id: 1, isActive: false, endedAt: null },
			]);
		});
	});

	it('checks the caller revision and uses the publication revision to unpublish', async () => {
		const { service, agentRepository, ctx } = makeService();
		const agent = makeAgent({ revision: 3, publicationRevision: 7, activeVersionId: versionId });
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await service.unpublishAgent(agentId, projectId, user, 'user', undefined, 3);

		expect(agentRepository.setActiveVersionFenced).toHaveBeenCalledWith(agentId, 7, null, ctx);
		expect(agent.revision).toBe(3);
		expect(agent.publicationRevision).toBe(8);
	});

	it.each([null, versionId])(
		'rejects a stale caller revision before unpublishing %s',
		async (activeVersionId) => {
			const { service, agentRepository, transactionRunner, eventService } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ revision: 1, activeVersionId }),
			);

			await expect(
				service.unpublishAgent(agentId, projectId, user, 'user', undefined, 0),
			).rejects.toBeInstanceOf(ConflictError);
			expect(transactionRunner.run).not.toHaveBeenCalled();
			expect(eventService.emit).not.toHaveBeenCalled();
		},
	);
});
