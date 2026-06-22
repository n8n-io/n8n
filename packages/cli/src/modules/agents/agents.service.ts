import {
	type Agent as RuntimeAgent,
	type BuiltAgent,
	type CredentialProvider,
	type StreamChunk,
	type ToolDescriptor,
} from '@n8n/agents';
import {
	type AgentIntegrationConfig,
	type AgentJsonConfig,
	type AgentSkill,
	type AgentSkillMutationResponse,
	type AgentVersionListItemDto,
	type ChatIntegrationDescriptor,
	type ListAgentsQueryDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig, GlobalConfig } from '@n8n/config';
import { In, ProjectRelationRepository, User } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { JSONSchema7 } from 'json-schema';
import type { ExecuteAgentData } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsService } from '@/credentials/credentials.service';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Telemetry } from '@/telemetry';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentConfigService } from './agent-config.service';
import { AgentCustomToolsService } from './agent-custom-tools.service';
import {
	AgentExecutionOrchestratorService,
	type ExecuteForChatConfig,
	type ExecuteForChatPublishedConfig,
	type ExecuteForTaskNowConfig,
	type ExecuteForTaskPublishedConfig,
	type ResumeForChatConfig,
	type StreamChatResponseConfig,
} from './agent-execution-orchestrator.service';
import { AgentExecutionService } from './agent-execution.service';
import {
	AgentIntegrationPersistenceService,
	type SaveCredentialIntegrationOptions,
} from './agent-integration-persistence.service';
import { AgentKnowledgeService } from './agent-knowledge.service';
import { AgentPublishService, type PublishAgentOptions } from './agent-publish.service';
import { AgentRuntimeCacheService } from './agent-runtime-cache.service';
import { AgentRuntimeReconstructionService } from './agent-runtime-reconstruction.service';
import { AgentSkillsService } from './agent-skills.service';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentValidationService } from './agent-validation.service';
import { Agent } from './entities/agent.entity';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentHistoryRepository } from './repositories/agent-history.repository';
import { AgentTaskSnapshotRepository } from './repositories/agent-task-snapshot.repository';
import { AgentTaskRepository } from './repositories/agent-task.repository';
import { AgentRepository } from './repositories/agent.repository';
import type { ToolRegistry } from './tool-registry';
import { markAgentDraftDirty } from './utils/agent-draft.utils';

export { chatThreadId };
export type {
	ExecuteForChatConfig,
	ExecuteForChatPublishedConfig,
	ExecuteForTaskNowConfig,
	ExecuteForTaskPublishedConfig,
	ResumeForChatConfig,
	SaveCredentialIntegrationOptions,
	PublishAgentOptions,
};
export type { AgentMemoryScope } from './agent-execution-orchestrator.service';

@Service()
export class AgentsService {
	private readonly testChatService: AgentTestChatService;

	private readonly runtimeCacheService: AgentRuntimeCacheService;

	private readonly executionOrchestratorService: AgentExecutionOrchestratorService;

	private readonly validationService: AgentValidationService;

	private readonly configService: AgentConfigService;

	private readonly customToolsService: AgentCustomToolsService;

	private readonly integrationPersistenceService: AgentIntegrationPersistenceService;

	private readonly publishService: AgentPublishService;

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly n8nCheckpointStorage: N8NCheckpointStorage,
		private readonly n8nMemory: N8nMemory,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly agentHistoryRepository: AgentHistoryRepository,
		private readonly agentSkillsService: AgentSkillsService,
		private readonly agentTaskRepository: AgentTaskRepository,
		private readonly agentTaskSnapshotRepository: AgentTaskSnapshotRepository,
		private readonly publisher: Publisher,
		private readonly agentsConfig: AgentsConfig,
		private readonly globalConfig: GlobalConfig,
		private readonly telemetry: Telemetry,
		private readonly chatIntegrationService: ChatIntegrationService,
		private readonly agentKnowledgeService: AgentKnowledgeService,
		private readonly agentRuntimeReconstructionService: AgentRuntimeReconstructionService,
	) {
		this.testChatService = new AgentTestChatService(this.n8nMemory);
		this.runtimeCacheService = new AgentRuntimeCacheService(
			this.logger,
			this.agentRepository,
			this.publisher,
			this.globalConfig,
			this.agentRuntimeReconstructionService,
			{
				createCredentialProvider: (projectId) => this.createCredentialProvider(projectId),
				reconstructFromConfig: async (agentEntity, credentialProvider, userId, integrationType) =>
					await this.reconstructFromConfig(
						agentEntity,
						credentialProvider,
						userId,
						integrationType,
					),
			},
		);
		this.executionOrchestratorService = new AgentExecutionOrchestratorService(
			this.logger,
			this.agentRepository,
			this.n8nCheckpointStorage,
			this.agentExecutionService,
			this.telemetry,
			this.runtimeCacheService,
			{
				createCredentialProvider: (projectId) => this.createCredentialProvider(projectId),
				reconstructFromConfig: async (agentEntity, credentialProvider, userId, integrationType) =>
					await this.reconstructFromConfig(
						agentEntity,
						credentialProvider,
						userId,
						integrationType,
					),
				streamChatResponse: (config) => this.streamChatResponse(config),
				compileIsolated: async (agentEntity, credentialProvider, userId, outputSchema) =>
					await this.compileIsolated(agentEntity, credentialProvider, userId, outputSchema),
			},
		);
		this.validationService = new AgentValidationService(
			this.agentRepository,
			this.agentSkillsService,
		);
		this.configService = new AgentConfigService(
			this.logger,
			this.agentRepository,
			this.agentTaskRepository,
			this.agentSkillsService,
			this.agentsConfig,
			this.runtimeCacheService,
			{
				createCredentialProvider: (projectId) => this.createCredentialProvider(projectId),
				validateConfig: async (raw) => await this.validateConfig(raw),
			},
		);
		this.customToolsService = new AgentCustomToolsService(
			this.logger,
			this.agentRepository,
			this.runtimeCacheService,
		);
		this.integrationPersistenceService = new AgentIntegrationPersistenceService(
			this.agentRepository,
			this.chatIntegrationService,
			this.runtimeCacheService,
		);
		this.publishService = new AgentPublishService(
			this.logger,
			this.agentRepository,
			this.agentHistoryRepository,
			this.agentTaskSnapshotRepository,
			this.agentSkillsService,
			this.customToolsService,
			this.runtimeCacheService,
		);
	}

	/**
	 * Reconcile the local runtime cache when a peer main reports that an
	 * agent's configuration changed.
	 */
	@OnPubSubEvent('agent-config-changed', { instanceType: 'main' })
	handleAgentConfigChanged(payload: PubSubCommandMap['agent-config-changed']): void {
		this.runtimeCacheService.handleAgentConfigChanged(payload);
	}

	private clearRuntimes(agentId: string, options: { skipBroadcast?: boolean } = {}): void {
		this.runtimeCacheService.clearRuntimes(agentId, options);
	}

	/**
	 * Whether the agent knowledge base is enabled via Daytona sandbox env vars.
	 * Gates the file endpoints. Public so the controller can guard its file endpoints.
	 */
	isKnowledgeBaseEnabled(): boolean {
		return this.agentsConfig.sandboxEnabled && this.agentsConfig.sandboxProvider === 'daytona';
	}

	listChatIntegrations(): ChatIntegrationDescriptor[] {
		return this.integrationPersistenceService.listChatIntegrations();
	}

	async create(projectId: string, name: string): Promise<Agent> {
		const defaultConfig: AgentJsonConfig = {
			name,
			model: '',
			instructions: '',
			tools: [],
			skills: [],
		};

		const agent = this.agentRepository.create({
			name,
			projectId,
			schema: defaultConfig,
			versionId: uuid(),
		});

		const saved = await this.agentRepository.save(agent);

		this.logger.debug('Created SDK agent', { agentId: saved.id, projectId });

		return saved;
	}

	async findByProjectId(projectId: string): Promise<Agent[]> {
		return await this.agentRepository.findByProjectId(projectId);
	}

	async findByProjectIdPaginated(
		projectId: string,
		options: ListAgentsQueryDto,
	): Promise<{ count: number; data: Agent[] }> {
		return await this.agentRepository.findByProjectIdsPaginated([projectId], options);
	}

	async findById(agentId: string, projectId: string): Promise<Agent | null> {
		return await this.agentRepository.findByIdAndProjectId(agentId, projectId);
	}

	async updateName(agentId: string, projectId: string, name: string): Promise<Agent | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		agent.name = name;
		if (agent.schema) {
			agent.schema = { ...agent.schema, name };
		}
		markAgentDraftDirty(agent);
		const saved = await this.agentRepository.save(agent);
		this.logger.debug('Updated SDK agent name', { agentId, projectId, name });
		return saved;
	}

	async updateDescription(
		agentId: string,
		projectId: string,
		description: string,
		updatedAt?: string,
	): Promise<Agent | null> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return null;
		}

		if (updatedAt && agent.updatedAt.toISOString() !== updatedAt) {
			throw new ConflictError('Agent has been modified');
		}

		agent.description = description;
		if (agent.schema) {
			agent.schema = { ...agent.schema, description };
		}
		markAgentDraftDirty(agent);
		const saved = await this.agentRepository.save(agent);
		this.logger.debug('Updated SDK agent description', { agentId, projectId });
		return saved;
	}

	async findByUser(userId: string): Promise<Agent[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		if (projectIds.length === 0) return [];

		return await this.agentRepository.find({
			where: { projectId: In(projectIds) },
			order: { updatedAt: 'DESC' },
		});
	}

	async findByUserPaginated(
		userId: string,
		options: ListAgentsQueryDto,
	): Promise<{ count: number; data: Agent[] }> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);
		return await this.agentRepository.findByProjectIdsPaginated(projectIds, options);
	}

	async findPublishedByUser(userId: string): Promise<Agent[]> {
		const projectRelations = await this.projectRelationRepository.findAllByUser(userId);
		const projectIds = projectRelations.map((pr) => pr.projectId);

		if (projectIds.length === 0) return [];

		const agents = await this.agentRepository.find({
			where: { projectId: In(projectIds) },
			relations: { activeVersion: true },
			order: { updatedAt: 'DESC' },
		});

		return agents.filter((agent) => agent.activeVersionId !== null);
	}

	async publishAgent(
		agentId: string,
		projectId: string,
		user: User,
		versionId?: string,
		options: PublishAgentOptions = {},
	): Promise<Agent> {
		return await this.publishService.publishAgent(agentId, projectId, user, versionId, options);
	}

	async unpublishAgent(agentId: string, projectId: string): Promise<Agent> {
		return await this.publishService.unpublishAgent(agentId, projectId);
	}

	async revertToPublishedAgent(agentId: string, projectId: string): Promise<Agent> {
		return await this.publishService.revertToPublishedAgent(agentId, projectId);
	}

	async revertToVersion(agentId: string, projectId: string, versionId: string): Promise<Agent> {
		return await this.publishService.revertToVersion(agentId, projectId, versionId);
	}

	async hasPublishHistory(agentId: string): Promise<boolean> {
		return await this.publishService.hasPublishHistory(agentId);
	}

	async listPublishHistory(
		agentId: string,
		projectId: string,
		take: number,
		skip: number,
	): Promise<AgentVersionListItemDto[]> {
		return await this.publishService.listPublishHistory(agentId, projectId, take, skip);
	}

	async delete(agentId: string, projectId: string): Promise<boolean> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);

		if (!agent) {
			return false;
		}

		try {
			await this.agentKnowledgeService.deleteAllFilesForAgent(agentId);
		} catch (error) {
			this.logger.warn('Failed to delete knowledge files on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}
		await this.agentRepository.remove(agent);

		this.clearRuntimes(agentId);

		try {
			const { AgentTaskService } = await import('./agent-task.service');
			await Container.get(AgentTaskService).requestReconcile(agentId);
		} catch (error) {
			this.logger.warn('Failed to stop tasks on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		try {
			await this.testChatService.clearAllTestChatMessages(agentId);
		} catch (error) {
			this.logger.warn('Failed to clear test chat on agent delete', {
				agentId,
				error: error instanceof Error ? error.message : error,
			});
		}

		this.logger.debug('Deleted SDK agent', { agentId, projectId });

		return true;
	}

	async getConversationHistory(params: {
		threadId: string;
		projectId: string;
		agentId: string;
	}) {
		return await this.executionOrchestratorService.getConversationHistory(params);
	}

	/** Create a credential provider scoped to a project. */
	private createCredentialProvider(projectId: string): AgentsCredentialProvider {
		return new AgentsCredentialProvider(Container.get(CredentialsService), projectId);
	}

	async validateAgentIsRunnable(
		agentId: string,
		projectId: string,
		credentialProvider: CredentialProvider,
	): Promise<{ missing: string[] }> {
		return await this.validationService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
	}

	async *executeForChat(config: ExecuteForChatConfig): AsyncGenerator<StreamChunk> {
		yield* this.executionOrchestratorService.executeForChat(config);
	}

	async *resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk> {
		yield* this.executionOrchestratorService.resumeForChat(config);
	}

	async getTestChatMessages(agentId: string, userId: string) {
		return await this.testChatService.getTestChatMessages(agentId, userId);
	}

	async clearTestChatMessages(agentId: string, userId: string) {
		await this.testChatService.clearTestChatMessages(agentId, userId);
	}

	async clearAllTestChatMessages(agentId: string) {
		await this.testChatService.clearAllTestChatMessages(agentId);
	}

	async *executeForChatPublished(
		config: ExecuteForChatPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		yield* this.executionOrchestratorService.executeForChatPublished(config);
	}

	async *executeForTaskPublished(
		config: ExecuteForTaskPublishedConfig,
	): AsyncGenerator<StreamChunk> {
		yield* this.executionOrchestratorService.executeForTaskPublished(config);
	}

	async *executeForTaskNow(config: ExecuteForTaskNowConfig): AsyncGenerator<StreamChunk> {
		yield* this.executionOrchestratorService.executeForTaskNow(config);
	}

	private async *streamChatResponse(config: StreamChatResponseConfig): AsyncGenerator<StreamChunk> {
		yield* this.executionOrchestratorService.streamChatResponse(config);
	}

	private async compileIsolated(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		outputSchema?: JSONSchema7,
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		return await this.executionOrchestratorService.compileIsolated(
			agentEntity,
			credentialProvider,
			userId,
			outputSchema,
		);
	}

	async executeForWorkflow(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		userId: string,
		projectId: string,
		telemetryUserId?: string,
		useDraftVersion?: boolean,
		outputSchema?: JSONSchema7,
	): Promise<ExecuteAgentData> {
		return await this.executionOrchestratorService.executeForWorkflow(
			agentId,
			message,
			executionId,
			threadId,
			userId,
			projectId,
			telemetryUserId,
			useDraftVersion,
			outputSchema,
		);
	}

	async getConfig(agentId: string, projectId: string): Promise<AgentJsonConfig> {
		return await this.configService.getConfig(agentId, projectId);
	}

	async validateConfig(
		raw: unknown,
	): Promise<{ valid: true; config: AgentJsonConfig } | { valid: false; error: string }> {
		return await this.configService.validateConfig(raw);
	}

	async updateConfig(
		agentId: string,
		projectId: string,
		config: unknown,
	): Promise<{ config: AgentJsonConfig; updatedAt: string; versionId: string | null }> {
		return await this.configService.updateConfig(agentId, projectId, config);
	}

	async saveCredentialIntegration(
		agent: Agent,
		integration: AgentIntegrationConfig,
		options: SaveCredentialIntegrationOptions = {},
	): Promise<Agent> {
		return await this.integrationPersistenceService.saveCredentialIntegration(
			agent,
			integration,
			options,
		);
	}

	async removeCredentialIntegration(
		agent: Agent,
		type: string,
		credentialId: string,
	): Promise<Agent> {
		return await this.integrationPersistenceService.removeCredentialIntegration(
			agent,
			type,
			credentialId,
		);
	}

	async buildCustomTool(
		agentId: string,
		projectId: string,
		code: string,
		descriptor: ToolDescriptor,
	): Promise<{ ok: boolean; id: string; descriptor: ToolDescriptor }> {
		return await this.customToolsService.buildCustomTool(agentId, projectId, code, descriptor);
	}

	async listSkills(agentId: string, projectId: string): Promise<Record<string, AgentSkill>> {
		return await this.agentSkillsService.listSkills(agentId, projectId);
	}

	async getSkill(agentId: string, projectId: string, skillId: string): Promise<AgentSkill> {
		return await this.agentSkillsService.getSkill(agentId, projectId, skillId);
	}

	async createSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const result = await this.agentSkillsService.createSkill(agentId, projectId, skill);
		this.clearRuntimes(agentId);
		return result;
	}

	async createAndAttachSkill(
		agentId: string,
		projectId: string,
		skill: AgentSkill,
	): Promise<AgentSkillMutationResponse> {
		const result = await this.agentSkillsService.createAndAttachSkill(agentId, projectId, skill);
		this.clearRuntimes(agentId);
		return result;
	}

	async updateSkill(
		agentId: string,
		projectId: string,
		skillId: string,
		updates: Partial<AgentSkill>,
	): Promise<AgentSkillMutationResponse> {
		const result = await this.agentSkillsService.updateSkill(agentId, projectId, skillId, updates);
		this.clearRuntimes(agentId);
		return result;
	}

	async deleteCustomTool(agentId: string, projectId: string, toolId: string): Promise<void> {
		await this.customToolsService.deleteCustomTool(agentId, projectId, toolId);
	}

	async deleteSkill(agentId: string, projectId: string, skillId: string): Promise<void> {
		await this.agentSkillsService.deleteSkill(agentId, projectId, skillId);
		this.clearRuntimes(agentId);
	}

	private async reconstructFromConfig(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		integrationType?: string,
	): Promise<{ agent: RuntimeAgent; toolRegistry: ToolRegistry }> {
		return await this.runtimeCacheService.reconstructFromConfig(
			agentEntity,
			credentialProvider,
			userId,
			integrationType,
		);
	}
}
