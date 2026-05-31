import type { Logger } from '@n8n/backend-common';
import type { GlobalConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentTaskService } from '../agent-task.service';
import type { AgentTask } from '../entities/agent-task.entity';
import type { AgentTaskRepository } from '../repositories/agent-task.repository';

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

describe('AgentTaskService', () => {
	const logger = mock<Logger>();
	const globalConfig = { generic: { timezone: 'UTC' } } as unknown as GlobalConfig;
	let taskRepository: ReturnType<typeof mock<AgentTaskRepository>>;
	let service: AgentTaskService;

	beforeEach(() => {
		jest.clearAllMocks();
		taskRepository = mock<AgentTaskRepository>();
		service = new AgentTaskService(logger, globalConfig, taskRepository);
	});

	describe('create', () => {
		it('persists a valid task and returns a DTO with a computed nextRunAt', async () => {
			const saved = makeTask();
			(taskRepository.save as jest.Mock).mockResolvedValue(saved);

			const dto = await service.create(AGENT_ID, {
				name: saved.name,
				objective: saved.objective,
				cronExpression: saved.cronExpression,
				enabled: true,
			});

			expect(taskRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: AGENT_ID,
					name: saved.name,
					objective: saved.objective,
					cronExpression: saved.cronExpression,
					enabled: true,
				}),
			);
			expect(dto.id).toBe('task-1');
			expect(dto.nextRunAt).not.toBeNull();
			expect(typeof dto.nextRunAt).toBe('string');
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
	});

	describe('list', () => {
		it('maps the agent tasks to DTOs', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([
				makeTask({ id: 't1' }),
				makeTask({ id: 't2', enabled: false }),
			]);

			const result = await service.list(AGENT_ID);

			expect(taskRepository.findByAgentId).toHaveBeenCalledWith(AGENT_ID);
			expect(result.map((task) => task.id)).toEqual(['t1', 't2']);
			expect(result[1].nextRunAt).toBeNull();
		});
	});

	describe('update', () => {
		it('applies provided fields and returns the updated DTO', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(taskRepository.save as jest.Mock).mockImplementation(async (entity) => entity);

			const dto = await service.update(AGENT_ID, 'task-1', {
				name: 'Renamed',
				cronExpression: '0 10 * * *',
			});

			expect(dto.name).toBe('Renamed');
			expect(dto.cronExpression).toBe('0 10 * * *');
		});

		it('rejects an invalid cron', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(makeTask());

			await expect(service.update(AGENT_ID, 'task-1', { cronExpression: 'bad' })).rejects.toThrow(
				BadRequestError,
			);
		});

		it('throws NotFoundError when the task is missing', async () => {
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(null);

			await expect(service.update(AGENT_ID, 'missing', { name: 'x' })).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('setEnabled', () => {
		it('clears nextRunAt in the returned DTO when disabling', async () => {
			const task = makeTask({ enabled: true });
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);
			(taskRepository.save as jest.Mock).mockImplementation(async (entity) => entity);

			const dto = await service.setEnabled(AGENT_ID, 'task-1', false);

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

		it('removes an existing task', async () => {
			const task = makeTask();
			(taskRepository.findByIdAndAgentId as jest.Mock).mockResolvedValue(task);

			await service.delete(AGENT_ID, 'task-1');

			expect(taskRepository.remove).toHaveBeenCalledWith(task);
		});
	});

	describe('toDto mapping', () => {
		it('serializes dates to ISO strings and passes through lastRunStatus', async () => {
			(taskRepository.findByAgentId as jest.Mock).mockResolvedValue([
				makeTask({ lastRunAt: new Date('2026-03-03T03:03:03.000Z'), lastRunStatus: 'error' }),
			]);

			const [dto] = await service.list(AGENT_ID);

			expect(dto.lastRunAt).toBe('2026-03-03T03:03:03.000Z');
			expect(dto.lastRunStatus).toBe('error');
			expect(dto.createdAt).toBe('2026-01-01T08:00:00.000Z');
			expect(dto.updatedAt).toBe('2026-01-02T08:00:00.000Z');
		});
	});
});
