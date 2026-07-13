/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */

import { mockLogger } from '@n8n/backend-test-utils';
import type { ProjectRelationRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentTestChatService } from '../agent-test-chat.service';
import { AgentsService } from '../agents.service';
import type { AgentTask } from '../entities/agent-task.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';
import type { AgentRepository } from '../repositories/agent.repository';
import type { SubAgentCleanupService } from '../sub-agents/sub-agent-cleanup.service';
import type { EventService } from '@/events/event.service';

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
	const agentTaskRepository = mock<AgentTaskRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const subAgentCleanupService = mock<SubAgentCleanupService>();
	const eventService = mock<EventService>();

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
		agentTaskRepository,
		subAgentCleanupService,
		eventService,
	);

	return {
		service,
		agentRepository,
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskService,
		agentTaskRepository,
		chatIntegrationService,
		subAgentCleanupService,
		eventService,
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
			eventService,
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
		expect(eventService.emit).toHaveBeenCalledWith('agent-deleted', { agentId, projectId });
	});

	it('emits agent-deleted only after the agent row is removed', async () => {
		const { service, agentRepository, eventService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent());

		await service.delete(agentId, projectId);

		expect(eventService.emit).toHaveBeenCalledWith('agent-deleted', { agentId, projectId });
		expect(eventService.emit.mock.invocationCallOrder[0]).toBeGreaterThan(
			agentRepository.remove.mock.invocationCallOrder[0],
		);
	});

	it('does not emit agent-deleted when the agent is missing', async () => {
		const { service, agentRepository, eventService } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.delete(agentId, projectId)).resolves.toBe(false);
		expect(eventService.emit).not.toHaveBeenCalled();
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

	describe('getCapabilitySummary', () => {
		it('projects model, channels, tools, skills and tasks into per-item labels', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					name: 'Support Agent',
					schema: {
						name: 'Support Agent',
						model: 'anthropic/claude-sonnet-4-5',
						instructions: 'Help the user.',
						tools: [
							{ type: 'custom', id: 'c1' },
							{ type: 'workflow', workflow: 'wf-1', name: 'Lookup order' },
							{
								type: 'node',
								name: 'HTTP Request',
								node: { nodeType: 'n8n-nodes-base.httpRequestTool', nodeTypeVersion: 1 },
							},
						],
						skills: [{ type: 'skill', id: 's1' }],
						tasks: [{ type: 'task', id: 't1', enabled: true }],
					},
					integrations: [
						{ type: 'slack', credentialId: 'cred-1' },
						{ type: 'telegram', credentialId: 'cred-2' },
					],
					tools: { c1: { code: '', descriptor: { name: 'Refund tool' } } },
					skills: { s1: { name: 'Triage', description: '', instructions: '' } },
				} as unknown as Partial<Agent>),
			);
			agentTaskRepository.findByAgentId.mockResolvedValue([
				{ id: 't1', name: 'Daily digest' } as AgentTask,
			]);

			const summary = await service.getCapabilitySummary(agentId, projectId);

			expect(summary).toEqual({
				id: agentId,
				name: 'Support Agent',
				model: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
				channels: [{ type: 'slack' }, { type: 'telegram' }],
				tools: [
					{ type: 'custom', name: 'Refund tool' },
					{ type: 'workflow', name: 'Lookup order' },
					{
						type: 'node',
						name: 'HTTP Request',
						nodeType: 'n8n-nodes-base.httpRequestTool',
						nodeTypeVersion: 1,
					},
				],
				skills: [{ id: 's1', name: 'Triage' }],
				tasks: [{ id: 't1', name: 'Daily digest', enabled: true }],
			});
		});

		it('returns a null model and empty arrays for an unconfigured agent', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({ name: 'Empty Agent', schema: null }),
			);

			const summary = await service.getCapabilitySummary(agentId, projectId);

			expect(summary).toEqual({
				id: agentId,
				name: 'Empty Agent',
				model: null,
				channels: [],
				tools: [],
				skills: [],
				tasks: [],
			});
			// No task refs → no body lookup.
			expect(agentTaskRepository.findByAgentId).not.toHaveBeenCalled();
		});

		it('falls back to ref ids when bodies are missing', async () => {
			const { service, agentRepository, agentTaskRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(
				makeAgent({
					name: 'Partial Agent',
					schema: {
						name: 'Partial Agent',
						model: 'claude-sonnet-4-5',
						instructions: 'Help the user.',
						tools: [
							{ type: 'custom', id: 'c-missing' },
							{ type: 'workflow', workflow: 'wf-2' },
						],
						skills: [{ type: 'skill', id: 's-missing' }],
						tasks: [{ type: 'task', id: 't-missing', enabled: false }],
					},
				} as unknown as Partial<Agent>),
			);
			agentTaskRepository.findByAgentId.mockResolvedValue([]);

			const summary = await service.getCapabilitySummary(agentId, projectId);

			expect(summary.model).toEqual({ provider: '', model: 'claude-sonnet-4-5' });
			expect(summary.tools).toEqual([
				{ type: 'custom', name: 'c-missing' },
				{ type: 'workflow', name: 'wf-2' },
			]);
			expect(summary.skills).toEqual([{ id: 's-missing', name: 's-missing' }]);
			expect(summary.tasks).toEqual([{ id: 't-missing', name: 't-missing', enabled: false }]);
		});

		it('throws NotFoundError when the agent does not exist', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(service.getCapabilitySummary(agentId, projectId)).rejects.toThrow(NotFoundError);
		});
	});
});
