/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */

import { mockLogger } from '@n8n/backend-test-utils';
import type { ProjectRelationRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

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

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const testChatService = mock<AgentTestChatService>();
	const agentTaskService = mock<AgentTaskService>();

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);
	agentTaskService.requestReconcile.mockResolvedValue();
	testChatService.clearAllTestChatMessages.mockResolvedValue();
	Container.set(AgentTaskService, agentTaskService);

	const service = new AgentsService(
		mockLogger(),
		agentRepository,
		mock<ProjectRelationRepository>(),
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
		vi.clearAllMocks();
	});

	afterEach(() => {
		Container.reset();
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
		expect(agentKnowledgeService.deleteAllFilesForAgent.mock.invocationCallOrder[0]).toBeLessThan(
			agentRepository.remove.mock.invocationCallOrder[0],
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

	it('returns false when deleting a missing agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.delete(agentId, projectId, 'user-1')).resolves.toBe(false);
		expect(agentRepository.remove).not.toHaveBeenCalled();
	});
});
