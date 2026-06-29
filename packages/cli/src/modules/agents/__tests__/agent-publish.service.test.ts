import type { AgentJsonConfig } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { AgentCustomToolsService } from '../agent-custom-tools.service';
import { AgentPublishService } from '../agent-publish.service';
import type { AgentRuntimeCacheService } from '../agent-runtime-cache.service';
import { AgentTaskService } from '../agent-task.service';
import type { AgentHistory } from '../entities/agent-history.entity';
import type { AgentTaskSnapshot } from '../entities/agent-task-snapshot.entity';
import type { Agent } from '../entities/agent.entity';
import { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentHistoryRepository } from '../repositories/agent-history.repository';
import type { AgentTaskSnapshotRepository } from '../repositories/agent-task-snapshot.repository';
import type { AgentRepository } from '../repositories/agent.repository';

const agentId = 'agent-1';
const projectId = 'project-1';
const versionId = 'version-1';
const user = { id: 'user-1', firstName: 'Ada', lastName: 'Lovelace' } as User;

const schema: AgentJsonConfig = {
	name: 'Support Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help users',
};

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: agentId,
		projectId,
		name: 'Support Agent',
		versionId,
		activeVersionId: null,
		activeVersion: null,
		schema,
		tools: {},
		skills: {},
		integrations: [],
		...overrides,
	} as unknown as Agent;
}

function makeHistory(overrides: Partial<AgentHistory> = {}): AgentHistory {
	return {
		versionId,
		agentId,
		schema,
		tools: null,
		skills: null,
		author: 'Ada Lovelace',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		updatedAt: new Date('2026-01-02T00:00:00.000Z'),
		...overrides,
	} as unknown as AgentHistory;
}

function makeTaskSnapshot(overrides: Partial<AgentTaskSnapshot> = {}): AgentTaskSnapshot {
	return {
		versionId,
		taskId: 'task-1',
		enabled: true,
		name: 'Daily summary',
		objective: 'Summarize messages',
		cronExpression: '0 9 * * *',
		...overrides,
	} as AgentTaskSnapshot;
}

function makeTransaction() {
	const taskRepo = {
		findBy: vi.fn().mockResolvedValue([]),
		delete: vi.fn(),
		update: vi.fn(),
		insert: vi.fn(),
	};
	const trx = {
		save: vi.fn(),
		getRepository: vi.fn().mockReturnValue(taskRepo),
	};
	const transaction = vi.fn(async (callback: (manager: typeof trx) => Promise<void>) => {
		await callback(trx);
	});

	return { trx, taskRepo, transaction };
}

function makeService() {
	const agentRepository = mock<AgentRepository>();
	const agentHistoryRepository = mock<AgentHistoryRepository>();
	const taskSnapshotRepository = mock<AgentTaskSnapshotRepository>();
	const customToolsService = mock<AgentCustomToolsService>();
	const runtimeCacheService = mock<AgentRuntimeCacheService>();
	const chatIntegrationService = mock<ChatIntegrationService>();
	const taskService = mock<AgentTaskService>();
	const { trx, taskRepo, transaction } = makeTransaction();

	Object.defineProperty(agentRepository, 'manager', {
		value: { transaction },
		configurable: true,
	});

	agentHistoryRepository.saveVersion.mockResolvedValue(makeHistory());
	customToolsService.snapshotConfiguredTools.mockReturnValue(null);
	chatIntegrationService.syncToConfig.mockResolvedValue(undefined);
	chatIntegrationService.disconnect.mockResolvedValue();
	taskService.requestReconcile.mockResolvedValue();
	Container.set(ChatIntegrationService, chatIntegrationService);
	Container.set(AgentTaskService, taskService);

	const service = new AgentPublishService(
		mockLogger(),
		agentRepository,
		agentHistoryRepository,
		taskSnapshotRepository,
		customToolsService,
		runtimeCacheService,
	);

	return {
		service,
		agentRepository,
		agentHistoryRepository,
		taskSnapshotRepository,
		customToolsService,
		runtimeCacheService,
		chatIntegrationService,
		taskService,
		trx,
		taskRepo,
	};
}

describe('AgentPublishService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.reset();
	});

	it('publishes the current draft as a snapshot and activates that version', async () => {
		const {
			service,
			agentRepository,
			agentHistoryRepository,
			taskSnapshotRepository,
			customToolsService,
			runtimeCacheService,
			taskRepo,
			trx,
		} = makeService();
		const configuredTools = { tool: { descriptor: { name: 'tool' } } };
		const configuredSkills = {
			skill: { name: 'Skill', description: 'desc', instructions: 'Use it' },
		};
		const agent = makeAgent({
			schema: {
				...schema,
				tools: [{ type: 'custom', id: 'tool' }],
				skills: [{ type: 'skill', id: 'skill' }],
				tasks: [{ type: 'task', id: 'task-1', enabled: true }],
			},
			skills: configuredSkills,
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		customToolsService.snapshotConfiguredTools.mockReturnValue(configuredTools as never);
		taskRepo.findBy.mockResolvedValue([
			{
				id: 'task-1',
				name: 'Daily summary',
				objective: 'Summarize messages',
				cronExpression: '0 9 * * *',
			},
		]);

		await expect(service.publishAgent(agentId, projectId, user)).resolves.toBe(agent);

		expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
			{
				versionId,
				agentId,
				schema: agent.schema,
				tools: configuredTools,
				skills: configuredSkills,
				publishedBy: user,
			},
			trx,
		);
		expect(taskSnapshotRepository.saveForVersion).toHaveBeenCalledWith(
			[expect.objectContaining({ versionId, taskId: 'task-1', objective: 'Summarize messages' })],
			trx,
		);
		expect(agent.activeVersionId).toBe(versionId);
		expect(runtimeCacheService.clearRuntimes).toHaveBeenCalledWith(agentId);
	});

	it('rejects publishing when a configured task body is missing', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent({
			schema: {
				...schema,
				tasks: [{ type: 'task', id: 'missing_task', enabled: true }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.publishAgent(agentId, projectId, user)).rejects.toThrow(
			'Cannot publish agent with missing task bodies: missing_task',
		);

		expect(agent.activeVersionId).toBeNull();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('rejects publishing when a configured skill body is missing', async () => {
		const { service, agentRepository, runtimeCacheService } = makeService();
		const agent = makeAgent({
			schema: {
				...schema,
				skills: [{ type: 'skill', id: 'missing_skill' }],
			},
		});
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		await expect(service.publishAgent(agentId, projectId, user)).rejects.toThrow(
			'Cannot publish agent with missing skill bodies: missing_skill',
		);

		expect(agent.activeVersionId).toBeNull();
		expect(runtimeCacheService.clearRuntimes).not.toHaveBeenCalled();
	});

	it('avoids duplicate history inserts but creates a fresh version after unpublish', async () => {
		const { service, agentRepository, agentHistoryRepository, chatIntegrationService } =
			makeService();
		const agent = makeAgent({
			versionId: 'v1',
			activeVersionId: 'v1',
			activeVersion: makeHistory({ versionId: 'v1' }),
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		await expect(service.publishAgent(agentId, projectId, user)).resolves.toBe(agent);
		expect(agentHistoryRepository.saveVersion).not.toHaveBeenCalled();

		await service.unpublishAgent(agentId, projectId);
		expect(agent.activeVersionId).toBeNull();
		expect(agent.versionId).not.toBe('v1');
		expect(chatIntegrationService.disconnect).toHaveBeenCalledWith(agentId);

		const draftVersion = agent.versionId;
		if (!draftVersion) throw new Error('Expected unpublish to assign a draft version');
		agentHistoryRepository.saveVersion.mockResolvedValue(makeHistory({ versionId: draftVersion }));
		await service.publishAgent(agentId, projectId, user);

		expect(agent.activeVersionId).toBe(draftVersion);
		expect(agentHistoryRepository.saveVersion).toHaveBeenCalledWith(
			expect.objectContaining({ versionId: draftVersion }),
			expect.anything(),
		);
	});

	it('switches to an existing history row when publishing a specific version', async () => {
		const { service, agentRepository, agentHistoryRepository, trx } = makeService();
		const agent = makeAgent({ versionId: 'draft-v2', activeVersionId: 'v0' });
		const target = makeHistory({ versionId: 'v1' });

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);

		await service.publishAgent(agentId, projectId, user, 'v1');

		expect(agent.activeVersionId).toBe('v1');
		expect(agent.activeVersion).toBe(target);
		expect(agent.versionId).not.toBe('draft-v2');
		expect(trx.save).toHaveBeenCalledWith(agent);
	});

	it('reverts draft fields and task bodies from the active published snapshot', async () => {
		const { service, agentRepository, taskSnapshotRepository, taskRepo } = makeService();
		const activeVersion = makeHistory({
			versionId: 'published-v1',
			schema,
			tools: { tool: { descriptor: { name: 'published' } } } as unknown as AgentHistory['tools'],
			skills: { skill: { name: 'Skill', description: 'desc', instructions: 'Use it' } },
		});
		const agent = makeAgent({
			name: 'Draft Agent',
			versionId: 'draft-v2',
			activeVersionId: 'published-v1',
			activeVersion,
			schema: { ...schema, name: 'Draft Agent' },
			tools: {},
			skills: {},
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([makeTaskSnapshot()]);
		taskRepo.findBy.mockResolvedValue([{ id: 'task-1' }, { id: 'draft-only' }]);

		await expect(service.revertToPublishedAgent(agentId, projectId)).resolves.toBe(agent);

		expect(agent.schema).toEqual(schema);
		expect(agent.name).toBe(schema.name);
		expect(agent.versionId).toBe('published-v1');
		expect(agent.tools).toEqual(activeVersion.tools);
		expect(agent.skills).toEqual(activeVersion.skills);
		expect(taskRepo.delete).toHaveBeenCalledWith(['draft-only']);
		expect(taskRepo.update).toHaveBeenCalledWith(
			'task-1',
			expect.objectContaining({ objective: 'Summarize messages' }),
		);
	});

	it('reverts to a selected history row and task snapshot without changing the active published version', async () => {
		const { service, agentRepository, agentHistoryRepository, taskSnapshotRepository, taskRepo } =
			makeService();
		const agent = makeAgent({
			activeVersionId: 'current-active',
			activeVersion: makeHistory({ versionId: 'current-active' }),
		});
		const target = makeHistory({
			versionId: 'older-version',
			schema: { ...schema, name: 'Older Agent' },
		});

		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentHistoryRepository.findByVersionAndAgentId.mockResolvedValue(target);
		taskSnapshotRepository.findByVersionId.mockResolvedValue([
			makeTaskSnapshot({
				versionId: 'older-version',
				taskId: 'task-1',
				name: 'Older task',
				objective: 'Use the older task objective',
			}),
		]);
		taskRepo.findBy.mockResolvedValue([{ id: 'task-1' }, { id: 'draft-only' }]);

		await service.revertToVersion(agentId, projectId, 'older-version');

		expect(agent.schema).toEqual(target.schema);
		expect(agent.name).toBe('Older Agent');
		expect(agent.activeVersionId).toBe('current-active');
		expect(agent.versionId).not.toBe('older-version');
		expect(taskRepo.delete).toHaveBeenCalledWith(['draft-only']);
		expect(taskRepo.update).toHaveBeenCalledWith(
			'task-1',
			expect.objectContaining({ objective: 'Use the older task objective' }),
		);
	});

	it('maps publish history rows and marks the active version', async () => {
		const { service, agentRepository, agentHistoryRepository } = makeService();
		const active = makeHistory({ versionId: 'active-version', author: 'Ada Lovelace' });
		const inactive = makeHistory({ versionId: 'old-version', author: 'Grace Hopper' });

		agentRepository.findByIdAndProjectId.mockResolvedValue(
			makeAgent({ activeVersionId: 'active-version' }),
		);
		agentHistoryRepository.findByAgentId.mockResolvedValue([active, inactive]);

		await expect(service.listPublishHistory(agentId, projectId, 20, 0)).resolves.toEqual([
			expect.objectContaining({
				versionId: 'active-version',
				author: 'Ada Lovelace',
				isActive: true,
			}),
			expect.objectContaining({
				versionId: 'old-version',
				author: 'Grace Hopper',
				isActive: false,
			}),
		]);
	});
});
