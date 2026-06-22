/* eslint-disable @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
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
import { AgentTestChatService, chatThreadId } from '../agent-test-chat.service';
import { AgentValidationService } from '../agent-validation.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent } from '../entities/agent.entity';
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

describe('AgentTestChatService', () => {
	let service: AgentTestChatService;

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
		service = agentTestChatService;
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
			agentIntegrationPersistenceService,
			agentPublishService,
			agentValidationService,
			agentsService,
		);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('getTestChatMessages', () => {
		it('derives user-scoped fallback test-chat thread ids', () => {
			expect(chatThreadId(agentId, 'user-1')).toBe('test-agent-1:user-1');
			expect(chatThreadId(agentId, 'user-2')).toBe('test-agent-1:user-2');
			expect(chatThreadId(agentId, 'user-1')).not.toBe(chatThreadId(agentId, 'user-2'));
		});

		it('scopes the memory lookup to the caller via resourceId', async () => {
			memoryBackend.getMessages.mockResolvedValue([]);

			await service.getTestChatMessages(agentId, userId);

			expect(memoryBackend.getMessages).toHaveBeenCalledWith(chatThreadId(agentId, userId), {
				resourceId: `draft-chat:${userId}`,
			});
		});

		it('returns whatever memory returns for this user', async () => {
			const persisted = [{ id: 'm1' }, { id: 'm2' }];
			memoryBackend.getMessages.mockResolvedValue(persisted as never);

			const result = await service.getTestChatMessages(agentId, userId);

			expect(result).toBe(persisted);
		});
	});

	describe('clearTestChatMessages', () => {
		it('deletes the caller’s test-chat thread so derived memory is cleaned too', async () => {
			await service.clearTestChatMessages(agentId, userId);

			expect(memoryBackend.deleteThread).toHaveBeenCalledWith(chatThreadId(agentId, userId));
			expect(memoryBackend.deleteMessagesByThread).not.toHaveBeenCalled();
		});
	});

	describe('clearAllTestChatMessages', () => {
		it('deletes every message and the thread row itself', async () => {
			await service.clearAllTestChatMessages(agentId);

			expect(memoryBackend.deleteThreadsByPrefix).toHaveBeenCalledWith(chatThreadId(agentId));
			expect(memoryBackend.deleteMessagesByThread).toHaveBeenCalledWith(chatThreadId(agentId));
			// Second arg must be absent — undefined means "all users".
			expect(memoryBackend.deleteMessagesByThread.mock.calls[0]).toHaveLength(1);
			expect(memoryBackend.deleteThread).toHaveBeenCalledWith(chatThreadId(agentId));
		});
	});
});
