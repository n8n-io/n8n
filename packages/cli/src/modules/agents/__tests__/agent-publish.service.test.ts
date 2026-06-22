/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, id-denylist -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
import { type AgentIntegrationConfig, type AgentJsonConfig } from '@n8n/api-types';
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
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
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

import { AgentTaskService } from '../agent-task.service';
import { AgentsService } from '../agents.service';
import { AgentTestChatService } from '../agent-test-chat.service';
import { AgentValidationService } from '../agent-validation.service';
import type { AgentsToolsService } from '../agents-tools.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
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

describe('AgentPublishService', () => {
	let service: AgentPublishService;

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
		service = agentPublishService;
		markSharedTestSetupAsUsed(
			makeAgent,
			makeAgentHistory,
			makeRuntimeReconstructionService,
			makeTaskSnapshot,
			mockProjectCredentials,
			mockAgentTaskService,
			agentConfigService,
			agentExecutionOrchestratorService,
			agentIntegrationPersistenceService,
			agentValidationService,
			agentsService,
		);
	});

	afterEach(() => {
		Container.reset();
	});

	describe('publishAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
			// The publish hook awaits AgentTaskService.registerEnabledForAgent via the
			// DI container; provide a resolving mock so it doesn't instantiate the real
			// service (which needs a DataSource).
			Container.set(AgentTaskService, mockAgentTaskService());
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.publishAgent(agentId, projectId, testUser)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('calls saveVersion with the correct payload, using agent.versionId as the snapshot PK', async () => {
			const agent = makeAgent({ versionId });
			const history = makeAgentHistory();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(history);

			await service.publishAgent(agentId, projectId, testUser);

			expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
				{
					versionId,
					agentId: agent.id,
					schema: agent.schema,
					tools: null,
					skills: null,
					publishedBy: testUser,
				},
				mockTrx,
			);
			expect(agent.activeVersionId).toBe(versionId);
		});

		it('snapshots attached skill bodies when publishing', async () => {
			const skill = {
				name: 'Summarize Notes',
				description: 'Use when summarizing notes',
				instructions: 'Extract decisions and action items.',
			};
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					skills: [{ type: 'skill', id: 'summarize_notes' }],
				},
				skills: {
					summarize_notes: skill,
					unattached: {
						name: 'Unattached',
						description: 'Use when unattached',
						instructions: 'Do not snapshot.',
					},
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(makeAgentHistory());

			await service.publishAgent(agentId, projectId, testUser);

			expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
				expect.objectContaining({
					skills: {
						summarize_notes: skill,
					},
				}),
				mockTrx,
			);
		});

		it('snapshots configured task bodies when publishing', async () => {
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					tasks: [{ type: 'task', id: 'task-1', enabled: true }],
				},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(makeAgentHistory());
			const taskRepo = {
				findBy: jest.fn().mockResolvedValue([
					{
						id: 'task-1',
						name: 'Daily summary',
						objective: 'Summarize messages',
						cronExpression: '0 9 * * *',
					},
				]),
			};
			(mockTrx as typeof mockTrx & { getRepository: jest.Mock }).getRepository = jest
				.fn()
				.mockReturnValue(taskRepo);

			await service.publishAgent(agentId, projectId, testUser);

			expect(agentTaskSnapshotRepository.saveForVersion).toHaveBeenCalledWith(
				[
					{
						versionId,
						taskId: 'task-1',
						enabled: true,
						name: 'Daily summary',
						objective: 'Summarize messages',
						cronExpression: '0 9 * * *',
					},
				],
				mockTrx,
			);
		});

		it('rejects publishing when a configured skill body is missing', async () => {
			const agent = makeAgent({
				schema: {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
					skills: [{ type: 'skill', id: 'missing_skill' }],
				},
				skills: {},
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await expect(service.publishAgent(agentId, projectId, testUser)).rejects.toThrow(
				'Cannot publish agent with missing skill bodies: missing_skill',
			);
		});

		it('assigns a new versionId and uses it as the history PK when the agent has none', async () => {
			const agent = makeAgent({ versionId: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(makeAgentHistory());

			await service.publishAgent(agentId, projectId, testUser);

			expect(agent.versionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
			expect(agent.activeVersionId).toBe(agent.versionId);
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});

		it('returns the agent with activeVersion set to the saved snapshot', async () => {
			const agent = makeAgent();
			const history = makeAgentHistory();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(history);

			const result = await service.publishAgent(agentId, projectId, testUser);

			expect(result.activeVersion).toBe(history);
			expect(result).toBe(agent);
		});

		it('publish → unpublish → publish snapshots two distinct versions (regression)', async () => {
			// Reported as a UNIQUE constraint on agent_history.versionId when
			// the same agent went through publish/unpublish/publish without an
			// intervening edit.
			const agent = makeAgent({ versionId: 'v1' });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockImplementation(async (data) =>
				makeAgentHistory({ versionId: data.versionId }),
			);
			Container.set(ChatIntegrationService, mock<ChatIntegrationService>());
			Container.set(AgentTaskService, mockAgentTaskService());

			await service.publishAgent(agentId, projectId, testUser);
			expect(agent.activeVersionId).toBe('v1');

			await service.unpublishAgent(agentId, projectId);
			expect(agent.activeVersionId).toBeNull();
			expect(agent.versionId).not.toBe('v1');
			const bumpedVersionId = agent.versionId;

			await service.publishAgent(agentId, projectId, testUser);
			expect(agent.activeVersionId).toBe(bumpedVersionId);

			const savedVersionIds = agentHistoryRepository.saveVersion.mock.calls.map(
				([data]) => data.versionId,
			);
			expect(savedVersionIds).toEqual(['v1', bumpedVersionId]);
			expect(new Set(savedVersionIds).size).toBe(2);
		});

		it('is a no-op when the agent is already published at the current versionId', async () => {
			// Defends against the UNIQUE constraint that would fire on a
			// re-insert with the same PK. The publish button is gated in the
			// UI but the endpoint can be hit directly.
			const agent = makeAgent({
				versionId: 'v1',
				activeVersionId: 'v1',
				activeVersion: makeAgentHistory({ versionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.publishAgent(agentId, projectId, testUser);

			expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
			expect(agentHistoryRepository.findByVersionAndAgentId).not.toHaveBeenCalled();
			expect(mockTrx.save).not.toHaveBeenCalled();
			expect(result).toBe(agent);
			expect(agent.versionId).toBe('v1');
			expect(agent.activeVersionId).toBe('v1');
		});

		describe('with explicit versionId', () => {
			it('flips activeVersionId to an existing history row and bumps draft versionId', async () => {
				const agent = makeAgent({ versionId: 'v2', activeVersionId: 'v2' });
				const existingHistory = makeAgentHistory({ versionId: 'v1' });
				agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
				agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(existingHistory);

				await service.publishAgent(agentId, projectId, testUser, 'v1');

				expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledWith(
					'v1',
					agentId,
					mockTrx,
				);
				expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
				expect(agent.activeVersionId).toBe('v1');
				expect(agent.activeVersion).toBe(existingHistory);
				// Draft versionId was v2 (a history-row PK). Bumping to a fresh
				// UUID lets the next regular publish snapshot cleanly.
				expect(agent.versionId).not.toBe('v2');
				expect(agent.versionId).not.toBe('v1');
				expect(agent.versionId).toMatch(
					/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
				);
				expect(mockTrx.save).toHaveBeenCalledWith(agent);
			});

			it('is a no-op when the requested version is already active', async () => {
				const agent = makeAgent({ versionId: 'v1', activeVersionId: 'v1' });
				agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

				const result = await service.publishAgent(agentId, projectId, testUser, 'v1');

				expect(agentHistoryRepository.findByVersionAndAgentId).not.toHaveBeenCalled();
				expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
				expect(mockTrx.save).not.toHaveBeenCalled();
				expect(agent.versionId).toBe('v1');
				expect(agent.activeVersionId).toBe('v1');
				expect(result).toBe(agent);
			});

			it('throws NotFoundError when the versionId does not belong to the agent', async () => {
				agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ versionId: 'v2' }));
				agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(null);

				await expect(
					service.publishAgent(agentId, projectId, testUser, 'foreign-version'),
				).rejects.toThrow(NotFoundError);
				expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();
			});
		});

		it('connects persisted credential integrations after publishing', async () => {
			const integrations: AgentIntegrationConfig[] = [{ type: 'slack', credentialId: 'cred-1' }];
			const agent = makeAgent({ integrations });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(makeAgentHistory());

			const chatIntegrationService = mock<ChatIntegrationService>();
			chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
			Container.set(ChatIntegrationService, chatIntegrationService);

			await service.publishAgent(agentId, projectId, testUser);

			expect(chatIntegrationService.syncToConfig).toHaveBeenCalledWith(
				agent,
				[],
				[{ type: 'slack', credentialId: 'cred-1' }],
			);
		});

		it('does not call syncToConfig when no credential integrations are persisted', async () => {
			const agent = makeAgent({ integrations: [] });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(makeAgentHistory());

			const chatIntegrationService = mock<ChatIntegrationService>();
			chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
			Container.set(ChatIntegrationService, chatIntegrationService);

			await service.publishAgent(agentId, projectId, testUser);

			expect(chatIntegrationService.syncToConfig).not.toHaveBeenCalled();
		});

		it('can skip integration sync when publishing after an explicit integration connect', async () => {
			const agent = makeAgent({
				integrations: [{ type: 'slack', credentialId: 'cred-1' }],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.saveVersion.mockResolvedValue(makeAgentHistory());

			const chatIntegrationService = mock<ChatIntegrationService>();
			chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
			Container.set(ChatIntegrationService, chatIntegrationService);

			await service.publishAgent(agentId, projectId, testUser, undefined, {
				syncIntegrations: false,
			});

			expect(chatIntegrationService.syncToConfig).not.toHaveBeenCalled();
		});
	});

	describe('unpublishAgent', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
			// unpublishAgent lazy-imports ChatIntegrationService and calls disconnect via the
			// DI container — register a mock so Container.get doesn't try to construct the real
			// service (which would fail resolving DataSource in unit tests).
			Container.set(ChatIntegrationService, mock<ChatIntegrationService>());
			Container.set(AgentTaskService, mockAgentTaskService());
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.unpublishAgent(agentId, projectId)).rejects.toThrow(NotFoundError);
		});

		it('clears activeVersionId on the entity and saves the change', async () => {
			const agent = makeAgent({ activeVersionId: versionId, activeVersion: makeAgentHistory() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(agent.activeVersionId).toBeNull();
			expect(agent.activeVersion).toBeNull();
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});

		it('bumps versionId so the next publish gets a fresh history PK', async () => {
			// Without this bump, the just-released versionId (still occupied
			// by the snapshot row in agent_history) would collide on the next
			// publish — see "publish → unpublish → publish" regression.
			const agent = makeAgent({
				versionId: 'v1',
				activeVersionId: 'v1',
				activeVersion: makeAgentHistory({ versionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.unpublishAgent(agentId, projectId);

			expect(agent.versionId).not.toBe('v1');
			expect(agent.versionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it('returns the agent with activeVersion cleared', async () => {
			const agent = makeAgent({ activeVersionId: versionId, activeVersion: makeAgentHistory() });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.unpublishAgent(agentId, projectId);

			expect(result.activeVersionId).toBeNull();
			expect(result.activeVersion).toBeNull();
			expect(result).toBe(agent);
		});
	});

	describe('revertToPublishedAgent', () => {
		let mockTrx: { save: jest.Mock; getRepository: jest.Mock };
		let mockTransaction: jest.Mock;
		let taskRepo: { findBy: jest.Mock; delete: jest.Mock; update: jest.Mock; insert: jest.Mock };

		beforeEach(() => {
			taskRepo = {
				findBy: jest.fn().mockResolvedValue([]),
				delete: jest.fn(),
				update: jest.fn(),
				insert: jest.fn(),
			};
			mockTrx = { save: jest.fn(), getRepository: jest.fn().mockReturnValue(taskRepo) };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.revertToPublishedAgent(agentId, projectId)).rejects.toThrow(
				NotFoundError,
			);
		});

		it('throws ConflictError when the agent is not published', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ activeVersion: null }));

			await expect(service.revertToPublishedAgent(agentId, projectId)).rejects.toThrow(
				ConflictError,
			);
		});

		it('restores the draft fields from the published snapshot', async () => {
			const publishedSchema: AgentJsonConfig = {
				name: 'Published Agent',
				description: 'Published description',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'cred-published',
				instructions: 'Published instructions',
				tools: [{ type: 'custom', id: 'published_tool' }],
				skills: [{ type: 'skill', id: 'published_skill' }],
			};
			const publishedTools = {
				published_tool: {
					code: 'return "published";',
					descriptor: { name: 'published_tool' },
				},
			} as unknown as Agent['tools'];
			const publishedSkills = {
				published_skill: {
					name: 'Published skill',
					description: 'Published skill description',
					instructions: 'Published skill instructions',
				},
			};
			const activeVersion = makeAgentHistory({
				versionId: 'published-version-id',
				schema: publishedSchema,
				tools: publishedTools,
				skills: publishedSkills,
			});
			const agent = makeAgent({
				name: 'Draft Agent',
				description: 'Draft description',
				versionId: 'draft-version-id',
				schema: {
					name: 'Draft Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Draft instructions',
				},
				tools: {},
				skills: {},
				activeVersionId: 'published-version-id',
				activeVersion,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const result = await service.revertToPublishedAgent(agentId, projectId);

			expect(agent.schema).toEqual(publishedSchema);
			expect(agent.schema).not.toBe(publishedSchema);
			expect(agent.tools).toEqual(publishedTools);
			expect(agent.skills).toEqual(publishedSkills);
			expect(agent.versionId).toBe('published-version-id');
			expect(agent.name).toBe('Published Agent');
			expect(agent.description).toBe('Published description');
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
			expect(result).toBe(agent);
			expect(result.activeVersion).toBe(activeVersion);
		});

		it('reconciles draft task rows to match the published snapshot', async () => {
			const activeVersion = makeAgentHistory({
				versionId: 'published-version-id',
				schema: {
					name: 'A',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'i',
					tasks: [{ type: 'task', id: 'keep', enabled: true }],
				},
			});
			const agent = makeAgent({ activeVersionId: 'published-version-id', activeVersion });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentTaskSnapshotRepository.findByVersionId.mockResolvedValue([makeTaskSnapshot()]);
			// Draft has the published 'keep' row plus an 'added' row that isn't published.
			taskRepo.findBy.mockResolvedValue([{ id: 'keep' }, { id: 'added' }]);

			await service.revertToPublishedAgent(agentId, projectId);

			expect(taskRepo.delete).toHaveBeenCalledWith(['added']);
			expect(taskRepo.update).toHaveBeenCalledWith(
				'keep',
				expect.objectContaining({ objective: 'Keep objective' }),
			);
			expect(taskRepo.insert).not.toHaveBeenCalled();
		});
	});

	describe('revertToVersion', () => {
		let mockTrx: { save: jest.Mock };
		let mockTransaction: jest.Mock;

		beforeEach(() => {
			mockTrx = { save: jest.fn() };
			mockTransaction = jest.fn(
				async (cb: (trx: typeof mockTrx) => Promise<void>) => await cb(mockTrx),
			);
			Object.defineProperty(agentRepository, 'manager', {
				value: { transaction: mockTransaction },
				configurable: true,
			});
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.revertToVersion(agentId, projectId, 'v1')).rejects.toThrow(
				NotFoundError,
			);
			expect(agentHistoryRepository.findByVersionAndAgentId).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the version does not exist for the agent', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(null);

			await expect(service.revertToVersion(agentId, projectId, 'foreign-version')).rejects.toThrow(
				NotFoundError,
			);
			expect(agentHistoryRepository.findByVersionAndAgentId).toHaveBeenCalledWith(
				'foreign-version',
				agentId,
				mockTrx,
			);
			expect(mockTrx.save).not.toHaveBeenCalled();
		});

		it('restores the draft fields from the targeted snapshot and leaves activeVersionId untouched', async () => {
			const snapshotSchema: AgentJsonConfig = {
				name: 'Old Agent',
				description: 'Old description',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'cred-old',
				instructions: 'Old instructions',
				tools: [{ type: 'custom', id: 'old_tool' }],
				skills: [{ type: 'skill', id: 'old_skill' }],
			};
			const snapshotTools = {
				old_tool: {
					code: 'return "old";',
					descriptor: { name: 'old_tool' },
				},
			} as unknown as Agent['tools'];
			const snapshotSkills = {
				old_skill: {
					name: 'Old skill',
					description: 'Old skill description',
					instructions: 'Old skill instructions',
				},
			};
			const targetVersion = makeAgentHistory({
				versionId: 'v1',
				schema: snapshotSchema,
				tools: snapshotTools,
				skills: snapshotSkills,
			});
			const activeVersion = makeAgentHistory({ versionId: 'v2' });
			const agent = makeAgent({
				name: 'Current Agent',
				description: 'Current description',
				versionId: 'v3',
				schema: {
					name: 'Current Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Current instructions',
				},
				tools: {},
				skills: {},
				activeVersionId: 'v2',
				activeVersion,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(targetVersion);

			const result = await service.revertToVersion(agentId, projectId, 'v1');

			expect(agent.schema).toEqual(snapshotSchema);
			expect(agent.schema).not.toBe(snapshotSchema);
			expect(agent.tools).toEqual(snapshotTools);
			expect(agent.skills).toEqual(snapshotSkills);
			// Fresh UUID so the next publish snapshot doesn't collide with the
			// targeted history row's PK and doesn't fast-path past the revert.
			expect(agent.versionId).not.toBe('v1');
			expect(agent.versionId).not.toBe('v3');
			expect(agent.versionId).not.toBe(agent.activeVersionId);
			expect(agent.versionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			expect(agent.name).toBe('Old Agent');
			expect(agent.description).toBe('Old description');
			expect(agent.activeVersionId).toBe('v2');
			expect(agent.activeVersion).toBe(activeVersion);
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
			expect(result).toBe(agent);
		});

		it('reverts successfully when the agent is currently unpublished', async () => {
			const snapshotSchema: AgentJsonConfig = {
				name: 'Restored Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Restored instructions',
			};
			const targetVersion = makeAgentHistory({
				versionId: 'v1',
				schema: snapshotSchema,
				tools: {},
				skills: {},
			});
			const agent = makeAgent({ activeVersionId: null, activeVersion: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(targetVersion);

			await service.revertToVersion(agentId, projectId, 'v1');

			expect(agent.activeVersionId).toBeNull();
			expect(agent.versionId).not.toBe('v1');
			expect(agent.versionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
			);
			expect(agent.name).toBe('Restored Agent');
			expect(mockTrx.save).toHaveBeenCalledWith(agent);
		});
	});

	describe('listPublishHistory', () => {
		it('throws NotFoundError when the agent does not exist in the project', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.listPublishHistory(agentId, projectId, 20, 0)).rejects.toThrow(
				NotFoundError,
			);
			expect(agentHistoryRepository.findByAgentId).not.toHaveBeenCalled();
		});

		it('forwards take and skip to the repository', async () => {
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ activeVersionId: null }));
			agentHistoryRepository.findByAgentId.mockResolvedValue([]);

			await service.listPublishHistory(agentId, projectId, 5, 10);

			expect(agentHistoryRepository.findByAgentId).toHaveBeenCalledWith(agentId, 5, 10);
		});

		it('maps history rows to DTOs and marks the active version', async () => {
			const createdAt = new Date('2026-01-01T00:00:00.000Z');
			const updatedAt = new Date('2026-01-02T00:00:00.000Z');
			const activeRow = {
				versionId: 'v2',
				agentId,
				createdAt,
				updatedAt,
				author: 'Ada Lovelace',
			} as unknown as AgentHistory;
			const inactiveRow = {
				versionId: 'v1',
				agentId,
				createdAt,
				updatedAt,
				author: 'Unknown',
			} as unknown as AgentHistory;
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ activeVersionId: 'v2' }));
			agentHistoryRepository.findByAgentId.mockResolvedValue([activeRow, inactiveRow]);

			const result = await service.listPublishHistory(agentId, projectId, 20, 0);

			expect(result).toEqual([
				{
					versionId: 'v2',
					agentId,
					createdAt: createdAt.toISOString(),
					updatedAt: updatedAt.toISOString(),
					author: 'Ada Lovelace',
					isActive: true,
				},
				{
					versionId: 'v1',
					agentId,
					createdAt: createdAt.toISOString(),
					updatedAt: updatedAt.toISOString(),
					author: 'Unknown',
					isActive: false,
				},
			]);
		});

		it('marks every row as inactive when the agent is unpublished', async () => {
			const createdAt = new Date('2026-01-01T00:00:00.000Z');
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ activeVersionId: null }));
			agentHistoryRepository.findByAgentId.mockResolvedValue([
				{
					versionId: 'v1',
					agentId,
					createdAt,
					updatedAt: createdAt,
					author: 'Ada Lovelace',
				} as unknown as AgentHistory,
			]);

			const result = await service.listPublishHistory(agentId, projectId, 20, 0);

			expect(result[0].isActive).toBe(false);
		});
	});
});
