import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import type { ProjectRelationRepository } from '@n8n/db';
import { CronJob } from 'cron';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentTaskService } from '../agent-task.service';
import type { AgentsService } from '../agents.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentTask } from '../entities/agent-task.entity';
import type { AgentRepository } from '../repositories/agent.repository';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';

// Keep cron validation + next-occurrence real; only the live CronJob is mocked.
jest.mock('cron', () => {
	const actual = jest.requireActual('cron');
	return { ...actual, CronJob: jest.fn() };
});

const CronJobMock = CronJob as unknown as jest.Mock;
const AGENT_ID = 'agent-1';

function makeTask(overrides: Partial<AgentTask> = {}): AgentTask {
	return {
		id: 'task-1',
		agentId: AGENT_ID,
		name: 'Daily summary',
		objective: 'Summarize messages',
		cronExpression: '0 9 * * *',
		enabled: true,
		lastRunAt: null,
		lastRunStatus: null,
		createdAt: new Date('2026-01-01T08:00:00.000Z'),
		updatedAt: new Date('2026-01-02T08:00:00.000Z'),
		...overrides,
	} as AgentTask;
}

function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: AGENT_ID,
		projectId: 'project-1',
		activeVersionId: 'ver-1',
		activeVersion: { publishedById: 'user-1' },
		...overrides,
	} as Agent;
}

async function* emptyStream(): AsyncGenerator<never> {}

async function* throwingStream(): AsyncGenerator<never> {
	throw new Error('execution failed');
}

function runTaskOf(service: AgentTaskService, taskId: string): Promise<void> {
	return (service as unknown as { runTask(id: string): Promise<void> }).runTask(taskId);
}

describe('AgentTaskService', () => {
	const logger = mock<Logger>();
	const globalConfig = { generic: { timezone: 'UTC' } } as unknown as GlobalConfig;
	let taskRepository: ReturnType<typeof mock<AgentTaskRepository>>;
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let projectRelationRepository: ReturnType<typeof mock<ProjectRelationRepository>>;
	let agentsService: ReturnType<typeof mock<AgentsService>>;
	let service: AgentTaskService;

	beforeEach(() => {
		jest.clearAllMocks();
		CronJobMock.mockImplementation(() => ({ start: jest.fn(), stop: jest.fn() }));
		taskRepository = mock<AgentTaskRepository>();
		agentRepository = mock<AgentRepository>();
		projectRelationRepository = mock<ProjectRelationRepository>();
		agentsService = mock<AgentsService>();
		service = new AgentTaskService(
			logger,
			globalConfig,
			taskRepository,
			agentRepository,
			projectRelationRepository,
			agentsService,
		);
	});

	describe('create', () => {
		it('persists a valid task and returns a DTO with a computed nextRunAt', async () => {
			const saved = makeTask();
			(taskRepository.save as jest.Mock).mockResolvedValue(saved);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			const dto = await service.create(AGENT_ID, {
				name: saved.name,
				objective: saved.objective,
				cronExpression: saved.cronExpression,
				enabled: true,
			});

			expect(taskRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({ agentId: AGENT_ID, name: saved.name, enabled: true }),
			);
			expect(dto.id).toBe('task-1');
			expect(dto.nextRunAt).not.toBeNull();
		});

		it('rejects an invalid cron without saving', async () => {
			await expect(
				service.create(AGENT_ID, {
					name: 'x',
					objective: 'y',
					cronExpression: 'not-a-cron',
					enabled: true,
				}),
			).rejects.toThrow(BadRequestError);
			expect(taskRepository.save).not.toHaveBeenCalled();
		});

		it('registers a cron job when the agent is published and the task is enabled', async () => {
			(taskRepository.save as jest.Mock).mockResolvedValue(makeTask({ enabled: true }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			await service.create(AGENT_ID, {
				name: 'x',
				objective: 'y',
				cronExpression: '0 9 * * *',
				enabled: true,
			});

			expect(CronJobMock).toHaveBeenCalledTimes(1);
			expect(CronJobMock).toHaveBeenCalledWith(
				'0 9 * * *',
				expect.any(Function),
				null,
				true,
				'UTC',
			);
		});

		it('does not register a job when the agent is unpublished', async () => {
			(taskRepository.save as jest.Mock).mockResolvedValue(makeTask({ enabled: true }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await service.create(AGENT_ID, {
				name: 'x',
				objective: 'y',
				cronExpression: '0 9 * * *',
				enabled: true,
			});

			expect(CronJobMock).not.toHaveBeenCalled();
		});
	});

	describe('list / update / mapping', () => {
		it('maps tasks to DTOs and nulls nextRunAt for disabled tasks', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([
				makeTask({ id: 't1' }),
				makeTask({ id: 't2', enabled: false }),
			]);

			const result = await service.list(AGENT_ID);

			expect(result.map((task) => task.id)).toEqual(['t1', 't2']);
			expect(result[1].nextRunAt).toBeNull();
		});

		it('serializes dates to ISO strings and passes through lastRunStatus', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([
				makeTask({ lastRunAt: new Date('2026-03-03T03:03:03.000Z'), lastRunStatus: 'error' }),
			]);

			const [dto] = await service.list(AGENT_ID);

			expect(dto.lastRunAt).toBe('2026-03-03T03:03:03.000Z');
			expect(dto.lastRunStatus).toBe('error');
			expect(dto.createdAt).toBe('2026-01-01T08:00:00.000Z');
		});

		it('applies fields and re-registers when cron changes', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(taskRepository.save as jest.Mock).mockImplementation(async (entity) => entity);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			const dto = await service.update(AGENT_ID, 'task-1', { cronExpression: '0 10 * * *' });

			expect(dto.cronExpression).toBe('0 10 * * *');
			expect(CronJobMock).toHaveBeenCalledWith(
				'0 10 * * *',
				expect.any(Function),
				null,
				true,
				'UTC',
			);
		});

		it('throws NotFoundError when updating a missing task', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);
			await expect(service.update(AGENT_ID, 'missing', { name: 'x' })).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('setEnabled', () => {
		it('disabling clears nextRunAt and deregisters the job', async () => {
			const task = makeTask({ enabled: true });
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(taskRepository.save as jest.Mock).mockImplementation(async (entity) => entity);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			// First enable to create a job, then disable.
			await service.setEnabled(AGENT_ID, 'task-1', true);
			const firstJob = CronJobMock.mock.results[0].value;

			const dto = await service.setEnabled(AGENT_ID, 'task-1', false);

			expect(firstJob.stop).toHaveBeenCalled();
			expect(dto.enabled).toBe(false);
			expect(dto.nextRunAt).toBeNull();
		});
	});

	describe('delete', () => {
		it('throws NotFoundError when the task is missing', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);
			await expect(service.delete(AGENT_ID, 'missing')).rejects.toThrow(NotFoundError);
			expect(taskRepository.remove).not.toHaveBeenCalled();
		});

		it('removes the task and deregisters its job', async () => {
			const task = makeTask({ enabled: true });
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(taskRepository.save as jest.Mock).mockImplementation(async (entity) => entity);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			await service.setEnabled(AGENT_ID, 'task-1', true); // register
			const job = CronJobMock.mock.results[0].value;

			await service.delete(AGENT_ID, 'task-1');

			expect(taskRepository.remove).toHaveBeenCalledWith(task);
			expect(job.stop).toHaveBeenCalled();
		});
	});

	describe('deregisterAgentTasks', () => {
		it("stops only the matching agent's jobs", async () => {
			(taskRepository.save as jest.Mock).mockImplementation(async (entity) => entity);
			(taskRepository.findByIdAndAgentId as jest.Mock).mockImplementation(async (id: string) =>
				makeTask({ id, agentId: id === 'a-task' ? 'agent-a' : 'agent-b' }),
			);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			await service.setEnabled('agent-a', 'a-task', true);
			await service.setEnabled('agent-b', 'b-task', true);
			const jobA = CronJobMock.mock.results[0].value;
			const jobB = CronJobMock.mock.results[1].value;

			service.deregisterAgentTasks('agent-a');

			expect(jobA.stop).toHaveBeenCalled();
			expect(jobB.stop).not.toHaveBeenCalled();
		});
	});

	describe('runTask', () => {
		it('runs the published agent with the objective and records success', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ enabled: true }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(emptyStream());

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: AGENT_ID,
					projectId: 'project-1',
					taskId: 'task-1',
					message: expect.stringContaining('Summarize messages'),
					memory: expect.objectContaining({ resourceId: 'task:task-1' }),
				}),
			);
			expect(taskRepository.update).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({ lastRunStatus: 'success' }),
			);
		});

		it('skips and deregisters when the agent is unpublished', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ enabled: true }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('records error status when execution throws', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ enabled: true }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(throwingStream());

			await runTaskOf(service, 'task-1');

			expect(taskRepository.update).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({ lastRunStatus: 'error' }),
			);
		});
	});
});
