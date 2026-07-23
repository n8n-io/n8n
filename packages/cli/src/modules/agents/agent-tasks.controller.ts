import { CreateAgentTaskDto, type AgentTaskDto, UpdateAgentTaskDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentTaskService } from './agent-task.service';
import type { Agent } from './entities/agent.entity';
import { AgentRepository } from './repositories/agent.repository';

@RestController('/projects/:projectId/agents/v2')
export class AgentTasksController {
	constructor(
		private readonly agentTaskService: AgentTaskService,
		private readonly agentRepository: AgentRepository,
	) {}

	private async getAgentOrThrow(agentId: string, projectId: string): Promise<Agent> {
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		return agent;
	}

	@Get('/:agentId/tasks')
	@ProjectScope('agent:read')
	async listTasks(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentTaskDto[]> {
		await this.getAgentOrThrow(agentId, req.params.projectId);
		return await this.agentTaskService.list(agentId);
	}

	@Post('/:agentId/tasks')
	@ProjectScope('agent:update')
	async createTask(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: CreateAgentTaskDto,
	): Promise<AgentTaskDto> {
		await this.getAgentOrThrow(agentId, req.params.projectId);
		return await this.agentTaskService.create(agentId, payload);
	}

	@Patch('/:agentId/tasks/:taskId')
	@ProjectScope('agent:update')
	async updateTask(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('taskId') taskId: string,
		@Body payload: UpdateAgentTaskDto,
	): Promise<AgentTaskDto> {
		await this.getAgentOrThrow(agentId, req.params.projectId);
		return await this.agentTaskService.update(agentId, taskId, payload);
	}

	@Delete('/:agentId/tasks/:taskId')
	@ProjectScope('agent:update')
	async deleteTask(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('taskId') taskId: string,
	): Promise<{ success: true }> {
		await this.getAgentOrThrow(agentId, req.params.projectId);
		await this.agentTaskService.delete(agentId, taskId);
		return { success: true };
	}

	@Post('/:agentId/tasks/:taskId/run')
	@ProjectScope('agent:execute')
	async runTaskNow(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('taskId') taskId: string,
	): Promise<{ success: true }> {
		await this.getAgentOrThrow(agentId, req.params.projectId);
		await this.agentTaskService.runNow(agentId, taskId, req.user);
		return { success: true };
	}
}
