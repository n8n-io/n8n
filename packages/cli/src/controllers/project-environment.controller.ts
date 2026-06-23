import { CreateEnvironmentDto, UpdateEnvironmentDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Middleware,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import { Response, NextFunction } from 'express';

import { ProjectEnvironmentService } from '@/services/project-environment.service';
import { ProjectService } from '@/services/project.service.ee';

@RestController('/projects/:projectId/environments')
export class ProjectEnvironmentController {
	constructor(
		private readonly environmentService: ProjectEnvironmentService,
		private readonly projectService: ProjectService,
	) {}

	@Middleware()
	async validateProjectExists(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: Response,
		next: NextFunction,
	) {
		try {
			await this.projectService.getProject(req.params.projectId);
			next();
		} catch {
			res.status(404).send('Project not found');
		}
	}

	@Get('/')
	@ProjectScope('projectEnvironment:list')
	//@Licensed('feat:environments')
	async getEnvironments(req: AuthenticatedRequest<{ projectId: string }>) {
		return await this.environmentService.getEnvironments(req.params.projectId);
	}

	@Post('/')
	@ProjectScope('projectEnvironment:create')
	//@Licensed('feat:environments')
	async createEnvironment(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body payload: CreateEnvironmentDto,
	) {
		return await this.environmentService.createEnvironment(req.params.projectId, payload);
	}

	@Patch('/:envId')
	@ProjectScope('projectEnvironment:update')
	//@Licensed('feat:environments')
	async updateEnvironment(
		req: AuthenticatedRequest<{ projectId: string; envId: string }>,
		_res: Response,
		@Body payload: UpdateEnvironmentDto,
	) {
		const { projectId, envId } = req.params;
		return await this.environmentService.updateEnvironment(projectId, envId, payload);
	}

	@Delete('/:envId')
	@ProjectScope('projectEnvironment:delete')
	//@Licensed('feat:environments')
	async deleteEnvironment(req: AuthenticatedRequest<{ projectId: string; envId: string }>) {
		const { projectId, envId } = req.params;
		await this.environmentService.deleteEnvironment(projectId, envId);
		return true;
	}
}
