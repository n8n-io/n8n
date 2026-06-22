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

describe('AgentConfigService', () => {
	let service: AgentConfigService;

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
		service = agentConfigService;
		markSharedTestSetupAsUsed(
			makeAgent,
			makeAgentHistory,
			makeRuntimeReconstructionService,
			makeTaskSnapshot,
			mockProjectCredentials,
			mockAgentTaskService,
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

	describe('validateConfig', () => {
		it('rejects inputSchema on node tool configs', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				tools: [
					{
						type: 'node',
						name: 'http_request',
						description: 'Make an HTTP request to any URL',
						inputSchema: {
							type: 'object',
							properties: { url: { type: 'string' } },
							required: ['url'],
						},
						node: {
							nodeType: 'n8n-nodes-base.httpRequestTool',
							nodeTypeVersion: 4,
							nodeParameters: {
								method: 'GET',
								url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('url', 'The URL to request', 'string') }}",
								toolDescription: 'Make an HTTP request to any URL',
							},
						},
					},
				],
			});

			expect(result.valid).toBe(false);
			if (result.valid) return;

			expect(result.error).toContain('inputSchema');
		});

		it('rejects config.nodeTools.enabled when the node tools module is disabled', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				config: { nodeTools: { enabled: true } },
			});

			expect(result.valid).toBe(false);
			if (result.valid) return;

			expect(result.error).toContain('node-tools-searcher');
		});

		it('allows config.nodeTools.enabled when the node tools module is enabled', async () => {
			agentsConfig.modules = ['node-tools-searcher'] as unknown as AgentsConfig['modules'];

			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				config: { nodeTools: { enabled: true } },
			});

			expect(result.valid).toBe(true);
		});

		it('allows MCP servers', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'none',
					},
				],
			});

			expect(result.valid).toBe(true);
		});

		it('strips legacy schedule integrations before validating the remaining config', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				integrations: [
					{ type: 'schedule', active: false, cronExpression: '0 8 * * 1' },
					{ type: 'slack', credentialId: 'cred-slack' },
				],
			});

			expect(result.valid).toBe(true);
			if (!result.valid) return;

			expect(result.config.integrations).toEqual([{ type: 'slack', credentialId: 'cred-slack' }]);
		});

		it('does not reject unknown credential IDs during schema validation', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				credential: 'unknown-credential-id',
			});

			expect(result.valid).toBe(true);
			if (!result.valid) return;

			expect(result.config.credential).toBe('unknown-credential-id');
		});

		it('allows MCP servers with cleared credentials during draft validation', async () => {
			const result = await service.validateConfig({
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Help the user.',
				mcpServers: [
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: '',
					},
				],
			});

			expect(result.valid).toBe(true);
		});
	});

	describe('updateConfig', () => {
		const config = {
			name: 'Test Agent',
		} as unknown as AgentJsonConfig;

		beforeEach(() => {
			jest.spyOn(service, 'validateConfig').mockResolvedValue({ valid: true, config });
			agentRepository.save.mockImplementation(async (a) => a as Agent);
			mockProjectCredentials([]);
		});

		it('does not bump versionId when agent has never been published', async () => {
			const agent = makeAgent({ versionId: 'v1', activeVersionId: null });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v1');
		});

		it('does not bump versionId when already in a draft (versionId differs from activeVersionId)', async () => {
			const agent = makeAgent({
				versionId: 'v2',
				activeVersionId: 'v1',
				activeVersion: makeAgentHistory({ versionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			expect(agentRepository.save.mock.calls[0][0].versionId).toBe('v2');
		});

		it('bumps versionId on the first save after publish (versionId equals activeVersionId)', async () => {
			const agent = makeAgent({
				versionId: 'v1',
				activeVersionId: 'v1',
				activeVersion: makeAgentHistory({ versionId: 'v1' }),
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			await service.updateConfig(agentId, projectId, {});

			const savedVersionId = agentRepository.save.mock.calls[0][0].versionId as string;
			expect(savedVersionId).not.toBe('v1');
			expect(savedVersionId).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
			);
		});

		it('removes skill refs that do not have a matching skill body', async () => {
			const configWithMissingSkill = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				skills: [
					{ type: 'skill', id: 'skill-1' },
					{ type: 'skill', id: 'missing_skill' },
				],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithMissingSkill,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					skills: {
						'skill-1': { name: 'Skill 1', description: 'First skill', instructions: 'Do it' },
					},
				}),
			);

			await service.updateConfig(agentId, projectId, configWithMissingSkill);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.schema?.skills).toEqual([{ type: 'skill', id: 'skill-1' }]);
		});

		it('removes task refs that do not have a matching task body', async () => {
			const configWithMissingTask = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tasks: [
					{ type: 'task', id: 'task-1', enabled: true },
					{ type: 'task', id: 'missing_task', enabled: true },
				],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithMissingTask,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentTaskRepository.findByAgentId.mockResolvedValue([{ id: 'task-1' }] as never);

			await service.updateConfig(agentId, projectId, configWithMissingTask);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.schema?.tasks).toEqual([{ type: 'task', id: 'task-1', enabled: true }]);
		});

		it('prunes task bodies whose config ref was removed', async () => {
			const configWithOneTask = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithOneTask,
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());
			agentTaskRepository.findByAgentId.mockResolvedValue([
				{ id: 'task-1' },
				{ id: 'task-2' },
			] as never);

			await service.updateConfig(agentId, projectId, configWithOneTask);

			expect(agentTaskRepository.delete).toHaveBeenCalledWith(['task-2']);
		});

		it('preserves existing integrations when the inbound config omits the integrations field', async () => {
			// Reproduces a multi-main bug where saving an unrelated config field
			// (e.g. instructions) without re-sending the persisted integrations
			// would silently clear them and tear down live chat connections.
			const slackIntegration = {
				type: 'slack',
				credentialId: 'cred-slack',
			} as const;
			const agent = makeAgent({
				integrations: [slackIntegration],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithoutIntegrations = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Updated instructions',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithoutIntegrations,
			});

			await service.updateConfig(agentId, projectId, configWithoutIntegrations);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.integrations).toEqual([slackIntegration]);
		});

		it('clears integrations when the inbound config explicitly sends an empty array', async () => {
			const slackIntegration = {
				type: 'slack',
				credentialId: 'cred-slack',
			} as const;
			const agent = makeAgent({
				integrations: [slackIntegration],
			});
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithEmptyIntegrations = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				integrations: [],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithEmptyIntegrations,
			});

			await service.updateConfig(agentId, projectId, configWithEmptyIntegrations);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.integrations).toEqual([]);
		});

		it('persists sanitized integrations when legacy schedule entries are present', async () => {
			jest.spyOn(service, 'validateConfig').mockRestore();
			mockProjectCredentials(['cred-slack']);
			agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

			const configWithLegacySchedule = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				integrations: [
					{ type: 'schedule', active: false, cronExpression: '0 8 * * 1' },
					{ type: 'slack', credentialId: 'cred-slack' },
				],
			};

			await service.updateConfig(agentId, projectId, configWithLegacySchedule);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.integrations).toEqual([{ type: 'slack', credentialId: 'cred-slack' }]);
		});

		it('preserves stored tool bodies when the inbound config omits the tools field', async () => {
			const existingTools = {
				'tool-1': {
					code: 'function handler() {}',
					descriptor: { name: 'tool-1', description: 'first', inputSchema: {} },
				},
				'tool-2': {
					code: 'function handler2() {}',
					descriptor: { name: 'tool-2', description: 'second', inputSchema: {} },
				},
			} as unknown as Agent['tools'];
			const agent = makeAgent({ tools: existingTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithoutTools = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithoutTools,
			});

			await service.updateConfig(agentId, projectId, configWithoutTools);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.tools).toEqual(existingTools);
		});

		it('removes missing custom tool refs while preserving valid custom and non-custom tools', async () => {
			const existingTools = {
				'tool-1': {
					code: 'function handler() {}',
					descriptor: { name: 'tool-1', description: 'first', inputSchema: {} },
				},
			} as unknown as Agent['tools'];
			const agent = makeAgent({ tools: existingTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithMissingCustomTool = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tools: [
					{ type: 'custom', id: 'tool-1' },
					{ type: 'custom', id: 'missing-tool' },
					{ type: 'workflow', workflow: 'workflow-1', name: 'Workflow tool' },
					{
						type: 'node',
						name: 'HTTP Request',
						node: {
							nodeType: 'n8n-nodes-base.httpRequestTool',
							nodeTypeVersion: 4,
						},
					},
				],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithMissingCustomTool,
			});

			await service.updateConfig(agentId, projectId, configWithMissingCustomTool);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.schema?.tools).toEqual([
				{ type: 'custom', id: 'tool-1' },
				{ type: 'workflow', workflow: 'workflow-1', name: 'Workflow tool' },
				{
					type: 'node',
					name: 'HTTP Request',
					node: {
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 4,
					},
				},
			]);
			expect(savedEntity.tools).toEqual(existingTools);
		});

		it('prunes orphaned tool bodies when the inbound config provides a tools array', async () => {
			const existingTools = {
				'tool-1': {
					code: 'a',
					descriptor: { name: 'tool-1', description: 'a', inputSchema: {} },
				},
				'tool-2': {
					code: 'b',
					descriptor: { name: 'tool-2', description: 'b', inputSchema: {} },
				},
			} as unknown as Agent['tools'];
			const agent = makeAgent({ tools: existingTools });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configKeepingOnlyToolOne = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				tools: [{ type: 'custom', id: 'tool-1' }],
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configKeepingOnlyToolOne,
			});

			await service.updateConfig(agentId, projectId, configKeepingOnlyToolOne);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(Object.keys(savedEntity.tools)).toEqual(['tool-1']);
		});

		it('preserves stored skill bodies when the inbound config omits the skills field', async () => {
			const existingSkills = {
				'skill-1': { name: 'A', description: 'a', instructions: 'do a' },
				'skill-2': { name: 'B', description: 'b', instructions: 'do b' },
			} as unknown as Agent['skills'];
			const agent = makeAgent({ skills: existingSkills });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithoutSkills = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithoutSkills,
			});

			await service.updateConfig(agentId, projectId, configWithoutSkills);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.skills).toEqual(existingSkills);
		});

		it('preserves stored schema fields the client did not send (memory, description, credential)', async () => {
			const previousSchema = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Old instructions',
				description: 'previously stored description',
				credential: 'cred-anthropic',
				memory: { enabled: true },
				tools: [{ type: 'custom', id: 'tool-keep' } as const],
			} as unknown as AgentJsonConfig;
			const agent = makeAgent({ schema: previousSchema });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			// Client sends only the required fields plus a new instruction.
			const minimalUpdate = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Updated instructions',
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: minimalUpdate,
			});

			await service.updateConfig(agentId, projectId, minimalUpdate);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			const savedSchema = savedEntity.schema as unknown as Record<string, unknown>;
			expect(savedSchema.instructions).toBe('Updated instructions');
			expect(savedSchema.description).toBe('previously stored description');
			expect(savedSchema.credential).toBe('cred-anthropic');
			expect(savedSchema.memory).toEqual({ enabled: true });
			expect(savedSchema.tools).toEqual([{ type: 'custom', id: 'tool-keep' }]);
			// description column on the entity also stays untouched.
			expect(savedEntity.description).toBe(agent.description);
		});

		describe('credential cleanup', () => {
			beforeEach(() => {
				jest.spyOn(service, 'validateConfig').mockRestore();
				agentRepository.save.mockImplementation(async (a) => a as Agent);
			});

			it('clears a provided unknown top-level credential before persistence', async () => {
				mockProjectCredentials(['known-cred']);
				agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

				await service.updateConfig(agentId, projectId, {
					name: 'Test Agent',
					model: 'openai/gpt-5.5',
					instructions: 'Help the user.',
					credential: 'unknown-cred',
				});

				const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
				expect((savedEntity.schema as AgentJsonConfig).credential).toBe('');
			});

			it('preserves a provided credential when it is accessible to the project', async () => {
				mockProjectCredentials(['known-cred']);
				agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

				await service.updateConfig(agentId, projectId, {
					name: 'Test Agent',
					model: 'openai/gpt-5.5',
					instructions: 'Help the user.',
					credential: 'known-cred',
				});

				const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
				expect((savedEntity.schema as AgentJsonConfig).credential).toBe('known-cred');
			});

			it('preserves the stored credential when the inbound config omits credential', async () => {
				mockProjectCredentials([]);
				const agent = makeAgent({
					schema: {
						name: 'Test Agent',
						model: 'openai/gpt-5.5',
						instructions: 'Help the user.',
						credential: 'stored-cred',
					} as AgentJsonConfig,
				});
				agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

				await service.updateConfig(agentId, projectId, {
					name: 'Test Agent',
					model: 'openai/gpt-5.5',
					instructions: 'Updated instructions',
				});

				const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
				expect((savedEntity.schema as AgentJsonConfig).credential).toBe('stored-cred');
			});

			it('clears unknown nested credentials before persistence', async () => {
				mockProjectCredentials(['known-cred']);
				agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

				await service.updateConfig(agentId, projectId, {
					name: 'Test Agent',
					model: 'openai/gpt-5.5',
					instructions: 'Help the user.',
					memory: {
						enabled: true,
						storage: 'n8n',
						observationalMemory: {
							observerModel: { model: 'openai/gpt-4o-mini', credential: 'unknown-cred' },
							reflectorModel: { model: 'anthropic/claude-sonnet-4-5', credential: 'known-cred' },
						},
					},
					integrations: [{ type: 'slack', credentialId: 'unknown-cred' }],
				});

				const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
				const savedConfig = savedEntity.schema as AgentJsonConfig;
				expect(savedConfig.memory?.observationalMemory?.observerModel).toEqual({
					model: 'openai/gpt-4o-mini',
					credential: '',
				});
				expect(savedConfig.memory?.observationalMemory?.reflectorModel).toEqual({
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'known-cred',
				});
				expect(savedEntity.integrations).toEqual([{ type: 'slack', credentialId: '' }]);
			});

			it('clears unknown MCP server credentials and still saves the draft config', async () => {
				mockProjectCredentials([]);
				agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

				await service.updateConfig(agentId, projectId, {
					name: 'Test Agent',
					model: 'openai/gpt-5.5',
					instructions: 'Help the user.',
					mcpServers: [
						{
							name: 'github',
							url: 'https://example.com/mcp',
							transport: 'streamableHttp',
							authentication: 'bearerAuth',
							credential: 'unknown-mcp-cred',
						},
					],
				});

				const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
				expect((savedEntity.schema as AgentJsonConfig).mcpServers).toEqual([
					{
						name: 'github',
						url: 'https://example.com/mcp',
						transport: 'streamableHttp',
						authentication: 'bearerAuth',
						credential: '',
					},
				]);
			});
		});

		it('stores subAgents when the inbound config provides saved agent refs', async () => {
			const agent = makeAgent();
			const subAgent = makeAgent({ id: 'agent-2', activeVersionId: 'published-version-2' });
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) => {
				if (id === agentId) return agent;
				if (id === 'agent-2') return subAgent;
				return null;
			});

			const configWithSubAgents = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				subAgents: { agents: [{ agentId: 'agent-2' }] },
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithSubAgents,
			});

			await service.updateConfig(agentId, projectId, configWithSubAgents);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.schema?.subAgents).toEqual({
				agents: [{ agentId: 'agent-2' }],
			});
			expect(
				agentRepository.findByIdAndProjectId.mock.calls.filter(([id]) => id === 'agent-2'),
			).toHaveLength(1);
		});

		it('strips missing subagent refs before validating and saving config', async () => {
			const agent = makeAgent();
			const subAgent = makeAgent({ id: 'agent-3', activeVersionId: 'published-version-3' });
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) => {
				if (id === agentId) return agent;
				if (id === 'agent-3') return subAgent;
				return null;
			});

			const configWithSubAgents = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				subAgents: {
					maxChildren: 10,
					agents: [{ agentId: 'agent_123' }, { agentId: 'agent-3' }],
				},
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithSubAgents,
			});

			await service.updateConfig(agentId, projectId, configWithSubAgents);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.schema?.subAgents).toEqual({
				maxChildren: 10,
				agents: [{ agentId: 'agent-3' }],
			});
			expect(
				agentRepository.findByIdAndProjectId.mock.calls.filter(([id]) => id === 'agent_123'),
			).toHaveLength(1);
			expect(
				agentRepository.findByIdAndProjectId.mock.calls.filter(([id]) => id === 'agent-3'),
			).toHaveLength(1);
		});

		it('persists subAgents.maxChildren without materializing an agents list', async () => {
			const agent = makeAgent();
			agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

			const configWithSubAgentBudget = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				subAgents: { maxChildren: 3 },
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithSubAgentBudget,
			});

			await service.updateConfig(agentId, projectId, configWithSubAgentBudget);

			const savedEntity = agentRepository.save.mock.calls[0][0] as Agent;
			expect(savedEntity.schema?.subAgents).toEqual({
				maxChildren: 3,
			});
		});

		it('rejects unpublished subagent references', async () => {
			const agent = makeAgent();
			const unpublishedSubAgent = makeAgent({ id: 'agent-2', activeVersionId: null });
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) => {
				if (id === agentId) return agent;
				if (id === 'agent-2') return unpublishedSubAgent;
				return null;
			});

			const configWithSubAgents = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				subAgents: { agents: [{ agentId: 'agent-2' }] },
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithSubAgents,
			});

			await expect(service.updateConfig(agentId, projectId, configWithSubAgents)).rejects.toThrow(
				'Invalid agent config: Subagent "agent-2" must be published',
			);
			expect(agentRepository.save).not.toHaveBeenCalled();
		});

		it('rejects self-referencing subagent refs', async () => {
			const agent = makeAgent({ id: agentId });
			agentRepository.findByIdAndProjectId.mockImplementation(async (id) => {
				if (id === agentId) return agent;
				return null;
			});

			const configWithSelfReference = {
				name: 'Test Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Be helpful',
				subAgents: { agents: [{ agentId }] },
			} as AgentJsonConfig;
			jest.spyOn(service, 'validateConfig').mockResolvedValue({
				valid: true,
				config: configWithSelfReference,
			});

			await expect(
				service.updateConfig(agentId, projectId, configWithSelfReference),
			).rejects.toThrow('Invalid agent config: An agent cannot use itself as a subagent');
			expect(agentRepository.save).not.toHaveBeenCalled();
		});
	});
});
