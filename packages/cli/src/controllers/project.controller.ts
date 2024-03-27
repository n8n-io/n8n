import type { Project } from '@db/entities/Project';
import {
	Get,
	Post,
	GlobalScope,
	RestController,
	Licensed,
	Patch,
	ProjectScope,
	Delete,
} from '@/decorators';
import { ProjectRequest } from '@/requests';
import { ProjectService } from '@/services/project.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';
import { combineScopes } from '@n8n/permissions';
import type { GlobalScopes, ScopeLevels, Scope } from '@n8n/permissions';
import { RoleService } from '@/services/role.service';
import type { GlobalRole } from '@/databases/entities/User';

@RestController('/projects')
export class ProjectController {
	constructor(
		private projectsService: ProjectService,
		private roleService: RoleService,
	) {}

	@Get('/')
	async getAllProjects(req: ProjectRequest.GetAll): Promise<Project[]> {
		const projects = await this.projectsService.getAccessibleProjects(req.user);

		return await this.projectsService.guaranteeProjectNames(projects);
	}

	@Post('/')
	@GlobalScope('project:create')
	@Licensed('feat:advancedPermissions')
	async createProject(req: ProjectRequest.Create): Promise<Project> {
		return await this.projectsService.createTeamProject(req.body.name, req.user);
	}

	@Get('/my-projects')
	async getMyProjects(
		req: ProjectRequest.GetMyProjects,
	): Promise<Array<Project & { role: ProjectRole | GlobalRole; scopes?: Scope[] }>> {
		const relations = await this.projectsService.getProjectRelationsForUser(req.user);

		const resultHash: Record<
			string,
			Project & { role: ProjectRole | GlobalRole; scopes?: Scope[] }
		> = {};

		for (const pr of relations) {
			const result = resultHash[pr.projectId] ?? {
				...pr.project,
				// If the user has the global `project:read` scope then they may not
				// own this relationship in that case we use the global user role
				// instead of the relation role, which is for another user.
				role: pr.userId === req.user.id ? pr.role : req.user.role,
				scopes: req.query.includeScopes ? [] : undefined,
			};
			resultHash[pr.projectId] = result;

			// If the user has a relationship to the project then that one trumps the
			// global role of the user
			if (pr.userId === req.user.id) {
				result.role = pr.role;
			}

			if (result.scopes) {
				const scopes: GlobalScopes | ScopeLevels =
					pr.userId === req.user.id
						? {
								global: this.roleService.getRoleScopes(req.user.role),
								project: this.roleService.getRoleScopes(pr.role),
						  }
						: { global: this.roleService.getRoleScopes(req.user.role) };

				result.scopes.push(...combineScopes(scopes));
			}
		}

		// Deduplicate the scopes
		for (const result of Object.values(resultHash)) {
			if (result.scopes) {
				result.scopes = [...new Set(result.scopes)].sort();
			}
		}

		return Object.values(resultHash);
	}

	@Get('/personal')
	async getPersonalProject(req: ProjectRequest.GetPersonalProject): Promise<Project> {
		const project = await this.projectsService.getPersonalProject(req.user);
		if (!project) {
			throw new NotFoundError('Could not find a personal project for this user');
		}
		return project;
	}

	@Get('/:projectId')
	@ProjectScope('project:read')
	async getProject(req: ProjectRequest.Get): Promise<ProjectRequest.ProjectWithRelations> {
		const [{ id, name, type }, relations] = await Promise.all([
			this.projectsService.getProject(req.params.projectId),
			this.projectsService.getProjectRelations(req.params.projectId),
		]);

		return {
			id,
			name,
			type,
			relations: relations.map((r) => ({
				id: r.user.id,
				email: r.user.email,
				firstName: r.user.firstName,
				lastName: r.user.lastName,
				role: r.role,
			})),
		};
	}

	@Patch('/:projectId')
	@ProjectScope('project:update')
	async updateProject(req: ProjectRequest.Update) {
		if (req.body.name) {
			await this.projectsService.updateProject(req.body.name, req.params.projectId);
		}
		if (req.body.relations) {
			await this.projectsService.syncProjectRelations(req.params.projectId, req.body.relations);
		}
	}

	@Delete('/:projectId')
	@ProjectScope('project:delete')
	async deleteProject(req: ProjectRequest.Delete) {
		await this.projectsService.deleteProject(req.user, req.params.projectId, {
			migrateToProject: req.query.transferId,
		});
	}
}
