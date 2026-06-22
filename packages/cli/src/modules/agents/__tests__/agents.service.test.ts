import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { ProjectRelationRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';

import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentTestChatService } from '../agent-test-chat.service';
import { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		name: 'Agent',
		projectId,
		versionId: 'version-1',
		schema: null,
		activeVersionId: null,
		activeVersion: null,
		integrations: [],
		tools: {},
		skills: {},
		updatedAt: new Date('2025-01-01T00:00:00Z'),
		...overrides,
	} as unknown as Agent;
}

function makeService(config: Partial<AgentsConfig> = {}) {
	const agentRepository = mock<AgentRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const testChatService = mock<AgentTestChatService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentsConfig = {
		sandboxEnabled: false,
		sandboxProvider: '',
		daytonaVolumeId: '',
		...config,
	} as AgentsConfig;

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);
	agentTaskService.requestReconcile.mockResolvedValue();
	testChatService.clearAllTestChatMessages.mockResolvedValue();
	Container.set(AgentTaskService, agentTaskService);

	const service = new AgentsService(
		mockLogger(),
		agentRepository,
		mock<ProjectRelationRepository>(),
		agentsConfig,
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
	);

	return {
		service,
		agentRepository,
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskService,
	};
}

describe('AgentsService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('only enables knowledge base when the Daytona sandbox is configured', () => {
		expect(
			makeService({
				sandboxEnabled: true,
				sandboxProvider: 'daytona',
				daytonaVolumeId: 'volume-1',
			}).service.isKnowledgeBaseEnabled(),
		).toBe(true);
		expect(
			makeService({
				sandboxEnabled: true,
				sandboxProvider: 'local',
			}).service.isKnowledgeBaseEnabled(),
		).toBe(false);
		expect(
			makeService({
				sandboxEnabled: false,
				sandboxProvider: 'daytona',
				daytonaVolumeId: 'volume-1',
			}).service.isKnowledgeBaseEnabled(),
		).toBe(false);
		expect(
			makeService({
				sandboxEnabled: true,
				sandboxProvider: 'daytona',
				daytonaVolumeId: '',
			}).service.isKnowledgeBaseEnabled(),
		).toBe(false);
	});

	it('creates a draft agent without a default model or credential', async () => {
		const { service, agentRepository } = makeService();
		const saved = makeAgent();

		agentRepository.create.mockReturnValue(saved);
		agentRepository.save.mockResolvedValue(saved);

		await expect(service.create(projectId, 'Support Agent')).resolves.toBe(saved);
		expect(agentRepository.create).toHaveBeenCalledWith({
			name: 'Support Agent',
			projectId,
			schema: {
				name: 'Support Agent',
				model: '',
				instructions: '',
				tools: [],
				skills: [],
			},
			versionId: expect.any(String),
		});
	});

	it('deletes the agent and its dependent runtime state', async () => {
		const {
			service,
			agentRepository,
			agentKnowledgeService,
			runtimeCacheService,
			testChatService,
			agentTaskService,
		} = makeService();
		const agent = makeAgent();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.delete(agentId, projectId, 'user-1')).resolves.toBe(true);

		expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(
			projectId,
			agentId,
			'user-1',
		);
		expect(agentRepository.remove).toHaveBeenCalledWith(agent);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(agentTaskService.requestReconcile).toHaveBeenCalledWith(agentId);
		expect(testChatService.clearAllTestChatMessages).toHaveBeenCalledWith(agentId);
	});

	it('still deletes the agent when best-effort cleanup fails', async () => {
		const { service, agentRepository, agentKnowledgeService, testChatService } = makeService();
		const agent = makeAgent();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentKnowledgeService.deleteAllFilesForAgent.mockRejectedValue(new Error('storage down'));
		testChatService.clearAllTestChatMessages.mockRejectedValue(new Error('memory down'));

		await expect(service.delete(agentId, projectId, 'user-1')).resolves.toBe(true);
		expect(agentRepository.remove).toHaveBeenCalledWith(agent);
	});
});
