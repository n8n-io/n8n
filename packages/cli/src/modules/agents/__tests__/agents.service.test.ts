/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- async mock stubs, unbound-method references and short `cb` names are acceptable test idioms */

import { DEFAULT_AGENT_PERSONALISATION } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { ProjectRelationRepository, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import type { AgentKnowledgeService } from '../agent-knowledge.service';
import type { AgentExecutionService } from '../agent-execution.service';
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
	const projectRelationRepository = mock<ProjectRelationRepository>();
	const agentKnowledgeService = mock<AgentKnowledgeService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const testChatService = mock<AgentTestChatService>();
	const agentTaskService = mock<AgentTaskService>();
	const agentTaskRepository = mock<AgentTaskRepository>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const subAgentCleanupService = mock<SubAgentCleanupService>();
	const eventService = mock<EventService>();
	const agentExecutionService = mock<AgentExecutionService>();

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
		projectRelationRepository,
		mock<AgentChatAttachmentService>(),
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskRepository,
		subAgentCleanupService,
		eventService,
		agentExecutionService,
	);

	return {
		service,
		agentRepository,
		projectRelationRepository,
		agentKnowledgeService,
		runtimeCacheService,
		testChatService,
		agentTaskService,
		agentTaskRepository,
		chatIntegrationService,
		subAgentCleanupService,
		eventService,
		agentExecutionService,
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
				// A renderable icon name, not an emoji: the builder copies the idiom
				// it reads, and the icon tile can only render registered icon names.
				personalisation: {
					icon: DEFAULT_AGENT_PERSONALISATION.icon,
					gradient: expect.objectContaining({ angle: expect.any(Number) }),
				},
			},
			versionId: expect.any(String),
			availableInMCP: false,
		});
	});

	it('creates an agent with a resolved default model and credential', async () => {
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		agentRepository.create.mockReturnValue(saved);
		agentRepository.save.mockResolvedValue(saved);

		await service.create(projectId, 'Support Agent', {
			defaultModel: {
				model: 'openai/gpt-5-mini',
				credential: 'managed',
			},
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity.schema).toMatchObject({
			name: 'Support Agent',
			model: 'openai/gpt-5-mini',
			credential: 'managed',
		});
	});

	it('splits a seeded config so integrations land on their own column', async () => {
		// `composeJsonConfig` reads integrations from the entity column, so leaving
		// them inside `schema` loses every trigger on the next read — an eval seed
		// would restore an agent whose integrations silently vanished.
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		agentRepository.create.mockReturnValue(saved);
		agentRepository.save.mockResolvedValue(saved);
		const integrations = [{ type: 'slack' as const, credentialId: 'cred-slack-1' }];

		await service.create(projectId, 'Support Agent', {
			schema: {
				name: 'Support Agent',
				model: 'anthropic/claude-sonnet-4-5',
				instructions: 'Triage tickets.',
				integrations,
			},
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity.integrations).toEqual(integrations);
		expect(entity.schema).not.toHaveProperty('integrations');
		expect(entity.schema).toMatchObject({ name: 'Support Agent', instructions: 'Triage tickets.' });
	});

	it('omits the integrations column when the seeded config declares none', async () => {
		const { service, agentRepository } = makeService();
		const saved = makeAgent();
		agentRepository.create.mockReturnValue(saved);
		agentRepository.save.mockResolvedValue(saved);

		await service.create(projectId, 'Support Agent', {
			schema: { name: 'Support Agent', model: '', instructions: '' },
		});

		const [entity] = agentRepository.create.mock.calls[0];
		expect(entity).not.toHaveProperty('integrations');
	});

	describe('create with a client-minted id', () => {
		const mintedId = 'aBcDeFgHiJkLmNoP';
		const uniqueViolation = () =>
			new QueryFailedError(
				'insert',
				undefined,
				Object.assign(new Error('duplicate key'), { code: '23505' }),
			);

		it('persists the agent under the supplied id', async () => {
			const { service, agentRepository } = makeService();
			const saved = makeAgent({ id: mintedId });
			agentRepository.create.mockReturnValue(saved);
			agentRepository.save.mockResolvedValue(saved);

			await service.create(projectId, 'Support Agent', { id: mintedId });

			expect(agentRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({ id: mintedId }),
			);
		});

		it('adopts a same-project agent when the adoption flag is set', async () => {
			const { service, agentRepository } = makeService();
			const raced = makeAgent({
				id: mintedId,
				schema: { name: 'Support Agent', model: '', instructions: '' },
				integrations: [],
			});
			agentRepository.create.mockReturnValue(raced);
			agentRepository.save.mockRejectedValue(uniqueViolation());
			agentRepository.findByIdAndProjectId.mockResolvedValue(raced);

			await expect(
				service.create(projectId, 'Support Agent', {
					id: mintedId,
					adoptOnCollision: true,
				}),
			).resolves.toBe(raced);
		});

		it('rejects a collision without the adoption flag, even for a same-project blank row', async () => {
			const { service, agentRepository } = makeService();
			const raced = makeAgent({
				id: mintedId,
				schema: { name: 'Support Agent', model: '', instructions: '' },
				integrations: [],
			});
			agentRepository.create.mockReturnValue(raced);
			agentRepository.save.mockRejectedValue(uniqueViolation());

			await expect(service.create(projectId, 'Support Agent', { id: mintedId })).rejects.toThrow(
				ConflictError,
			);
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		// The whole point of the adoption path: the winner of the insert usually
		// gets to configure the row before the loser collides on it.
		it('adopts an already configured same-project row, unchanged', async () => {
			const { service, agentRepository } = makeService();
			const configured = makeAgent({
				id: mintedId,
				name: 'Support Triage',
				schema: {
					name: 'Support Triage',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Hi',
				},
				integrations: [],
			});
			agentRepository.create.mockReturnValue(makeAgent({ id: mintedId }));
			agentRepository.save.mockRejectedValue(uniqueViolation());
			agentRepository.findByIdAndProjectId.mockResolvedValue(configured);

			await expect(
				service.create(projectId, 'New Agent', {
					id: mintedId,
					adoptOnCollision: true,
				}),
			).resolves.toBe(configured);
			// The draft name/config this call carried must not overwrite the winner's.
			expect(agentRepository.save).toHaveBeenCalledTimes(1);
		});

		it('rejects without disclosing when the id collides outside this project', async () => {
			const { service, agentRepository } = makeService();
			agentRepository.create.mockReturnValue(makeAgent({ id: mintedId }));
			agentRepository.save.mockRejectedValue(uniqueViolation());
			agentRepository.findByIdAndProjectId.mockResolvedValue(null);

			await expect(
				service.create(projectId, 'Support Agent', {
					id: mintedId,
					adoptOnCollision: true,
				}),
			).rejects.toThrow(ConflictError);
		});

		it('rethrows a non-unique-violation failure instead of treating it as a race', async () => {
			const { service, agentRepository } = makeService();
			const error = new QueryFailedError('insert', undefined, new Error('connection lost'));
			agentRepository.create.mockReturnValue(makeAgent({ id: mintedId }));
			agentRepository.save.mockRejectedValue(error);

			await expect(service.create(projectId, 'Support Agent', { id: mintedId })).rejects.toBe(
				error,
			);
			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
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
		expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(projectId, agentId);
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
		expect(agentKnowledgeService.destroyKnowledgeSandbox).toHaveBeenCalledWith(projectId, agentId);
	});

	it('returns false when deleting a missing agent', async () => {
		const { service, agentRepository } = makeService();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(service.delete(agentId, projectId)).resolves.toBe(false);
		expect(agentRepository.remove).not.toHaveBeenCalled();
	});

	describe('findByIdForUser', () => {
		const makeUser = (scopeSlugs: string[]): User =>
			({ id: 'user-9', role: { scopes: scopeSlugs.map((slug) => ({ slug })) } }) as unknown as User;

		it('looks the agent up directly for users with the global agent:read scope', async () => {
			const { service, agentRepository, projectRelationRepository } = makeService();
			const agent = makeAgent();
			agentRepository.findById.mockResolvedValue(agent);

			await expect(service.findByIdForUser(agentId, makeUser(['agent:read']))).resolves.toBe(agent);

			expect(agentRepository.findById).toHaveBeenCalledWith(agentId);
			expect(projectRelationRepository.findAllByUser).not.toHaveBeenCalled();
		});

		it('restricts the lookup to the projects the user belongs to', async () => {
			const { service, agentRepository, projectRelationRepository } = makeService();
			const agent = makeAgent();
			projectRelationRepository.findAllByUser.mockResolvedValue([
				{ projectId: 'project-1' },
				{ projectId: 'project-2' },
			] as never);
			agentRepository.findByIdInProjects.mockResolvedValue(agent);

			await expect(service.findByIdForUser(agentId, makeUser([]))).resolves.toBe(agent);

			expect(projectRelationRepository.findAllByUser).toHaveBeenCalledWith('user-9');
			expect(agentRepository.findByIdInProjects).toHaveBeenCalledWith(agentId, [
				'project-1',
				'project-2',
			]);
			expect(agentRepository.findById).not.toHaveBeenCalled();
		});

		it('returns null when the agent is outside the user’s projects', async () => {
			const { service, agentRepository, projectRelationRepository } = makeService();
			projectRelationRepository.findAllByUser.mockResolvedValue([]);
			agentRepository.findByIdInProjects.mockResolvedValue(null);

			await expect(service.findByIdForUser(agentId, makeUser([]))).resolves.toBeNull();
		});
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
						mcpServers: [
							{
								name: 'notion-mcp',
								url: 'https://mcp.example.com',
								transport: 'streamableHttp',
								authentication: 'none',
							},
						],
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
				mcpServers: [{ name: 'notion-mcp' }],
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
				mcpServers: [],
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
