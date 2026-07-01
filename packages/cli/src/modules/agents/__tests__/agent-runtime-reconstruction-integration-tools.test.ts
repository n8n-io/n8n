import type { Mocked } from 'vitest';
import { type AgentJsonConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type {
	CustomFetch,
	HttpTransport,
	OutboundHttp,
	SsrfProtectionService,
} from '@n8n/backend-network';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig, GlobalConfig, SsrfProtectionConfig } from '@n8n/config';
import type {
	User,
	CredentialsEntity,
	ProjectRelationRepository,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { ActiveExecutions } from '@/active-executions';
import { CredentialsService } from '@/credentials/credentials.service';
import type { EphemeralNodeExecutor } from '@/node-execution';
import type { OauthService } from '@/oauth/oauth.service';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { AiService } from '@/services/ai.service';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AgentConfigService } from '../agent-config.service';
import { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentIntegrationPersistenceService } from '../agent-integration-persistence.service';
import type { AgentKnowledgeSandboxService } from '../agent-knowledge-sandbox.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import { AgentPublishService } from '../agent-publish.service';
import { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentRuntimeReconstructionService } from '../agent-runtime-reconstruction.service';
import { AgentSkillsService } from '../agent-skills.service';

import type { AgentTaskService } from '../agent-task.service';
import { AgentsService } from '../agents.service';
import { AgentTestChatService } from '../agent-test-chat.service';
import { AgentValidationService } from '../agent-validation.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationRegistry } from '../integrations/agent-chat-integration';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import { ChatIntegrationActionExecutor } from '../integrations/integration-action-executor';
import { ChatIntegrationContextQueryExecutor } from '../integrations/integration-context-query-executor';
import { IntegrationMessageContextService } from '../integrations/integration-message-context.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentFileRepository } from '../repositories/agent-file.repository';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentSecureRuntime } from '../runtime/agent-secure-runtime';
import { SubAgentForegroundRunner } from '../sub-agents/sub-agent-foreground-runner';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';
const versionId = 'v1';
type N8nMemoryImplementation = ReturnType<N8nMemory['getImplementation']>;
const testUser = { id: userId, firstName: 'Test', lastName: 'User' } as User;
const testUserAuthor = `${testUser.firstName} ${testUser.lastName}`;
let credentialsService: Mocked<CredentialsService>;

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
	transport.asCustomFetch.mockReturnValue(vi.fn() as unknown as CustomFetch);
	const outboundHttp = mock<OutboundHttp>();
	outboundHttp.transport.mockReturnValue(transport);
	return new AgentRuntimeReconstructionService(
		mock<Logger>(),
		mock<AgentRepository>(),
		mock<AgentFileRepository>(),
		mock<ActiveExecutions>(),
		mock<WorkflowRepository>(),
		mock<UserRepository>(),
		mock<WorkflowFinderService>(),
		mock<UrlService>(),
		mock<N8NCheckpointStorage>(),
		mock<AgentSecureRuntime>(),
		mock<EphemeralNodeExecutor>(),
		mock<N8nMemory>(),
		mock<OauthService>(),
		{ modules } as unknown as AgentsConfig,
		mock<AiService>(),
		outboundHttp,
		mock<AgentKnowledgeSandboxService>(),
		mock<SsrfProtectionConfig>({ enabled: true }),
		mock<SsrfProtectionService>(),
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

describe('AgentRuntimeReconstructionService integration tools', () => {
	let service: AgentExecutionOrchestratorService;

	let agentRepository: Mocked<AgentRepository>;
	let agentTaskRepository: Mocked<AgentTaskRepository>;
	let agentTaskSnapshotRepository: Mocked<AgentTaskSnapshotRepository>;
	let agentHistoryRepository: Mocked<AgentHistoryRepository>;
	let n8nMemory: Mocked<N8nMemory>;
	let memoryBackend: Mocked<N8nMemoryImplementation>;
	let n8nCheckpointStorage: Mocked<N8NCheckpointStorage>;
	let agentExecutionService: Mocked<AgentExecutionService>;
	let chatIntegrationService: Mocked<ChatIntegrationService>;
	let agentKnowledgeService: Mocked<AgentKnowledgeService>;
	let publisher: Mocked<Publisher>;
	let globalConfig: Mocked<GlobalConfig>;
	let telemetry: Mocked<Telemetry>;
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
		vi.clearAllMocks();

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
		globalConfig = mock<GlobalConfig>({
			multiMainSetup: { enabled: false },
		} as Partial<GlobalConfig>);
		telemetry = mock<Telemetry>();
		const logger = mockLogger();

		credentialsService = mock<CredentialsService>();
		Container.set(CredentialsService, credentialsService);
		const projectRelationRepository = mock<ProjectRelationRepository>();
		const agentRuntimeReconstructionService = mock<AgentRuntimeReconstructionService>();
		const chatIntegrationRegistry = mock<ChatIntegrationRegistry>();

		runtimeCacheService = new AgentRuntimeCacheService(
			logger,
			agentRepository,
			publisher,
			globalConfig,
			agentRuntimeReconstructionService,
			credentialsService,
		);
		Container.set(AgentRuntimeCacheService, runtimeCacheService);
		agentSkillsService = new AgentSkillsService(logger, agentRepository);
		agentConfigService = new AgentConfigService(
			logger,
			agentRepository,
			agentTaskRepository,
			agentSkillsService,
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
			agentRuntimeReconstructionService,
			mock<IntegrationMessageContextService>(),
		);
		agentIntegrationPersistenceService = new AgentIntegrationPersistenceService(
			agentRepository,
			chatIntegrationService,
			runtimeCacheService,
			chatIntegrationRegistry,
		);
		agentPublishService = new AgentPublishService(
			logger,
			agentRepository,
			agentHistoryRepository,
			agentTaskSnapshotRepository,
			agentCustomToolsService,
			runtimeCacheService,
		);
		agentTestChatService = new AgentTestChatService(n8nMemory);
		agentValidationService = new AgentValidationService(agentRepository, mock<AiService>());
		agentsService = new AgentsService(
			logger,
			agentRepository,
			projectRelationRepository,
			agentKnowledgeService,
			runtimeCacheService,
			agentTestChatService,
		);
		service = agentExecutionOrchestratorService;
		markSharedTestSetupAsUsed(
			makeAgent,
			makeAgentHistory,
			makeRuntimeReconstructionService,
			makeTaskSnapshot,
			mockProjectCredentials,
			mockAgentTaskService,
			service,
			agentConfigService,
			agentIntegrationPersistenceService,
			agentPublishService,
			agentValidationService,
			agentsService,
		);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('integration runtime tools', () => {
		beforeEach(() => {
			Container.set(SubAgentForegroundRunner, mock<SubAgentForegroundRunner>());
		});

		it('injects each credential integration context/action tool only once', async () => {
			const integrationRegistry = new ChatIntegrationRegistry();
			Container.set(ChatIntegrationRegistry, integrationRegistry);
			Container.set(IntegrationMessageContextService, mock<IntegrationMessageContextService>());
			Container.set(ChatIntegrationActionExecutor, mock<ChatIntegrationActionExecutor>());
			Container.set(
				ChatIntegrationContextQueryExecutor,
				mock<ChatIntegrationContextQueryExecutor>(),
			);

			const toolNames: string[] = [];
			const runtimeAgent = {
				tool: vi.fn((tool: { name?: string } | Array<{ name?: string }>) => {
					for (const item of Array.isArray(tool) ? tool : [tool]) {
						if (item.name) toolNames.push(item.name);
					}
				}),
				on: vi.fn(),
				hasCheckpointStorage: vi.fn().mockReturnValue(true),
				checkpoint: vi.fn(),
			};

			const reconstructionService = makeRuntimeReconstructionService();
			await (
				reconstructionService as unknown as {
					injectRuntimeDependencies(params: {
						agent: typeof runtimeAgent;
						agentId: string;
						projectId: string;
						credentialProvider: unknown;
						userId: string;
						runtimeProfile: 'top-level';
						config: AgentJsonConfig;
						subAgentDelegation: {
							sourcesById: Record<string, never>;
							availableSubAgents: [];
						};
						parentAgentIdForDelegation: string;
						credentialIntegrations: Array<{ type: string; credentialId: string }>;
					}): Promise<void>;
				}
			).injectRuntimeDependencies({
				agent: runtimeAgent,
				agentId,
				projectId,
				credentialProvider: mock(),
				userId: 'user-1',
				runtimeProfile: 'top-level',
				config: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
				},
				parentAgentIdForDelegation: agentId,
				subAgentDelegation: {
					sourcesById: {},
					availableSubAgents: [],
				},
				credentialIntegrations: [{ type: 'slack', credentialId: 'cred-slack' }],
			});

			expect(toolNames.filter((name) => name === 'slack_context')).toHaveLength(1);
			expect(toolNames.filter((name) => name === 'slack_action')).toHaveLength(1);
		});
	});
});
