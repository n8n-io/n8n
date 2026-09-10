import {
	CreatedProjectPublicDto,
	CreateProjectPublicDto,
	DeleteProjectQueryPublicDto,
	ListProjectsQueryPublicDto,
	ProjectListPublicDto,
	ProjectPublicDto,
	UpdateProjectPublicDto,
	projectIdParamSchema,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, Project } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Delete,
	Get,
	Licensed,
	Param,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';
import { ProjectService } from '@/services/project.service.ee';

const tags = ['Projects'];

const toProjectPublicDto = (project: Project): ProjectPublicDto => ({
	id: project.id,
	name: project.name,
	type: project.type,
	icon: project.icon,
	description: project.description,
	customTelemetryTags: project.customTelemetryTags,
	creatorId: project.creatorId,
	createdAt: project.createdAt.toISOString(),
	updatedAt: project.updatedAt.toISOString(),
});

@PublicApiController('/projects')
export class ProjectsPublicController {
	constructor(private readonly projectService: ProjectService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:list')
	@ApiSummary('Retrieve projects')
	@ApiDescription('Retrieve projects from your instance.')
	@ApiTags(tags)
	@ApiResponse(200, ProjectListPublicDto)
	async getProjects(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListProjectsQueryPublicDto,
	): Promise<ProjectListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { projects, count } = await this.projectService.getProjectsAndCount({ offset, limit });

		return {
			data: projects.map(toProjectPublicDto),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:create')
	@ApiSummary('Create a project')
	@ApiDescription('Create a project on your instance.')
	@ApiTags(tags)
	@ApiResponse(201, CreatedProjectPublicDto)
	@ApiErrorResponse(400)
	async createProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Body body: CreateProjectPublicDto,
	): Promise<CreatedProjectPublicDto> {
		const project = await this.projectService.createTeamProject(req.user, { name: body.name });

		const scopes = await this.projectService.getProjectScopesForUser(req.user, project.id);

		return { ...toProjectPublicDto(project), role: 'project:admin', scopes };
	}

	@Put('/:projectId')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:update')
	@ApiSummary('Update a project')
	@ApiDescription('Update a project on your instance.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async updateProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body body: UpdateProjectPublicDto,
	): Promise<void> {
		await this.projectService.updateProject(req.user, projectId, { name: body.name });
	}

	@Delete('/:projectId')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:delete')
	@ApiSummary('Delete a project')
	@ApiDescription('Delete a project from your instance.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async deleteProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Query _query: DeleteProjectQueryPublicDto,
	): Promise<void> {
		await this.projectService.deleteProject(req.user, projectId);
	}
}
