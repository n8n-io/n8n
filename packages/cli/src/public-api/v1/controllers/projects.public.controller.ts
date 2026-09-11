import {
	AddProjectMembersPublicDto,
	ChangeProjectMemberRolePublicDto,
	CreatedProjectPublicDto,
	CreateProjectPublicDto,
	DeleteProjectQueryPublicDto,
	ListProjectMembersQueryPublicDto,
	ListProjectsQueryPublicDto,
	ProjectListPublicDto,
	ProjectMemberListPublicDto,
	ProjectMemberPublicDto,
	ProjectPublicDto,
	UpdateProjectPublicDto,
	projectIdParamSchema,
	userIdParamSchema,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest, Project, ProjectRelation } from '@n8n/db';
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
	Patch,
	Post,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
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

const toProjectMemberPublicDto = (relation: ProjectRelation): ProjectMemberPublicDto => ({
	id: relation.user.id,
	email: relation.user.email,
	firstName: relation.user.firstName,
	lastName: relation.user.lastName,
	createdAt: relation.user.createdAt.toISOString(),
	updatedAt: relation.user.updatedAt.toISOString(),
	role: relation.role?.slug ?? null,
});

@PublicApiController('/projects')
export class ProjectsPublicController {
	constructor(
		private readonly projectService: ProjectService,
		private readonly provisioningService: ProvisioningService,
	) {}

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

	@Get('/:projectId/users')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('user:list')
	@ApiSummary('List project members')
	@ApiDescription(
		'Returns a list of all members of a project including their role. Requires user:list scope.',
	)
	@ApiTags(tags)
	@ApiResponse(200, ProjectMemberListPublicDto)
	@ApiErrorResponse(404)
	async getProjectUsers(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Query query: ListProjectMembersQueryPublicDto,
	): Promise<ProjectMemberListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const project = await this.projectService.getProjectWithScope(req.user, projectId, [
			'project:list',
		]);
		if (!project) {
			throw new NotFoundError(`Could not find project with ID "${projectId}"`);
		}

		const { members, count } = await this.projectService.getProjectMembersAndCount(projectId, {
			offset,
			limit,
		});

		return {
			data: members.map(toProjectMemberPublicDto),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/:projectId/users')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:manageMembers')
	@ApiSummary('Add one or more users to a project')
	@ApiDescription('Add one or more users to a project on your instance.')
	@ApiTags(tags)
	@ApiResponse(201)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async addUsersToProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body body: AddProjectMembersPublicDto,
	): Promise<void> {
		await this.assertProjectRolesNotManaged();

		await this.projectService.addUsersToProject(req.user, projectId, body.relations);
	}

	@Patch('/:projectId/users/:userId')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:manageMembers')
	@ApiSummary("Change a user's role in a project")
	@ApiDescription("Change a user's role in a project.")
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(400)
	@ApiErrorResponse(404)
	async changeUserRoleInProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('userId', userIdParamSchema) userId: string,
		@Body body: ChangeProjectMemberRolePublicDto,
	): Promise<void> {
		await this.assertProjectRolesNotManaged();

		await this.projectService.changeUserRoleInProject(req.user, projectId, userId, body.role);
	}

	@Delete('/:projectId/users/:userId')
	@Licensed(LICENSE_FEATURES.PROJECT_ROLE_ADMIN)
	@ApiKeyScope('project:manageMembers')
	@ApiSummary('Delete a user from a project')
	@ApiDescription('Delete a user from a project on your instance.')
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	async deleteUserFromProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Param('userId', userIdParamSchema) userId: string,
	): Promise<void> {
		await this.assertProjectRolesNotManaged();

		await this.projectService.deleteUserFromProject(req.user, projectId, userId);
	}

	/** Mirrors the ProjectController guard: manual membership changes are disallowed when roles are provisioned. */
	private async assertProjectRolesNotManaged() {
		if (await this.provisioningService.isProjectRoleManaged()) {
			throw new ForbiddenError(
				'Project roles are managed automatically and cannot be changed manually',
			);
		}
	}
}
