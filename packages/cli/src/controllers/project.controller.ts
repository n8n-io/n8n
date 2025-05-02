import { CreateProjectDto, DeleteProjectDto, UpdateProjectDto } from '@n8n/api-types';
import type { Project } from '@n8n/db';
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
import { combineScopes } from '@n8n/permissions';
import type { Scope } from '@n8n/permissions';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In, Not } from '@n8n/typeorm';
import { Response } from 'express';

import { ProjectRepository } from '@/databases/repositories/project.repository';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { ProjectRequest } from '@/requests';
import { AuthenticatedRequest } from '@/requests';
import {
	ProjectService,
	TeamProjectOverQuotaError,
	UnlicensedProjectRoleError,
} from '@/services/project.service.ee';
import { RoleService } from '@/services/role.service';

@RestController('/projects')
export class ProjectController {
	constructor(
		private readonly projectsService: ProjectService,
		private readonly roleService: RoleService,
		private readonly projectRepository: ProjectRepository,
		private readonly eventService: EventService,
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
				role: req.user.role,
			});

			return {
				...project,
				role: 'project:admin',
				scopes: [
					...combineScopes({
						global: this.roleService.getRoleScopes(req.user.role),
						project: this.roleService.getRoleScopes('project:admin'),
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
		const otherTeamProject = req.user.hasGlobalScope('project:read')
			? await this.projectRepository.findBy({
					type: 'team',
					id: Not(In(relations.map((pr) => pr.projectId))),
				})
			: [];

		const results: ProjectRequest.GetMyProjectsResponse = [];

		for (const pr of relations) {
			const result: ProjectRequest.GetMyProjectsResponse[number] = Object.assign(
				this.projectRepository.create(pr.project),
				{ role: pr.role, scopes: [] },
			);

			if (result.scopes) {
				result.scopes.push(
					...combineScopes({
						global: this.roleService.getRoleScopes(req.user.role),
						project: this.roleService.getRoleScopes(pr.role),
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
					role: req.user.role,
					scopes: [],
				},
			);

			if (result.scopes) {
				result.scopes.push(
					...combineScopes({ global: this.roleService.getRoleScopes(req.user.role) }),
				);
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
		const scopes: Scope[] = [
			...combineScopes({
				global: this.roleService.getRoleScopes(req.user.role),
				project: this.roleService.getRoleScopes('project:personalOwner'),
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
		const [{ id, name, icon, type }, relations] = await Promise.all([
			this.projectsService.getProject(projectId),
			this.projectsService.getProjectRelations(projectId),
		]);
		const myRelation = relations.find((r) => r.userId === req.user.id);

		return {
			id,
			name,
			icon,
			type,
			relations: relations.map((r) => ({
				id: r.user.id,
				email: r.user.email,
				firstName: r.user.firstName,
				lastName: r.user.lastName,
				role: r.role,
			})),
			scopes: [
				...combineScopes({
					global: this.roleService.getRoleScopes(req.user.role),
					...(myRelation ? { project: this.roleService.getRoleScopes(myRelation.role) } : {}),
				}),
			],
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
		const { name, icon, relations } = payload;
		if (name || icon) {
			await this.projectsService.updateProject(projectId, { name, icon });
		}
		if (relations) {
			try {
				await this.projectsService.syncProjectRelations(projectId, relations);
			} catch (e) {
				if (e instanceof UnlicensedProjectRoleError) {
					throw new BadRequestError(e.message);
				}
				throw e;
			}

			this.eventService.emit('team-project-updated', {
				userId: req.user.id,
				role: req.user.role,
				members: relations,
				projectId,
			});
		}
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
			role: req.user.role,
			projectId,
			removalType: query.transferId !== undefined ? 'transfer' : 'delete',
			targetProjectId: query.transferId,
		});
	}
}
