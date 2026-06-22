/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */
import { type AgentJsonConfig } from '@n8n/api-types';
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
import type { JSONSchema7 } from 'json-schema';

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

describe('AgentExecutionOrchestratorService', () => {
	let service: AgentExecutionOrchestratorService;

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
		service = agentExecutionOrchestratorService;
		markSharedTestSetupAsUsed(
			makeAgent,
			makeAgentHistory,
			makeRuntimeReconstructionService,
			makeTaskSnapshot,
			mockProjectCredentials,
			mockAgentTaskService,
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

	describe('executeForChatPublished', () => {
		it('reconstructs from the published skill snapshot instead of the draft skill body', async () => {
			const publishedSkill = {
				name: 'Summarize Notes',
				description: 'Use when summarizing notes',
				instructions: 'Published instructions.',
			};
			const draftSkill = {
				...publishedSkill,
				instructions: 'Draft instructions.',
			};
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [{ type: 'skill', id: 'summarize_notes' }],
			};
			const agent = makeAgent({
				schema,
				skills: { summarize_notes: draftSkill },
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({
					schema,
					skills: { summarize_notes: publishedSkill },
					publishedById: userId,
				}),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			const reconstructSpy = jest
				.spyOn(runtimeCacheService as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: {}, toolRegistry: {} } as never);
			jest
				.spyOn(service as never, 'streamChatResponse')
				.mockImplementation(async function* () {} as never);

			await service
				.executeForChatPublished({
					agentId,
					projectId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
				})
				.next();

			expect(reconstructSpy.mock.calls[0][0]).toEqual(
				expect.objectContaining({
					skills: { summarize_notes: publishedSkill },
				}),
			);
		});

		it('passes resourceId (not n8n userId) to streamChatResponse', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const n8nPublisherId = 'n8n-user-publisher';
			const chatUserId = 'slack-user-abc';
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: n8nPublisherId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(runtimeCacheService as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: {}, toolRegistry: {} } as never);
			const streamSpy = jest
				.spyOn(service as never, 'streamChatResponse')
				.mockImplementation(async function* () {} as never);

			await service
				.executeForChatPublished({
					agentId,
					projectId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: chatUserId },
				})
				.next();

			const streamConfig = (streamSpy.mock.calls[0] as [{ memory: { resourceId: string } }])[0];
			expect(streamConfig.memory.resourceId).toBe(chatUserId);
			expect(streamConfig.memory.resourceId).not.toBe(n8nPublisherId);
		});

		it('does not pass an n8n telemetry userId to streamChatResponse', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: 'n8n-user-publisher' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(runtimeCacheService as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: {}, toolRegistry: {} } as never);
			const streamSpy = jest
				.spyOn(service as never, 'streamChatResponse')
				.mockImplementation(async function* () {} as never);

			await service
				.executeForChatPublished({
					agentId,
					projectId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'platform-user-1' },
				})
				.next();

			const streamConfig = (streamSpy.mock.calls[0] as [{ userId?: string }])[0];
			expect(streamConfig.userId).toBeUndefined();
		});
	});

	describe('executeForChat', () => {
		it('passes the authenticated n8n userId to streamChatResponse for telemetry attribution', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({ schema });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(runtimeCacheService as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: {}, toolRegistry: {} } as never);
			const streamSpy = jest
				.spyOn(service as never, 'streamChatResponse')
				.mockImplementation(async function* () {} as never);

			await service
				.executeForChat({
					agentId,
					projectId,
					message: 'hello',
					userId,
					memory: { threadId: 'thread-1', resourceId: userId },
				})
				.next();

			const streamConfig = (streamSpy.mock.calls[0] as [{ userId?: string }])[0];
			expect(streamConfig.userId).toBe(userId);
		});
	});

	describe('streamChatResponse', () => {
		type StreamChatResponse = {
			streamChatResponse: (config: unknown) => AsyncGenerator<{ type: string }>;
		};

		function makeStream(chunks: object[]): ReadableStream {
			return new ReadableStream({
				start(controller) {
					for (const chunk of chunks) controller.enqueue(chunk);
					controller.close();
				},
			});
		}

		function makeFailingStream(error: Error): ReadableStream {
			let readCount = 0;
			return {
				getReader: () => ({
					read: jest.fn().mockImplementation(async () => {
						readCount++;
						if (readCount === 1) {
							return {
								done: false,
								value: { type: 'text-delta', id: 't1', delta: 'partial answer' },
							};
						}
						throw error;
					}),
					cancel: jest.fn(),
					releaseLock: jest.fn(),
				}),
			} as unknown as ReadableStream;
		}

		async function collectChunks(
			config: object,
		): Promise<Array<{ type: string; [k: string]: unknown }>> {
			const results: Array<{ type: string; [k: string]: unknown }> = [];
			for await (const chunk of (service as unknown as StreamChatResponse).streamChatResponse(
				config,
			)) {
				results.push(chunk);
			}
			return results;
		}

		it('yields max-iterations text chunks before the finish chunk when finishReason is length', async () => {
			const agentInstance = {
				name: 'test',
				stream: jest.fn().mockResolvedValue({
					runId: 'run-1',
					stream: makeStream([{ type: 'finish', finishReason: 'max-iterations' }]),
				}),
			};

			const chunks = await collectChunks({
				agentInstance,
				toolRegistry: new Map(),
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'user-1' },
				projectId,
			});

			const finishIdx = chunks.findIndex((c) => c.type === 'finish');
			const textDeltaIdx = chunks.findIndex((c) => c.type === 'text-delta');
			const textEndIdx = chunks.findIndex((c) => c.type === 'text-end');

			expect(textDeltaIdx).toBeGreaterThan(-1);
			expect(textDeltaIdx).toBeLessThan(finishIdx);
			expect(textEndIdx).toBeLessThan(finishIdx);

			const delta = chunks[textDeltaIdx] as { type: string; delta: string };
			expect(delta.delta).toContain('maximum number of iterations');
		});

		it('does not yield max-iterations chunks when finishReason is not length', async () => {
			const agentInstance = {
				name: 'test',
				stream: jest.fn().mockResolvedValue({
					runId: 'run-1',
					stream: makeStream([{ type: 'finish', finishReason: 'stop' }]),
				}),
			};

			const chunks = await collectChunks({
				agentInstance,
				toolRegistry: new Map(),
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'user-1' },
				projectId,
			});

			expect(chunks.every((c) => c.type !== 'text-delta')).toBe(true);
		});

		it('records the first user message when the stream is stopped after suspension', async () => {
			const agentInstance = {
				name: 'test',
				stream: jest.fn().mockResolvedValue({
					runId: 'run-1',
					stream: makeStream([
						{
							type: 'tool-call-suspended',
							toolCallId: 'tool-call-1',
							toolName: 'approve',
						},
					]),
				}),
			};

			const stream = (service as unknown as StreamChatResponse).streamChatResponse({
				agentInstance,
				toolRegistry: new Map(),
				agentId,
				message: 'hello',
				memory: { threadId: 'thread-1', resourceId: 'user-1' },
				projectId,
			});

			const first = await stream.next();
			expect(first.value.type).toBe('tool-call-suspended');
			await stream.return(undefined);

			expect(agentExecutionService.recordMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					threadId: 'thread-1',
					userMessage: 'hello',
					hitlStatus: 'suspended',
				}),
			);
		});

		it('records a failed execution when the stream reader errors before finish', async () => {
			const streamError = new Error('reader failed while consuming stream');
			const agentInstance = {
				name: 'test',
				stream: jest.fn().mockResolvedValue({
					runId: 'run-1',
					stream: makeFailingStream(streamError),
				}),
			};

			await expect(
				collectChunks({
					agentInstance,
					toolRegistry: new Map(),
					agentId,
					message: 'hello',
					memory: { threadId: 'thread-1', resourceId: 'user-1' },
					projectId,
				}),
			).rejects.toThrow('reader failed while consuming stream');

			expect(agentExecutionService.recordMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					threadId: 'thread-1',
					agentId,
					userMessage: 'hello',
					record: expect.objectContaining({
						assistantResponse: 'partial answer',
						finishReason: 'error',
						error: 'reader failed while consuming stream',
					}),
				}),
			);
		});
	});

	describe('executeForWorkflow', () => {
		const outputSchema: JSONSchema7 = {
			type: 'object',
			properties: { answer: { type: 'string' } },
			required: ['answer'],
		};

		const makeErrorChunkStream = (errorMessage: string) => {
			const chunks = [{ type: 'error', error: new Error(errorMessage) }];
			let idx = 0;
			return jest.fn().mockResolvedValue({
				stream: {
					getReader: () => ({
						read: jest
							.fn()
							.mockImplementation(async () =>
								idx < chunks.length
									? { done: false, value: chunks[idx++] }
									: { done: true, value: undefined },
							),
						releaseLock: jest.fn(),
					}),
				},
			});
		};

		const setupErroringAgent = (errorMessage: string) => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: userId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			Container.set(CredentialsService, mock<CredentialsService>());

			jest.spyOn(runtimeCacheService as never, 'reconstructFromConfig').mockResolvedValue({
				agent: {
					name: 'Test Agent',
					structuredOutput: jest.fn(),
					stream: makeErrorChunkStream(errorMessage),
					close: jest.fn(),
				},
				toolRegistry: {},
			} as never);
		};

		it('passes execution-scoped persistence for workflow executions', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				memory: {
					enabled: true,
					storage: 'n8n',
					episodicMemory: {
						enabled: true,
						credential: 'cred-1',
					},
				},
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: userId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			Container.set(CredentialsService, mock<CredentialsService>());

			const releaseLock = jest.fn();
			const stream = jest.fn().mockResolvedValue({
				stream: {
					getReader: () => ({
						read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
						releaseLock,
					}),
				},
			});
			jest.spyOn(service as never, 'compileIsolated').mockResolvedValue({
				ok: true,
				agent: { name: 'Test Agent', stream, close: jest.fn().mockResolvedValue(undefined) },
			} as never);

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
			);

			expect(stream).toHaveBeenCalledWith(
				'hello',
				expect.objectContaining({
					persistence: { resourceId: 'execution-1', threadId: 'thread-1' },
				}),
			);
			expect(releaseLock).toHaveBeenCalled();
		});

		it('passes the explicit workflow userId to the execution counter', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: 'publisher-user' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			Container.set(CredentialsService, mock<CredentialsService>());

			const stream = jest.fn().mockResolvedValue({
				stream: {
					getReader: () => ({
						read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
						releaseLock: jest.fn(),
					}),
				},
			});
			jest.spyOn(service as never, 'compileIsolated').mockResolvedValue({
				ok: true,
				agent: { name: 'Test Agent', stream },
			} as never);

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				userId,
			);

			const streamOptions = stream.mock.calls[0][1] as {
				executionCounter: { incrementMessageCount: () => void };
			};

			streamOptions.executionCounter.incrementMessageCount();

			expect(telemetry.trackAgentExecution).toHaveBeenCalledWith({
				agent_id: agentId,
				user_id: userId,
				message_count: 1,
			});
		});

		it('applies a per-call output schema to the compiled agent', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: userId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			Container.set(CredentialsService, mock<CredentialsService>());

			const structuredOutput = jest.fn();
			const stream = jest.fn().mockResolvedValue({
				stream: {
					getReader: () => ({
						read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
						releaseLock: jest.fn(),
					}),
				},
			});
			// Spy reconstructFromConfig so the real compileIsolated runs and applies
			// the per-call schema to the builder before it is returned.
			jest.spyOn(runtimeCacheService as never, 'reconstructFromConfig').mockResolvedValue({
				agent: { name: 'Test Agent', structuredOutput, stream, close: jest.fn() },
				toolRegistry: {},
			} as never);

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				userId,
				true,
				outputSchema,
			);

			expect(structuredOutput).toHaveBeenCalledWith(outputSchema);
		});

		it('does not set an output schema when none is provided', async () => {
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: userId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			Container.set(CredentialsService, mock<CredentialsService>());

			const structuredOutput = jest.fn();
			const stream = jest.fn().mockResolvedValue({
				stream: {
					getReader: () => ({
						read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
						releaseLock: jest.fn(),
					}),
				},
			});
			jest.spyOn(runtimeCacheService as never, 'reconstructFromConfig').mockResolvedValue({
				agent: { name: 'Test Agent', structuredOutput, stream, close: jest.fn() },
				toolRegistry: {},
			} as never);

			await service.executeForWorkflow(
				agentId,
				'hello',
				'execution-1',
				'thread-1',
				userId,
				projectId,
				userId,
				true,
			);

			expect(structuredOutput).not.toHaveBeenCalled();
		});

		it('surfaces an actionable error when structured output fails', async () => {
			setupErroringAgent('No output generated. Check the stream for errors.');

			await expect(
				service.executeForWorkflow(
					agentId,
					'hello',
					'execution-1',
					'thread-1',
					userId,
					projectId,
					userId,
					true,
					outputSchema,
				),
			).rejects.toThrow('structured output');
		});

		it('falls back to the generic error when the failure is unrelated to structured output', async () => {
			setupErroringAgent('Model credential is invalid');

			await expect(
				service.executeForWorkflow(
					agentId,
					'hello',
					'execution-1',
					'thread-1',
					userId,
					projectId,
					userId,
					true,
					outputSchema,
				),
			).rejects.toThrow('Agent execution failed: Model credential is invalid');
		});
	});

	describe('getConversationHistory', () => {
		it('returns the user-visible transcript from execution history', async () => {
			agentExecutionService.getThreadDetail.mockResolvedValue({
				thread: { id: 'thread-1' },
				executions: [
					{
						id: 'execution-1',
						userMessage: 'Hello',
						assistantResponse: 'Hi there',
						error: null,
					},
				],
			} as never);

			const result = await service.getConversationHistory({
				threadId: 'thread-1',
				projectId,
				agentId,
			});

			expect(agentExecutionService.getThreadDetail).toHaveBeenCalledWith(
				'thread-1',
				projectId,
				agentId,
			);
			expect(memoryBackend.getMessages).not.toHaveBeenCalled();
			expect(result).toEqual([
				{
					id: 'execution-1:user',
					role: 'user',
					content: [{ type: 'text', text: 'Hello' }],
				},
				{
					id: 'execution-1:assistant',
					role: 'assistant',
					content: [{ type: 'text', text: 'Hi there' }],
				},
			]);
		});

		it('returns null when the requested thread is not in the agent project', async () => {
			agentExecutionService.getThreadDetail.mockResolvedValue(null);

			const result = await service.getConversationHistory({
				threadId: 'thread-1',
				projectId,
				agentId,
			});

			expect(result).toBeNull();
		});
	});

	describe('resumeForChat', () => {
		it('does not use n8n userId as resourceId — resume passes no resourceId to agentInstance.resume', async () => {
			const n8nPublisherId = 'n8n-user-publisher';
			const runId = 'run-abc';
			const toolCallId = 'tool-xyz';
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: n8nPublisherId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			// Configure the named checkpoint storage mock injected in beforeEach
			n8nCheckpointStorage.getStatus.mockResolvedValue({
				status: 'ok',
				checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
			} as never);

			const mockAgentInstance = {
				name: 'Test Agent',
				resume: jest.fn().mockResolvedValue({
					stream: {
						getReader: () => ({
							read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
							releaseLock: jest.fn(),
						}),
					},
				}),
			};

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(runtimeCacheService as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: mockAgentInstance, toolRegistry: {} } as never);

			await service
				.resumeForChat({ agentId, projectId, runId, toolCallId, resumeData: { value: 'yes' } })
				.next();

			// resume() takes runId and toolCallId — no resourceId or userId is passed
			expect(mockAgentInstance.resume).toHaveBeenCalledWith(
				'stream',
				{ value: 'yes' },
				expect.objectContaining({
					runId,
					toolCallId,
					executionCounter: expect.any(Object),
				}),
			);
			// The n8n publisher ID must not appear in the resume args
			const resumeArgs = mockAgentInstance.resume.mock.calls[0];
			const resumeOptions = resumeArgs[2] as Record<string, unknown>;
			expect(resumeOptions).not.toHaveProperty('resourceId');
			expect(JSON.stringify(resumeArgs)).not.toContain(n8nPublisherId);
		});

		it('keeps the execution counter unattributed for integration resume traffic', async () => {
			const n8nPublisherId = 'n8n-user-publisher';
			const runId = 'run-abc';
			const toolCallId = 'tool-xyz';
			const schema: AgentJsonConfig = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			};
			const agent = makeAgent({
				schema,
				activeVersionId: versionId,
				activeVersion: makeAgentHistory({ schema, publishedById: n8nPublisherId }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			n8nCheckpointStorage.getStatus.mockResolvedValue({
				status: 'ok',
				checkpoint: { persistence: { threadId: 'thread-1', resourceId: 'platform-user-1' } },
			} as never);

			const mockAgentInstance = {
				name: 'Test Agent',
				resume: jest.fn().mockResolvedValue({
					stream: {
						getReader: () => ({
							read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
							releaseLock: jest.fn(),
						}),
					},
				}),
			};

			jest.spyOn(service as never, 'createCredentialProvider').mockReturnValue(mock());
			jest
				.spyOn(runtimeCacheService as never, 'reconstructFromConfig')
				.mockResolvedValue({ agent: mockAgentInstance, toolRegistry: {} } as never);

			await service
				.resumeForChat({ agentId, projectId, runId, toolCallId, resumeData: { value: 'yes' } })
				.next();

			const resumeOptions = mockAgentInstance.resume.mock.calls[0][2] as {
				executionCounter: { incrementMessageCount: () => void };
			};

			resumeOptions.executionCounter.incrementMessageCount();

			expect(telemetry.trackAgentExecution).toHaveBeenCalledWith({
				agent_id: agentId,
				message_count: 1,
			});
		});
	});
});
