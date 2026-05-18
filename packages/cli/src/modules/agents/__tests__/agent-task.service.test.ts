/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import { mockLogger } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import { AgentTaskService } from '../agent-task.service';
import type { AgentsService } from '../agents.service';
import type { AgentTask } from '../entities/agent-task.entity';
import type { Agent } from '../entities/agent.entity';

async function* emptyStream() {}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: 'agent-1',
		projectId: 'project-1',
		name: 'Task Agent',
		publishedVersion: {
			publishedById: 'user-1',
			schema: null,
		},
		...overrides,
	} as unknown as Agent;
}

function makeTask(overrides: Partial<AgentTask> = {}): AgentTask {
	const now = new Date('2026-05-17T10:00:00Z');
	return {
		id: 'task-1',
		agentId: 'agent-1',
		projectId: 'project-1',
		name: 'Daily check',
		goal: 'Check the project status.',
		cronExpression: '0 9 * * *',
		active: true,
		lastRunAt: null,
		createdAt: now,
		updatedAt: now,
		agent: makeAgent(),
		...overrides,
	} as unknown as AgentTask;
}

describe('AgentTaskService', () => {
	let service: AgentTaskService;
	let agentTaskRepository: {
		create: jest.Mock;
		save: jest.Mock;
		update: jest.Mock;
		remove: jest.Mock;
		findByAgent: jest.Mock;
		findByIdAndAgent: jest.Mock;
		findActiveWithAgents: jest.Mock;
		findWithAgent: jest.Mock;
	};
	let agentRepository: { findByIdAndProjectId: jest.Mock };
	let projectRelationRepository: { findUserIdsByProjectId: jest.Mock };
	let agentsService: jest.Mocked<AgentsService>;

	beforeEach(() => {
		jest.clearAllMocks();

		agentTaskRepository = {
			create: jest.fn((task: AgentTask) => ({
				...task,
				createdAt: new Date('2026-05-17T10:00:00Z'),
				updatedAt: new Date('2026-05-17T10:00:00Z'),
			})),
			save: jest.fn(async (task: AgentTask) => task),
			update: jest.fn(),
			remove: jest.fn(),
			findByAgent: jest.fn(),
			findByIdAndAgent: jest.fn(),
			findActiveWithAgents: jest.fn(),
			findWithAgent: jest.fn(),
		};
		agentRepository = {
			findByIdAndProjectId: jest.fn(),
		};
		projectRelationRepository = {
			findUserIdsByProjectId: jest.fn(async () => ['user-1']),
		};
		agentsService = mock<AgentsService>();
		agentsService.executeForTaskPublished.mockReturnValue(emptyStream() as never);

		service = new AgentTaskService(
			mockLogger(),
			mock<GlobalConfig>({ generic: { timezone: 'Europe/Berlin' } }),
			agentTaskRepository as never,
			agentRepository as never,
			agentsService,
			projectRelationRepository as never,
		);
	});

	afterEach(() => {
		service.stopAll();
	});

	it('creates multiple active tasks and registers their schedules', async () => {
		const agent = makeAgent();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		agentTaskRepository.save.mockImplementation(async (task: AgentTask) => task);
		agentTaskRepository.findWithAgent.mockImplementation(async (taskId: string) =>
			makeTask({ id: taskId, agent }),
		);

		const first = await service.create('project-1', 'agent-1', {
			name: 'Morning check',
			goal: 'Check overnight events.',
			cronExpression: '0 9 * * *',
			active: true,
		});
		const second = await service.create('project-1', 'agent-1', {
			name: 'Evening check',
			goal: 'Summarize the day.',
			cronExpression: '0 18 * * *',
			active: true,
		});

		expect(first.id).not.toBe(second.id);
		expect(agentTaskRepository.save).toHaveBeenCalledTimes(2);
		expect(agentTaskRepository.findWithAgent).toHaveBeenCalledWith(first.id);
		expect(agentTaskRepository.findWithAgent).toHaveBeenCalledWith(second.id);
	});

	it('rejects activating a task until the agent is published', async () => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(makeAgent({ publishedVersion: null }));

		await expect(
			service.create('project-1', 'agent-1', {
				name: 'Daily check',
				goal: 'Check status.',
				cronExpression: '0 9 * * *',
				active: true,
			}),
		).rejects.toBeInstanceOf(ConflictError);
		expect(agentTaskRepository.save).not.toHaveBeenCalled();
	});

	it('runs each task execution in a fresh thread with stable task resource scope', async () => {
		const task = makeTask({
			id: 'task-42',
			name: 'Weekly summary',
			goal: 'Summarize customer feedback.',
		});
		agentTaskRepository.findWithAgent.mockResolvedValue(task);

		await service.runTask(task.id, { requireActive: false });
		await service.runTask(task.id, { requireActive: false });

		expect(agentTaskRepository.update).toHaveBeenCalledWith(task.id, {
			lastRunAt: expect.any(Date),
		});
		const [firstRun, secondRun] = agentsService.executeForTaskPublished.mock.calls.map(
			([config]) => config,
		);
		expect(firstRun).toEqual(
			expect.objectContaining({
				agentId: task.agentId,
				projectId: task.projectId,
				message: expect.stringContaining('Weekly summary'),
				memory: {
					threadId: expect.any(String),
					resourceId: `agent-task:${task.id}`,
				},
			}),
		);
		expect(firstRun.memory.threadId).toHaveLength(36);
		expect(secondRun.memory.threadId).toHaveLength(36);
		expect(secondRun.memory.threadId).not.toBe(firstRun.memory.threadId);
		expect(secondRun.memory.resourceId).toBe(firstRun.memory.resourceId);
		expect(agentsService.executeForTaskPublished).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('Summarize customer feedback.'),
			}),
		);
	});

	it('returns the new execution thread when starting a manual run', async () => {
		const task = makeTask({ id: 'task-manual', active: false });
		agentTaskRepository.findByIdAndAgent.mockResolvedValue(task);
		const runTaskSpy = jest.spyOn(service, 'runTask').mockResolvedValue();

		const result = await service.runNow('project-1', 'agent-1', task.id);

		expect(result).toEqual({ threadId: expect.any(String), status: 'started' });
		expect(result.threadId).toHaveLength(36);
		expect(runTaskSpy).toHaveBeenCalledWith(task.id, {
			requireActive: false,
			threadId: result.threadId,
		});
	});
});
