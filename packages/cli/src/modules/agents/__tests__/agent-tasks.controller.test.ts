import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { AgentTaskService } from '../agent-task.service';
import { AgentTasksController } from '../agent-tasks.controller';
import type { AgentRepository } from '../repositories/agent.repository';
import {
	expectProjectScopedAgentRoutes,
	getRoutesByHandlerName,
} from './test-utils/controller-route-metadata';

function makeController({
	agentTaskService = mock<AgentTaskService>(),
	agentRepository = mock<AgentRepository>(),
}: {
	agentTaskService?: Mocked<AgentTaskService>;
	agentRepository?: Mocked<AgentRepository>;
} = {}) {
	return {
		controller: new AgentTasksController(agentTaskService, agentRepository),
		agentTaskService,
		agentRepository,
	};
}

describe('AgentTasksController route access scopes', () => {
	expectProjectScopedAgentRoutes(AgentTasksController);

	const routes = getRoutesByHandlerName(AgentTasksController);

	it.each([
		['listTasks', 'agent:read'],
		['createTask', 'agent:update'],
		['updateTask', 'agent:update'],
		['deleteTask', 'agent:update'],
		['runTaskNow', 'agent:execute'],
	])('%s uses %s', (handlerName, scope) => {
		expect(routes.get(handlerName)?.accessScope?.scope).toBe(scope);
	});
});

describe('AgentTasksController tasks', () => {
	const agent = { id: 'agent-1', projectId: 'project-1' } as never;
	const req = { params: { projectId: 'project-1' } } as never;

	it('lists tasks for the agent', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const tasks = [{ id: 'task-1' }] as never;
		agentTaskService.list.mockResolvedValue(tasks);

		const result = await controller.listTasks(req, undefined as never, 'agent-1');

		expect(agentTaskService.list).toHaveBeenCalledWith('agent-1');
		expect(result).toBe(tasks);
	});

	it('404s when listing tasks for an agent outside the project', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(controller.listTasks(req, undefined as never, 'agent-1')).rejects.toThrow(
			NotFoundError,
		);
		expect(agentTaskService.list).not.toHaveBeenCalled();
	});

	it('creates a task', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const created = { id: 'task-1' } as never;
		agentTaskService.create.mockResolvedValue(created);
		const payload = {
			name: 'Daily',
			objective: 'Do X',
			cronExpression: '0 9 * * *',
			enabled: true,
		} as never;

		const result = await controller.createTask(req, undefined as never, 'agent-1', payload);

		expect(agentTaskService.create).toHaveBeenCalledWith('agent-1', payload);
		expect(result).toBe(created);
	});

	it('updates a task', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const updated = { id: 'task-1' } as never;
		agentTaskService.update.mockResolvedValue(updated);
		const payload = { name: 'Renamed' } as never;

		const result = await controller.updateTask(
			req,
			undefined as never,
			'agent-1',
			'task-1',
			payload,
		);

		expect(agentTaskService.update).toHaveBeenCalledWith('agent-1', 'task-1', payload);
		expect(result).toBe(updated);
	});

	it('deletes a task and returns success', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);

		const result = await controller.deleteTask(req, undefined as never, 'agent-1', 'task-1');

		expect(agentTaskService.delete).toHaveBeenCalledWith('agent-1', 'task-1');
		expect(result).toEqual({ success: true });
	});

	it('404s when deleting a task for an agent outside the project', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);

		await expect(
			controller.deleteTask(req, undefined as never, 'agent-1', 'task-1'),
		).rejects.toThrow(NotFoundError);
		expect(agentTaskService.delete).not.toHaveBeenCalled();
	});

	it('runs a task now as the requesting user', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
		const runReq = { params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never;

		const result = await controller.runTaskNow(runReq, undefined as never, 'agent-1', 'task-1');

		expect(agentTaskService.runNow).toHaveBeenCalledWith('agent-1', 'task-1', { id: 'user-1' });
		expect(result).toEqual({ success: true });
	});

	it('404s when running a task for an agent outside the project', async () => {
		const { controller, agentTaskService, agentRepository } = makeController();
		agentRepository.findByIdAndProjectId.mockResolvedValue(null);
		const runReq = { params: { projectId: 'project-1' }, user: { id: 'user-1' } } as never;

		await expect(
			controller.runTaskNow(runReq, undefined as never, 'agent-1', 'task-1'),
		).rejects.toThrow(NotFoundError);
		expect(agentTaskService.runNow).not.toHaveBeenCalled();
	});
});
