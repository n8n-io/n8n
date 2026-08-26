import {
	CreateProjectDto,
	DeleteProjectDto,
	UpdateProjectDto,
	AddUsersToProjectDto,
	ChangeUserRoleInProject,
	ListProjectsQueryDto,
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
import { EventService } from '@/events/event.service';
import { ProvisioningService } from '@/modules/provisioning.ee/provisioning.service.ee';
import type { ProjectRequest } from '@/requests';
import {
	ProjectService,
	TeamProjectOverQuotaError,
	UnlicensedProjectRoleError,
} from '@/services/project.service.ee';
import { UserManagementMailer } from '@/user-management/email';

@RestController('/projects')
export class ProjectController {
	constructor(
		private readonly projectsService: ProjectService,
		private readonly eventService: EventService,
		private readonly userManagementMailer: UserManagementMailer,
		private readonly provisioningService: ProvisioningService,
	) {}

	@Get('/')
	async getAllProjects(
		req: AuthenticatedRequest,
		res: Response,
		@Query payload: ListProjectsQueryDto,
	) {
		const [data, count] = await this.projectsService.getAccessibleProjectsAndCount(
			req.user,
			payload,
		);

		// When pagination params are provided, return { count, data } envelope
		// with role and scopes enriched per project.
		// Otherwise return a bare array for backward compatibility with existing callers.
		if (payload.take !== undefined || payload.skip !== undefined) {
			const enriched = await this.projectsService.addUserScopes(req.user, data);
			return res.json({ count, data: enriched });
		}
		return data;
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
		const [data, count] = await this.projectsService.getShareableProjectsAndCount(
			req.user,
			payload,
		);
		const enriched = await this.projectsService.addUserScopes(req.user, data);
		return res.json({ count, data: enriched });
	}

	@Post('/')
	@GlobalScope('project:create')
	// Using admin as all plans that contain projects should allow admins at the very least
	@Licensed('feat:projectRole:admin')
	async createProject(req: AuthenticatedRequest, _res: Response, @Body payload: CreateProjectDto) {
		try {
			const project = await this.projectsService.createTeamProject(req.user, payload);

			this.eventService.emit('team-project-created', {
				userId: req.user.id,
				role: req.user.role.slug,
				uiContext: payload.uiContext,
			});

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
		await this.projectsService.updateProject(projectId, payload);
		this.eventService.emit('team-project-updated', {
			userId: req.user.id,
			role: req.user.role.slug,
			projectId,
			...(payload.customTelemetryTags !== undefined
				? { otelProjectCustomTagsCount: payload.customTelemetryTags.length }
				: {}),
		});
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
			const { added, conflicts, project } =
				await this.projectsService.addUsersWithConflictSemantics(projectId, payload.relations);

			if (added.length > 0) {
				await this.userManagementMailer.notifyProjectShared({
					sharer: req.user,
					newSharees: added,
					project: { id: project.id, name: project.name },
				});
			}

			const relations = await this.projectsService.getProjectRelations(projectId);
			this.eventService.emit('team-project-updated', {
				userId: req.user.id,
				role: req.user.role.slug,
				members: relations.map((r) => ({ userId: r.userId, role: r.role.slug })),
				projectId,
			});

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
			await this.projectsService.changeUserRoleInProject(projectId, userId, body.role);
			const relations = await this.projectsService.getProjectRelations(projectId);
			this.eventService.emit('team-project-updated', {
				userId: req.user.id,
				role: req.user.role.slug,
				members: relations.map((r) => ({ userId: r.userId, role: r.role.slug })),
				projectId,
			});
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
		await this.projectsService.deleteUserFromProject(projectId, userId);
		const relations = await this.projectsService.getProjectRelations(projectId);
		this.eventService.emit('team-project-updated', {
			userId: req.user.id,
			role: req.user.role.slug,
			members: relations.map((r) => ({ userId: r.userId, role: r.role.slug })),
			projectId,
		});
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

		this.eventService.emit('team-project-deleted', {
			userId: req.user.id,
			role: req.user.role.slug,
			projectId,
			removalType: query.transferId !== undefined ? 'transfer' : 'delete',
			targetProjectId: query.transferId,
		});
	}
}
