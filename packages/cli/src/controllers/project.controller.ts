import {
	CreateProjectDto,
	DeleteProjectDto,
	UpdateProjectDto,
	AddUsersToProjectDto,
	ChangeUserRoleInProject,
} from '@n8n/api-types';
import type { Project } from '@n8n/db';
import { AuthenticatedRequest, ProjectRepository } from '@n8n/db';
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
import { combineScopes, getAuthPrincipalScopes, hasGlobalScope } from '@n8n/permissions';
import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, Not } from '@n8n/typeorm';
import { Response } from 'express';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
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
		private readonly projectRepository: ProjectRepository,
		private readonly eventService: EventService,
		private readonly userManagementMailer: UserManagementMailer,
	) {}

	@Get('/')
	async getAllProjects(req: AuthenticatedRequest): Promise<Project[]> {
		return await this.projectsService.getAccessibleProjects(req.user);
	}

	@Get('/count')
	async getProjectCounts() {
		return await this.projectsService.getProjectCounts();
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

			const relation = await this.projectsService.getProjectRelationForUserAndProject(
				req.user.id,
				project.id,
			);

			return {
				...project,
				role: 'project:admin',
				scopes: [
					...combineScopes({
						global: getAuthPrincipalScopes(req.user),
						project: relation?.role.scopes.map((scope) => scope.slug) ?? [],
					}),
				],
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
		const relations = await this.projectsService.getProjectRelationsForUser(req.user);
		const otherTeamProject = hasGlobalScope(req.user, 'project:read')
			? await this.projectRepository.findBy({
					type: 'team',
					id: Not(In(relations.map((pr) => pr.projectId))),
				})
			: [];

		const results: ProjectRequest.GetMyProjectsResponse = [];

		for (const pr of relations) {
			const result: ProjectRequest.GetMyProjectsResponse[number] = Object.assign(
				this.projectRepository.create(pr.project),
				{ role: pr.role.slug, scopes: [] },
			);

			if (result.scopes) {
				result.scopes.push(
					...combineScopes({
						global: getAuthPrincipalScopes(req.user),
						project: pr.role.scopes.map((scope) => scope.slug),
					}),
				);
			}

			results.push(result);
		}

		for (const project of otherTeamProject) {
			const result: ProjectRequest.GetMyProjectsResponse[number] = Object.assign(
				this.projectRepository.create(project),
				{
					// If the user has the global `project:read` scope then they may not
					// own this relationship in that case we use the global user role
					// instead of the relation role, which is for another user.
					role: req.user.role.slug,
					scopes: [],
				},
			);

			if (result.scopes) {
				result.scopes.push(...combineScopes({ global: getAuthPrincipalScopes(req.user) }));
			}

			results.push(result);
		}

		// Deduplicate and sort scopes
		for (const result of results) {
			if (result.scopes) {
				result.scopes = [...new Set(result.scopes)].sort();
			}
		}

		return results;
	}

	@Get('/personal')
	async getPersonalProject(req: AuthenticatedRequest) {
		const project = await this.projectsService.getPersonalProject(req.user);
		if (!project) {
			throw new NotFoundError('Could not find a personal project for this user');
		}

		const relation = await this.projectsService.getProjectRelationForUserAndProject(
			req.user.id,
			project.id,
		);
		const scopes: Scope[] = [
			...combineScopes({
				global: getAuthPrincipalScopes(req.user),
				project: relation?.role.scopes.map((scope) => scope.slug) ?? [],
			}),
		];
		return {
			...project,
			scopes,
		};
	}

	@Get('/:projectId')
	@ProjectScope('project:read')
	async getProject(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<ProjectRequest.ProjectWithRelations> {
		const [{ id, name, icon, type, description }, relations] = await Promise.all([
			this.projectsService.getProject(projectId),
			this.projectsService.getProjectRelations(projectId),
		]);
		const myRelation = relations.find((r) => r.userId === req.user.id);

		return {
			id,
			name,
			icon,
			type,
			description,
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
		};
	}

	@Patch('/:projectId')
	@ProjectScope('project:update')
	async updateProject(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body payload: UpdateProjectDto,
		@Param('projectId') projectId: string,
	) {
		await this.projectsService.updateProject(projectId, payload);
	}

	@Post('/:projectId/users')
	@ProjectScope('project:update')
	async addProjectUsers(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Body payload: AddUsersToProjectDto,
	) {
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
	@ProjectScope('project:update')
	async changeProjectUserRole(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('userId') userId: string,
		@Body body: ChangeUserRoleInProject,
	) {
		try {
			await this.projectsService.changeUserRoleInProject(projectId, userId, body.role);
			await this.projectsService.clearCredentialCanUseExternalSecretsCache(projectId);
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
	@ProjectScope('project:update')
	async deleteProjectUser(
		req: AuthenticatedRequest,
		res: Response,
		@Param('projectId') projectId: string,
		@Param('userId') userId: string,
	) {
		await this.projectsService.deleteUserFromProject(projectId, userId);
		await this.projectsService.clearCredentialCanUseExternalSecretsCache(projectId);
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
