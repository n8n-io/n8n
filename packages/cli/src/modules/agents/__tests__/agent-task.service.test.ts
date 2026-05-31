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
		lastRunAt: null,
		lastRunStatus: null,
		createdAt: new Date('2026-01-01T08:00:00.000Z'),
		updatedAt: new Date('2026-01-02T08:00:00.000Z'),
		...overrides,
	} as AgentTask;
}

/**
 * `tasks` are the PUBLISHED config refs (on `activeVersion.schema`) and the DRAFT
 * refs (on `schema`). Pass refs via overrides to exercise scheduling.
 */
function makeAgent(overrides: Partial<Agent> = {}): Agent {
	return {
		id: AGENT_ID,
		projectId: 'project-1',
		versionId: 'ver-1',
		activeVersionId: 'ver-1',
		activeVersion: { publishedById: 'user-1', schema: { tasks: [] } },
		schema: { name: 'A', model: 'anthropic/x', instructions: 'do', tasks: [] },
		...overrides,
	} as Agent;
}

async function* emptyStream(): AsyncGenerator<never> {}

// eslint-disable-next-line require-yield
async function* throwingStream(): AsyncGenerator<never> {
	throw new Error('execution failed');
}

async function runTaskOf(service: AgentTaskService, taskId: string): Promise<void> {
	await (service as unknown as { runTask(id: string): Promise<void> }).runTask(taskId);
}

describe('AgentTaskService', () => {
	const logger = mock<Logger>();
	const globalConfig = { generic: { timezone: 'UTC' } } as unknown as GlobalConfig;
	let taskRepository: ReturnType<typeof mock<AgentTaskRepository>>;
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let projectRelationRepository: ReturnType<typeof mock<ProjectRelationRepository>>;
	let agentsService: ReturnType<typeof mock<AgentsService>>;
	let txManager: { save: jest.Mock; remove: jest.Mock };
	let service: AgentTaskService;

	beforeEach(() => {
		jest.clearAllMocks();
		CronJobMock.mockImplementation(() => ({ start: jest.fn(), stop: jest.fn() }));
		taskRepository = mock<AgentTaskRepository>();
		// `create` fills the body so `save`/`toDto` see a complete entity.
		(taskRepository.create as unknown as jest.Mock).mockImplementation((data: Partial<AgentTask>) =>
			makeTask(data),
		);
		agentRepository = mock<AgentRepository>();
		// `manager` is a TypeORM getter, not auto-mocked; run transaction callbacks
		// against a manager that records save/remove.
		txManager = {
			save: jest.fn(async (e: unknown) => e),
			remove: jest.fn(async (e: unknown) => e),
		};
		(agentRepository as unknown as { manager: unknown }).manager = {
			transaction: jest.fn(
				async (cb: (m: typeof txManager) => Promise<unknown>) => await cb(txManager),
			),
		};
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
		it('creates the body and attaches a config ref enabled', async () => {
			const agent = makeAgent({
				schema: { name: 'a', model: 'm', instructions: 'i', tasks: [] },
			} as Partial<Agent>);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(agent);

			const dto = await service.create(AGENT_ID, {
				name: 'Daily',
				objective: 'Do X',
				cronExpression: '0 9 * * *',
				enabled: true,
			});

			expect(dto.id).toMatch(/^task_/);
			expect(dto.name).toBe('Daily');
			expect(taskRepository.create).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringMatching(/^task_/),
					agentId: AGENT_ID,
					name: 'Daily',
					objective: 'Do X',
					cronExpression: '0 9 * * *',
				}),
			);
			expect(agent.schema?.tasks).toEqual([
				{ type: 'task', id: expect.stringMatching(/^task_/), enabled: true },
			]);
			expect(txManager.save).toHaveBeenCalled();
		});

		it('rejects an invalid cron without creating', async () => {
			await expect(
				service.create(AGENT_ID, {
					name: 'x',
					objective: 'y',
					cronExpression: 'not-a-cron',
					enabled: true,
				}),
			).rejects.toThrow(BadRequestError);
			expect(taskRepository.create).not.toHaveBeenCalled();
		});

		it('does not register a cron job on create (scheduling follows publish)', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({
					schema: { name: 'a', model: 'm', instructions: 'i', tasks: [] },
				} as Partial<Agent>),
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

	describe('list', () => {
		it('maps task bodies to DTOs', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([
				makeTask({ id: 't1' }),
				makeTask({ id: 't2' }),
			]);

			const result = await service.list(AGENT_ID);

			expect(result.map((task) => task.id)).toEqual(['t1', 't2']);
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
	});

	describe('update', () => {
		it('updates body fields without registering a cron (publish-driven)', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());

			const dto = await service.update(AGENT_ID, 'task-1', { cronExpression: '0 10 * * *' });

			expect(dto.cronExpression).toBe('0 10 * * *');
			expect(task.cronExpression).toBe('0 10 * * *');
			expect(txManager.save).toHaveBeenCalled();
			expect(CronJobMock).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when updating a missing task', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);
			await expect(service.update(AGENT_ID, 'missing', { name: 'x' })).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('delete', () => {
		it('throws NotFoundError when the task is missing', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);
			await expect(service.delete(AGENT_ID, 'missing')).rejects.toThrow(NotFoundError);
			expect(txManager.remove).not.toHaveBeenCalled();
		});

		it('removes the body and drops its config ref', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			const agent = makeAgent({
				schema: {
					name: 'a',
					model: 'm',
					instructions: 'i',
					tasks: [{ type: 'task', id: 'task-1', enabled: true }],
				},
			} as Partial<Agent>);
			(agentRepository.findOne as jest.Mock).mockResolvedValue(agent);

			await service.delete(AGENT_ID, 'task-1');

			expect(txManager.remove).toHaveBeenCalledWith(task);
			expect(agent.schema?.tasks).toEqual([]);
		});
	});

	describe('registerEnabledForAgent', () => {
		it('registers a cron job for each enabled task in the published config', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({
					activeVersion: {
						publishedById: 'user-1',
						schema: { tasks: [{ type: 'task', id: 'task-1', enabled: true }] },
					},
				} as Partial<Agent>),
			);
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([makeTask({ id: 'task-1' })]);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).toHaveBeenCalledWith(
				'0 9 * * *',
				expect.any(Function),
				null,
				true,
				'UTC',
			);
		});

		it('does not register tasks disabled in the published config', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({
					activeVersion: {
						publishedById: 'user-1',
						schema: { tasks: [{ type: 'task', id: 'task-1', enabled: false }] },
					},
				} as Partial<Agent>),
			);
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([makeTask({ id: 'task-1' })]);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).not.toHaveBeenCalled();
		});

		it('registers nothing when the agent is unpublished', async () => {
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await service.registerEnabledForAgent(AGENT_ID);

			expect(CronJobMock).not.toHaveBeenCalled();
		});
	});

	describe('deregisterAgentTasks', () => {
		it("stops only the matching agent's jobs", async () => {
			(agentRepository.findOne as jest.Mock)
				.mockResolvedValueOnce(
					makeAgent({
						id: 'agent-a',
						activeVersion: { schema: { tasks: [{ type: 'task', id: 'a-task', enabled: true }] } },
					} as Partial<Agent>),
				)
				.mockResolvedValueOnce(
					makeAgent({
						id: 'agent-b',
						activeVersion: { schema: { tasks: [{ type: 'task', id: 'b-task', enabled: true }] } },
					} as Partial<Agent>),
				);
			(taskRepository.findByAgentId as jest.Mock)
				.mockResolvedValueOnce([makeTask({ id: 'a-task', agentId: 'agent-a' })])
				.mockResolvedValueOnce([makeTask({ id: 'b-task', agentId: 'agent-b' })]);

			await service.registerEnabledForAgent('agent-a');
			await service.registerEnabledForAgent('agent-b');
			const jobA = CronJobMock.mock.results[0].value;
			const jobB = CronJobMock.mock.results[1].value;

			service.deregisterAgentTasks('agent-a');

			expect(jobA.stop).toHaveBeenCalled();
			expect(jobB.stop).not.toHaveBeenCalled();
		});
	});

	describe('runTask', () => {
		const publishedAgentWithTask = (enabled: boolean) =>
			makeAgent({
				activeVersion: {
					publishedById: 'user-1',
					schema: { tasks: [{ type: 'task', id: 'task-1', enabled }] },
				},
			} as Partial<Agent>);

		it('runs the published agent with the objective and records success', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ id: 'task-1' }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
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

		it('skips when the agent is unpublished', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ id: 'task-1' }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('skips when the ref is not enabled in the published config', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ id: 'task-1' }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(false));

			await runTaskOf(service, 'task-1');

			expect(agentsService.executeForTaskPublished).not.toHaveBeenCalled();
		});

		it('records error status when execution throws', async () => {
			(taskRepository.findOne as jest.Mock).mockResolvedValue(makeTask({ id: 'task-1' }));
			(agentRepository.findOne as jest.Mock).mockResolvedValue(publishedAgentWithTask(true));
			(projectRelationRepository.findUserIdsByProjectId as jest.Mock).mockResolvedValue(['user-1']);
			(agentsService.executeForTaskPublished as jest.Mock).mockReturnValue(throwingStream());

			await runTaskOf(service, 'task-1');

			expect(taskRepository.update).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({ lastRunStatus: 'error' }),
			);
		});
	});

	describe('runNow', () => {
		it('runs the task immediately as the requesting user even when unpublished', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(makeTask());
			(agentRepository.findOne as jest.Mock).mockResolvedValue(
				makeAgent({ activeVersionId: null }),
			);
			(agentsService.executeForTaskNow as jest.Mock).mockReturnValue(emptyStream());

			await service.runNow(AGENT_ID, 'task-1', 'user-9');

			expect(agentsService.executeForTaskNow).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: AGENT_ID,
					projectId: 'project-1',
					userId: 'user-9',
					taskId: 'task-1',
					message: expect.stringContaining('Summarize messages'),
					memory: expect.objectContaining({ resourceId: 'task:task-1' }),
				}),
			);
		});

		it('throws NotFoundError when the task does not exist', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);

			await expect(service.runNow(AGENT_ID, 'missing', 'user-9')).rejects.toThrow(NotFoundError);
			expect(agentsService.executeForTaskNow).not.toHaveBeenCalled();
		});

		it('records a successful manual run', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(makeTask());
			(agentRepository.findOne as jest.Mock).mockResolvedValue(makeAgent());
			(agentsService.executeForTaskNow as jest.Mock).mockReturnValue(emptyStream());

			await service.runNow(AGENT_ID, 'task-1', 'user-9');
			await new Promise((resolve) => setImmediate(resolve));

			expect(taskRepository.update).toHaveBeenCalledWith(
				'task-1',
				expect.objectContaining({ lastRunStatus: 'success' }),
			);
		});
	});
});
