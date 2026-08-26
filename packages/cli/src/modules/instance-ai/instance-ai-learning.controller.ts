import {
	ListInstanceAiLearningsQueryDto,
	StartInstanceAiLearningRunDto,
	UpdateInstanceAiLearningDto,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { InstanceAiLearningService } from './instance-ai-learning.service';

@RestController('/projects/:projectId/ai-learnings')
export class InstanceAiLearningController {
	constructor(private readonly learningService: InstanceAiLearningService) {}

	@Post('/runs')
	@ProjectScope('workflow:read')
	async startRun(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Body payload: StartInstanceAiLearningRunDto,
	) {
		const run = await this.learningService.startRun(req.user, projectId, payload);
		res.status(202);
		return run;
	}

	@Get('/runs/:runId')
	@ProjectScope('workflow:read')
	async getRun(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('runId') runId: string,
	) {
		return await this.learningService.getRun(projectId, runId);
	}

	@Get('/')
	@ProjectScope('workflow:read')
	async list(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: ListInstanceAiLearningsQueryDto,
	) {
		return await this.learningService.list(projectId, query);
	}

	@Patch('/:learningId')
	@ProjectScope('workflow:update')
	async update(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('learningId') learningId: string,
		@Body payload: UpdateInstanceAiLearningDto,
	) {
		return await this.learningService.update(req.user, projectId, learningId, payload);
	}

	@Delete('/:learningId')
	@ProjectScope('workflow:update')
	async delete(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Param('learningId') learningId: string,
	) {
		await this.learningService.delete(projectId, learningId);
		return { success: true };
	}
}
