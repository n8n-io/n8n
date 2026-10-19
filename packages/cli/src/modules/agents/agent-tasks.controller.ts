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

import { CollaborationService } from '@/collaboration/collaboration.service';

import { AgentTaskService } from './agent-task.service';
import { AgentRepository } from './repositories/agent.repository';
import { getAgentOrThrow } from './utils/get-agent-or-throw';

@RestController('/projects/:projectId/agents/v2')
export class AgentTasksController {
	constructor(
		private readonly agentTaskService: AgentTaskService,
		private readonly agentRepository: AgentRepository,
		private readonly collaborationService: CollaborationService,
	) {}

	@Get('/:agentId/tasks')
	@ProjectScope('agent:read')
	async listTasks(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
	): Promise<AgentTaskDto[]> {
		await getAgentOrThrow(this.agentRepository, agentId, req.params.projectId);
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
		const projectId = req.params.projectId;
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const clientId = req.headers?.['push-ref'];
		await this.collaborationService.validateAgentWriteLock(
			req.user.id,
			clientId,
			projectId,
			agentId,
			'create task for',
		);
		return await this.agentTaskService.create(agentId, projectId, payload, {
			user: req.user,
			modifiedBy: 'user',
			pushRef: req.headers?.['push-ref'],
		});
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
		const projectId = req.params.projectId;
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const clientId = req.headers?.['push-ref'];
		await this.collaborationService.validateAgentWriteLock(
			req.user.id,
			clientId,
			projectId,
			agentId,
			'update task for',
		);
		return await this.agentTaskService.update(agentId, projectId, taskId, payload, {
			user: req.user,
			modifiedBy: 'user',
			pushRef: req.headers?.['push-ref'],
		});
	}

	@Delete('/:agentId/tasks/:taskId')
	@ProjectScope('agent:update')
	async deleteTask(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('taskId') taskId: string,
	): Promise<{ success: true }> {
		const projectId = req.params.projectId;
		await getAgentOrThrow(this.agentRepository, agentId, projectId);
		const clientId = req.headers?.['push-ref'];
		await this.collaborationService.validateAgentWriteLock(
			req.user.id,
			clientId,
			projectId,
			agentId,
			'delete task for',
		);
		await this.agentTaskService.delete(agentId, projectId, taskId, {
			user: req.user,
			modifiedBy: 'user',
			pushRef: req.headers?.['push-ref'],
		});
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
		await getAgentOrThrow(this.agentRepository, agentId, req.params.projectId);
		await this.agentTaskService.runNow(agentId, taskId, req.user);
		return { success: true };
	}
}
