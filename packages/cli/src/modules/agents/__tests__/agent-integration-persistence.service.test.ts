/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
import type { Logger } from '@n8n/backend-common';
import type { CustomFetch, HttpTransport, OutboundHttp } from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig, GlobalConfig } from '@n8n/config';
import type {
	User,
	CredentialsEntity,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowRunner } from '@/workflow-runner';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentConfigService } from '../agent-config.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentPublishService } from '../agent-publish.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { AgentSkillsService } from '../agent-skills.service';

import type { AgentTaskService } from '../agent-task.service';
import { AgentsService } from '../agents.service';
import { AgentTestChatService } from '../agent-test-chat.service';
import { AgentValidationService } from '../agent-validation.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent } from '../entities/agent.entity';
import {
	AgentChatIntegration,
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const versionId = 'v1';
type N8nMemoryImplementation = ReturnType<N8nMemory['getImplementation']>;
const testUser = { id: userId, firstName: 'Test', lastName: 'User' } as User;
const testUserAuthor = `${testUser.firstName} ${testUser.lastName}`;
let credentialsService: jest.Mocked<CredentialsService>;

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		versionId,
		schema: null,
		activeVersionId: null,
		activeVersion: null,
		integrations: [],
		tools: {},
		skills: {},
		updatedAt: new Date(),
		...overrides,
	} as unknown as Agent;
}

function makeAgentHistory(overrides: Partial<AgentHistory> = {}): AgentHistory {
	return {
		versionId,
		agentId,
		schema: null,
		tools: null,
		skills: null,
		publishedById: null,
		author: testUserAuthor,
		...overrides,
	} as unknown as AgentHistory;
}

function makeRuntimeReconstructionService(
	modules: string[] = [],
): AgentRuntimeReconstructionService {
	const transport = mock<HttpTransport>();
	transport.asCustomFetch.mockReturnValue(jest.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	return new AgentRuntimeReconstructionService(
		mock<Logger>(),
		mock<AgentRepository>(),
		mock<WorkflowRunner>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<UserRepository>(),
		mock<WorkflowFinderService>(),
		mock<UrlService>(),
		mock<N8NCheckpointStorage>(),
		mock<AgentSecureRuntime>(),
		mock<EphemeralNodeExecutor>(),
		mock<AgentsToolsService>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		{ modules } as unknown as AgentsConfig,
		outboundHttp,
	);
}

function makeTaskSnapshot(overrides: Partial<AgentTaskSnapshot> = {}): AgentTaskSnapshot {
	return {
		versionId: 'published-version-id',
		taskId: 'keep',
		enabled: true,
		name: 'Keep',
		objective: 'Keep objective',
		cronExpression: '0 9 * * *',
		...overrides,
	} as AgentTaskSnapshot;
}

function mockProjectCredentials(credentialIds: string[]): void {
	credentialsService.findAllCredentialIdsForProject.mockResolvedValue(
		credentialIds.map(
			(id) =>
				({
					id,
					name: id,
					type: 'openAiApi',
				}) as CredentialsEntity,
		),
	);
	credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
}

// Publish/unpublish/delete call into AgentTaskService via the DI container; the
// hooks await `requestReconcile(...)`, so the mock must resolve.
function mockAgentTaskService(): ReturnType<typeof mock<AgentTaskService>> {
	const taskService = mock<AgentTaskService>();
	taskService.requestReconcile.mockResolvedValue(undefined);
	taskService.registerEnabledForAgent.mockResolvedValue(undefined);
	return taskService;
}

function markSharedTestSetupAsUsed(...values: unknown[]) {
	return values.length;
}

describe('AgentIntegrationPersistenceService', () => {
	let service: AgentIntegrationPersistenceService;

	let agentRepository: jest.Mocked<AgentRepository>;
	let agentTaskRepository: jest.Mocked<AgentTaskRepository>;
	let agentTaskSnapshotRepository: jest.Mocked<AgentTaskSnapshotRepository>;
	let agentHistoryRepository: jest.Mocked<AgentHistoryRepository>;
	let n8nMemory: jest.Mocked<N8nMemory>;
	let memoryBackend: jest.Mocked<N8nMemoryImplementation>;
	let n8nCheckpointStorage: jest.Mocked<N8NCheckpointStorage>;
	let agentExecutionService: jest.Mocked<AgentExecutionService>;
	let chatIntegrationService: jest.Mocked<ChatIntegrationService>;
	let agentKnowledgeService: jest.Mocked<AgentKnowledgeService>;
	let publisher: jest.Mocked<Publisher>;
	let agentsConfig: AgentsConfig;
	let globalConfig: jest.Mocked<GlobalConfig>;
	let telemetry: jest.Mocked<Telemetry>;
	let runtimeCacheService: AgentRuntimeCacheService;
	let agentSkillsService: AgentSkillsService;
	let agentConfigService: AgentConfigService;
	let agentCustomToolsService: AgentCustomToolsService;
	let agentExecutionOrchestratorService: AgentExecutionOrchestratorService;
	let agentIntegrationPersistenceService: AgentIntegrationPersistenceService;
	let agentPublishService: AgentPublishService;
	let agentTestChatService: AgentTestChatService;
	let agentValidationService: AgentValidationService;
	let agentsService: AgentsService;

	beforeEach(() => {
		jest.clearAllMocks();

		agentRepository = mock<AgentRepository>();
		agentTaskRepository = mock<AgentTaskRepository>();
		agentTaskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
		agentTaskSnapshotRepository.findByVersionId.mockResolvedValue([]);
		agentHistoryRepository = mock<AgentHistoryRepository>();
		n8nMemory = mock<N8nMemory>();
		memoryBackend = mock<N8nMemoryImplementation>();
		n8nMemory.getImplementation.mockReturnValue(memoryBackend);
		n8nCheckpointStorage = mock<N8NCheckpointStorage>();
		agentExecutionService = mock<AgentExecutionService>();
		agentExecutionService.recordMessage.mockResolvedValue('exec-id');
		chatIntegrationService = mock<ChatIntegrationService>();
		agentKnowledgeService = mock<AgentKnowledgeService>();
		publisher = mock<Publisher>();
		publisher.publishCommand.mockResolvedValue();
		agentsConfig = {
			modules: [],
			sandboxEnabled: false,
			sandboxProvider: '',
		} as unknown as AgentsConfig;
		globalConfig = mock<GlobalConfig>({
			multiMainSetup: { enabled: false },
		} as Partial<GlobalConfig>);
		telemetry = mock<Telemetry>();
		const logger = mockLogger();

		credentialsService = mock<CredentialsService>();
		Container.set(CredentialsService, credentialsService);
		const projectRelationRepository = mock<ProjectRelationRepository>();
		const agentRuntimeReconstructionService = mock<AgentRuntimeReconstructionService>();

		runtimeCacheService = new AgentRuntimeCacheService(
			logger,
			agentRepository,
			publisher,
			globalConfig,
			agentRuntimeReconstructionService,
			credentialsService,
		);
		agentSkillsService = new AgentSkillsService(logger, agentRepository, runtimeCacheService);
		agentConfigService = new AgentConfigService(
			logger,
			agentRepository,
			agentTaskRepository,
			agentSkillsService,
			agentsConfig,
			runtimeCacheService,
			credentialsService,
		);
		agentCustomToolsService = new AgentCustomToolsService(
			logger,
			agentRepository,
			runtimeCacheService,
		);
		agentExecutionOrchestratorService = new AgentExecutionOrchestratorService(
			logger,
			agentRepository,
			n8nCheckpointStorage,
			agentExecutionService,
			telemetry,
			runtimeCacheService,
			credentialsService,
		);
		agentIntegrationPersistenceService = new AgentIntegrationPersistenceService(
			agentRepository,
			chatIntegrationService,
			runtimeCacheService,
		);
		agentPublishService = new AgentPublishService(
			logger,
			agentRepository,
			agentHistoryRepository,
			agentTaskSnapshotRepository,
			agentSkillsService,
			agentCustomToolsService,
			runtimeCacheService,
		);
		agentTestChatService = new AgentTestChatService(n8nMemory);
		agentValidationService = new AgentValidationService(agentRepository, agentSkillsService);
		agentsService = new AgentsService(
			logger,
			agentRepository,
			projectRelationRepository,
			agentsConfig,
			agentKnowledgeService,
			runtimeCacheService,
			agentTestChatService,
		);
		service = agentIntegrationPersistenceService;
		markSharedTestSetupAsUsed(
			projectId,
			makeAgent,
			makeAgentHistory,
			makeRuntimeReconstructionService,
			makeTaskSnapshot,
			mockProjectCredentials,
			mockAgentTaskService,
			agentConfigService,
			agentExecutionOrchestratorService,
			agentPublishService,
			agentValidationService,
			agentsService,
		);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('credential integrations', () => {
		it('marks a published agent dirty when saving a credential integration', async () => {
			const agent = makeAgent({
				versionId,
				activeVersionId: versionId,
				integrations: [],
			});
			agentRepository.save.mockResolvedValue(agent);

			await service.saveCredentialIntegration(agent, { type: 'slack', credentialId: 'cred-slack' });

			expect(agent.versionId).not.toBe(versionId);
			expect(agentRepository.save).toHaveBeenCalledWith(agent);
		});

		it('marks a published agent dirty when removing a credential integration', async () => {
			const agent = makeAgent({
				versionId,
				activeVersionId: versionId,
				integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
			});
			agentRepository.save.mockResolvedValue(agent);

			await service.removeCredentialIntegration(agent, 'slack', 'cred-slack');

			expect(agent.versionId).not.toBe(versionId);
			expect(agentRepository.save).toHaveBeenCalledWith(agent);
		});
	});

	describe('listChatIntegrations', () => {
		class TestIntegration extends AgentChatIntegration {
			readonly type = 'test-platform';
			readonly credentialTypes = ['testApi'];
			readonly displayLabel = 'Test Platform';
			readonly displayIcon = 'circle';
			readonly builderGuidance = {
				capabilities: ['Receive messages from Test Platform'],
				useIntegrationWhen: ['The agent should be chatted with from Test Platform'],
				useNodeToolWhen: ['Test Platform is only a backend API capability'],
			};
			async createAdapter(_ctx: AgentChatIntegrationContext): Promise<unknown> {
				return {};
			}
		}

		it('returns one descriptor per registered integration', () => {
			const registry = new ChatIntegrationRegistry();
			registry.register(new TestIntegration());
			Container.set(ChatIntegrationRegistry, registry);

			const result = service.listChatIntegrations();

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				type: 'test-platform',
				label: 'Test Platform',
				icon: 'circle',
				credentialTypes: ['testApi'],
				capabilities: ['Receive messages from Test Platform'],
				useIntegrationWhen: ['The agent should be chatted with from Test Platform'],
				useNodeToolWhen: ['Test Platform is only a backend API capability'],
			});
		});

		it('returns an empty array when no integrations are registered', () => {
			const registry = new ChatIntegrationRegistry();
			Container.set(ChatIntegrationRegistry, registry);

			expect(service.listChatIntegrations()).toEqual([]);
		});

		afterEach(() => {
			Container.reset();
		});
	});

	describe('saveCredentialIntegration', () => {
		it('appends a new credential integration to an empty list', async () => {
			const agent = makeAgent({ integrations: [] });
			agentRepository.save.mockImplementation(async (a) => a as Agent);

			const integration = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};

			await service.saveCredentialIntegration(agent, integration);

			expect(agentRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [integration],
				}),
			);
		});

		it('can persist a credential integration without broadcasting a live connect', async () => {
			const agent = makeAgent({ integrations: [] });
			agentRepository.save.mockImplementation(async (a) => a as Agent);
			const integration = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};

			await service.saveCredentialIntegration(agent, integration, { broadcast: false });

			expect(agentRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [integration],
				}),
			);
			expect(chatIntegrationService.broadcastIntegrationChange).not.toHaveBeenCalled();
		});

		it('replaces an existing integration with the same type+credentialId', async () => {
			const existing = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};
			const agent = makeAgent({ integrations: [existing] });
			agentRepository.save.mockImplementation(async (a) => a as Agent);

			const updated = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};

			await service.saveCredentialIntegration(agent, updated);

			expect(agentRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [updated],
				}),
			);
		});

		it('preserves other credential integrations when saving credential integrations', async () => {
			const telegram = {
				type: 'telegram' as const,
				credentialId: 'cred-tg',
			};
			const agent = makeAgent({ integrations: [telegram] });
			agentRepository.save.mockImplementation(async (a) => a as Agent);

			const slack = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};

			await service.saveCredentialIntegration(agent, slack);

			expect(agentRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [telegram, slack],
				}),
			);
		});

		it('rejects an integration missing credentialId', async () => {
			const agent = makeAgent({ integrations: [] });

			await expect(
				service.saveCredentialIntegration(agent, {
					type: 'slack',
				} as never),
			).rejects.toThrow(/Invalid credential integration/);
		});
	});

	describe('removeCredentialIntegration', () => {
		it('removes the matching credential integration', async () => {
			const slack = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};
			const telegram = {
				type: 'telegram' as const,
				credentialId: 'cred-tg',
			};
			const agent = makeAgent({ integrations: [slack, telegram] });
			agentRepository.save.mockImplementation(async (a) => a as Agent);

			await service.removeCredentialIntegration(agent, 'slack', 'cred-1');

			expect(agentRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [telegram],
				}),
			);
		});

		it('no-ops when integration does not exist', async () => {
			const agent = makeAgent({ integrations: [] });

			const result = await service.removeCredentialIntegration(agent, 'slack', 'cred-1');

			expect(agentRepository.save).not.toHaveBeenCalled();
			expect(result).toBe(agent);
		});

		it('preserves other credential integrations', async () => {
			const slack = {
				type: 'slack' as const,
				credentialId: 'cred-1',
			};
			const linear = {
				type: 'linear' as const,
				credentialId: 'cred-2',
			};
			const agent = makeAgent({ integrations: [slack, linear] });
			agentRepository.save.mockImplementation(async (a) => a as Agent);

			await service.removeCredentialIntegration(agent, 'slack', 'cred-1');

			expect(agentRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					integrations: [linear],
				}),
			);
		});
	});
});
