import type { Project } from '@db/entities/Project';
import {
	Get,
	Post,
	GlobalScope,
	RestController,
	Licensed,
	Patch,
	ProjectScope,
} from '@/decorators';
import { ProjectRequest } from '@/requests';
import { ProjectService } from '@/services/project.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { ProjectRole } from '@/databases/entities/ProjectRelation';

@RestController('/projects')
export class ProjectController {
	constructor(private projectsService: ProjectService) {}

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
	): Promise<Array<Project & { role: ProjectRole }>> {
		const relations = await this.projectsService.getProjectRelationsForUser(req.user);

		return relations.map((pr) => {
			let name = pr.project.name;
			// Only personal projects don't have a name and the only
			// personal project a user should be linked to is their own
			if (!name) {
				// TODO: confirm name with product
				name = 'My n8n';
			}
			return {
				...pr.project,
				role: pr.role,
			} as Project & { role: ProjectRole };
		});
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
}
