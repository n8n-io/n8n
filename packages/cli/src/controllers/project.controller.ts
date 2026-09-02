import {
	CreateProjectDto,
	DeleteProjectDto,
	UpdateProjectDto,
	AddUsersToProjectDto,
	ChangeUserRoleInProject,
	ListProjectsQueryDto,
	UpdateProjectExecutionQuotaDto,
} from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Get,
	Post,
	GlobalScope,
	RestController,
	Licensed,
	Patch,
	ProjectScope,
	Delete,
	Body,
	Param,
	Query,
} from '@n8n/decorators';
import { combineScopes, getAuthPrincipalScopes } from '@n8n/permissions';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ProjectExecutionQuotaService } from '@/execution-quota/project-execution-quota.service';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { ProjectRequest } from '@/requests';
import {
	ProjectService,
	TeamProjectOverQuotaError,
	UnlicensedProjectRoleError,
} from '@/services/project.service.ee';

@RestController('/projects')
export class ProjectController {
	constructor(
		private readonly projectsService: ProjectService,
		private readonly provisioningService: ProvisioningService,
		private readonly projectExecutionQuotaService: ProjectExecutionQuotaService,
	) {}

	@Get('/')
	async getAllProjects(
		req: AuthenticatedRequest,
		res: Response,
		@Query payload: ListProjectsQueryDto,
	) {
		const { projects, count } = await this.projectsService.getAccessibleProjectsAndCount(
			req.user,
			payload,
		);

		// When pagination params are provided, return { count, data } envelope
		// with role and scopes enriched per project.
		// Otherwise return a bare array for backward compatibility with existing callers.
		if (payload.take !== undefined || payload.skip !== undefined) {
			const enriched = await this.projectsService.addUserScopes(req.user, projects);
			return res.json({ count, data: enriched });
		}
		return projects;
	}

	@Get('/count')
	async getProjectCounts() {
		return await this.projectsService.getProjectCounts();
	}

	// Lists projects a caller can pick as share targets, including peer
	// personal projects so the workflow / credential share dropdowns can
	// surface other users. Gated on `user:list` (the same boundary that
	// `GET /rest/users` enforces) — restricted roles without that scope
	// (e.g. chat-only users) cannot enumerate peer personal projects here.
	@Get('/sharing-candidates')
	@GlobalScope('user:list')
	async getSharingCandidates(
		req: AuthenticatedRequest,
		res: Response,
		@Query payload: ListProjectsQueryDto,
	) {
		const { projects, count } = await this.projectsService.getShareableProjectsAndCount(
			req.user,
			payload,
		);
		const enriched = await this.projectsService.addUserScopes(req.user, projects);
		return res.json({ count, data: enriched });
	}

	@Post('/')
	@GlobalScope('project:create')
	// Using admin as all plans that contain projects should allow admins at the very least
	@Licensed('feat:projectRole:admin')
	async createProject(req: AuthenticatedRequest, _res: Response, @Body payload: CreateProjectDto) {
		try {
			const project = await this.projectsService.createTeamProject(req.user, payload);

			return {
				...project,
				role: 'project:admin',
				scopes: await this.projectsService.getProjectScopesForUser(req.user, project.id),
			};
		} catch (e) {
			if (e instanceof TeamProjectOverQuotaError) {
				throw new BadRequestError(e.message);
			}
			throw e;
		}
	}

	@Get('/my-projects')
	async getMyProjects(
		req: AuthenticatedRequest,
		_res: Response,
	): Promise<ProjectRequest.GetMyProjectsResponse> {
		return await this.projectsService.getMyProjects(req.user);
	}

	@Get('/personal')
	async getPersonalProject(req: AuthenticatedRequest) {
		const project = await this.projectsService.getPersonalProject(req.user);
		if (!project) {
			throw new NotFoundError('Could not find a personal project for this user');
		}

		const scopes = await this.projectsService.getProjectScopesForUser(req.user, project.id);
		return {
			...project,
			scopes,
			// Personal projects have a single owner and are never subject to managed team roles.
			rolesManaged: false,
		};
	}

	// Must be declared before `/:projectId` below — this router matches routes in
	// declaration order, and `/:projectId` would otherwise swallow this literal
	// segment (treating "execution-quota" as a projectId). See `/count` above for
	// the same pattern.
	@Get('/execution-quota')
	@GlobalScope('project:manageExecutionQuota')
	async getAllProjectsExecutionQuota(_req: AuthenticatedRequest, _res: Response) {
		return await this.projectExecutionQuotaService.getAllProjectsConsumption();
	}

	@Get('/:projectId')
	@ProjectScope('project:read')
	async getProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<ProjectRequest.ProjectWithRelations> {
		const [{ id, name, icon, type, description, customTelemetryTags }, relations, rolesManaged] =
			await Promise.all([
				this.projectsService.getProject(projectId),
				this.projectsService.getProjectRelations(projectId),
				this.provisioningService.isProjectRoleManaged(),
			]);
		const myRelation = relations.find((r) => r.userId === req.user.id);

		return {
			id,
			name,
			icon,
			type,
			description,
			customTelemetryTags,
			relations: relations.map((r) => ({
				id: r.user.id,
				email: r.user.email,
				firstName: r.user.firstName,
				lastName: r.user.lastName,
				role: r.role.slug,
			})),
			scopes: [
				...combineScopes({
					global: getAuthPrincipalScopes(req.user),
					...(myRelation ? { project: myRelation.role.scopes.map((scope) => scope.slug) } : {}),
				}),
			],
			rolesManaged,
		};
	}

	@Patch('/:projectId')
	@ProjectScope('project:update')
	async updateProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Body payload: UpdateProjectDto,
		@Param('projectId') projectId: string,
	) {
		await this.projectsService.updateProject(req.user, projectId, payload);
	}

	/** Throws when project roles are provisioned automatically, so manual membership changes are disallowed. */
	private async assertProjectRolesNotManaged() {
		if (await this.provisioningService.isProjectRoleManaged()) {
			throw new ForbiddenError(
				'Project roles are managed automatically and cannot be changed manually',
			);
		}
	}

	@Post('/:projectId/users')
	@ProjectScope('project:manageMembers')
	async addProjectUsers(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Body payload: AddUsersToProjectDto,
	) {
		await this.assertProjectRolesNotManaged();
		try {
			const { added, conflicts } = await this.projectsService.addUsersWithConflictSemantics(
				req.user,
				projectId,
				payload.relations,
			);

			// Response semantics:
			// - If at least one user was added, return 201. When there are also conflicts, include them in the body.
			// - If no users were added but conflicts exist, return 409 with conflicts.
			if (added.length > 0) {
				return conflicts.length > 0 ? res.status(201).json({ conflicts }) : res.status(201).send();
			}
			if (conflicts.length > 0) return res.status(409).json({ conflicts });
			return res.status(200).send();
		} catch (e) {
			if (e instanceof UnlicensedProjectRoleError) {
				throw new BadRequestError(e.message);
			}
			throw e;
		}
	}

	@Patch('/:projectId/users/:userId')
	@ProjectScope('project:manageMembers')
	async changeProjectUserRole(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('userId') userId: string,
		@Body body: ChangeUserRoleInProject,
	) {
		await this.assertProjectRolesNotManaged();

		try {
			await this.projectsService.changeUserRoleInProject(req.user, projectId, userId, body.role);
			return res.status(204).send();
		} catch (e) {
			if (e instanceof UnlicensedProjectRoleError) {
				throw new BadRequestError(e.message);
			}
			throw e;
		}
	}

	@Delete('/:projectId/users/:userId')
	@ProjectScope('project:manageMembers')
	async deleteProjectUser(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('userId') userId: string,
	) {
		await this.assertProjectRolesNotManaged();
		await this.projectsService.deleteUserFromProject(req.user, projectId, userId);
		return res.status(204).send();
	}

	@Delete('/:projectId')
	@ProjectScope('project:delete')
	async deleteProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: DeleteProjectDto,
		@Param('projectId') projectId: string,
	) {
		await this.projectsService.deleteProject(req.user, projectId, {
			migrateToProject: query.transferId,
		});
	}

	@Get('/:projectId/execution-quota')
	@ProjectScope('project:read')
	async getExecutionQuota(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		return await this.projectExecutionQuotaService.getConsumption(projectId);
	}

	@Patch('/:projectId/execution-quota')
	@ProjectScope('project:manageExecutionQuota')
	async updateExecutionQuota(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: UpdateProjectExecutionQuotaDto,
		@Param('projectId') projectId: string,
	) {
		await this.projectExecutionQuotaService.setLimit(projectId, payload.limit, payload.periodUnit);
	}

	@Get('/:projectId/execution-quota/spikes')
	@ProjectScope('project:read')
	async getExecutionQuotaSpikes(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		return await this.projectExecutionQuotaService.getSpikes(projectId);
	}
}
