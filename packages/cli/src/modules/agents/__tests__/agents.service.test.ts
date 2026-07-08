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
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SubAgentCleanupService } from '../sub-agents/sub-agent-cleanup.service';

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
	const chatIntegrationService = mock<ChatIntegrationService>();
	const subAgentCleanupService = mock<SubAgentCleanupService>();

	agentRepository.save.mockImplementation(async (agent) => agent as Agent);
	agentTaskService.requestReconcile.mockResolvedValue();
	chatIntegrationService.disconnectChannel.mockResolvedValue();
	testChatService.clearAllTestChatMessages.mockResolvedValue();
	subAgentCleanupService.removeSubAgentFromParents.mockResolvedValue();
	Container.set(AgentTaskService, agentTaskService);
	Container.set(ChatIntegrationService, chatIntegrationService);

	const service = new AgentsService(
		mockLogger(),
		agentRepository,
		mock<ProjectRelationRepository>(),
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		subAgentCleanupService,
	);

	return {
		service,
		agentRepository,
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskService,
		chatIntegrationService,
		subAgentCleanupService,
	};
}

describe('AgentsService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
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
			chatIntegrationService,
			subAgentCleanupService,
		} = makeService();
		const agent = makeAgent({
			integrations: [
				{ type: 'slack', credentialId: 'slack-1' },
				{ type: 'telegram', credentialId: 'telegram-1' },
			],
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.delete(agentId, projectId)).resolves.toBe(true);

		expect(agentKnowledgeService.deleteAllFilesForAgent).toHaveBeenCalledWith(projectId, agentId);
		expect(agentKnowledgeService.deleteAllFilesForAgent.mock.invocationCallOrder[0]).toBeLessThan(
			agentRepository.remove.mock.invocationCallOrder[0],
		);
		expect(agentRepository.remove).toHaveBeenCalledWith(agent);
		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith(agentId, {
			type: 'slack',
			credentialId: 'slack-1',
		});
		expect(chatIntegrationService.disconnectChannel).toHaveBeenCalledWith(agentId, {
			type: 'telegram',
			credentialId: 'telegram-1',
		});
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
		expect(subAgentCleanupService.removeSubAgentFromParents).toHaveBeenCalledWith(
			agentId,
			projectId,
		);
		expect(agentTaskService.requestReconcile).toHaveBeenCalledWith(agentId);
		expect(testChatService.clearAllTestChatMessages).toHaveBeenCalledWith(agentId);
		expect(agentKnowledgeService.destroySandbox).toHaveBeenCalledWith(projectId, agentId);
	});

	it('still deletes the agent when best-effort cleanup fails', async () => {
		const { service, agentRepository, agentKnowledgeService, testChatService } = makeService();
		const agent = makeAgent();

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentKnowledgeService.deleteAllFilesForAgent.mockRejectedValue(new Error('storage down'));
		testChatService.clearAllTestChatMessages.mockRejectedValue(new Error('memory down'));

		await expect(service.delete(agentId, projectId)).resolves.toBe(true);
		expect(agentRepository.remove).toHaveBeenCalledWith(agent);
		expect(agentKnowledgeService.destroySandbox).toHaveBeenCalledWith(projectId, agentId);
	});

	it('returns false when deleting a missing agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.delete(agentId, projectId)).resolves.toBe(false);
		expect(agentRepository.remove).not.toHaveBeenCalled();
	});
});
