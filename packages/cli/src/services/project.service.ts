import type { Project } from '@/databases/entities/Project';
import { ProjectRelation, type ProjectRole } from '@/databases/entities/ProjectRelation';
import type { User } from '@/databases/entities/User';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { Not, type EntityManager } from '@n8n/typeorm';
import { Service } from 'typedi';

@Service()
export class ProjectService {
	constructor(
		private projectsRepository: ProjectRepository,
		private projectRelationRepository: ProjectRelationRepository,
	) {}

	async getAccessibleProjects(user: User): Promise<Project[]> {
		// This user is probably an admin, show them everything
		if (user.hasGlobalScope('project:read')) {
			return await this.projectsRepository.find();
		}
		return await this.projectsRepository.getAccessibleProjects(user.id);
	}

	async getPersonalProjectOwners(projectIds: string[]): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.getPersonalProjectOwners(projectIds);
	}

	async guaranteeProjectNames(projects: Project[]): Promise<Array<Project & { name: string }>> {
		const projectOwnerRelations = await this.getPersonalProjectOwners(projects.map((p) => p.id));

		return projects.map((p) => {
			if (p.name) {
				return p;
			}
			const pr = projectOwnerRelations.find((r) => r.projectId === p.id);
			let name = `Unclaimed Personal Project (${p.id})`;
			if (pr && !pr.user.isPending) {
				name = `${pr.user.firstName} ${pr.user.lastName}`;
			} else if (pr) {
				name = pr.user.email;
			}
			return this.projectsRepository.create({
				...p,
				name,
			});
		}) as Array<Project & { name: string }>;
	}

	async createTeamProject(name: string, adminUser: User): Promise<Project> {
		const project = await this.projectsRepository.save(
			this.projectsRepository.create({
				name,
				type: 'team',
			}),
		);

		// Link admin
		await this.projectRelationRepository.save(
			this.projectRelationRepository.create({
				projectId: project.id,
				userId: adminUser.id,
				role: 'project:admin',
			}),
		);

		return project;
	}

	async getPersonalProject(user: User): Promise<Project | null> {
		return await this.projectsRepository.getPersonalProjectForUser(user.id);
	}

	async getProjectRelationsForUser(user: User): Promise<ProjectRelation[]> {
		return await this.projectRelationRepository.find({
			where: { userId: user.id },
			relations: ['project'],
		});
	}

	async syncProjectRelations(
		projectId: string,
		relations: Array<{ userId: string; role: ProjectRole }>,
	) {
		const project = await this.projectsRepository.findOneOrFail({
			where: { id: projectId, type: Not('personal') },
		});
		await this.projectRelationRepository.manager.transaction(async (em) => {
			await this.pruneRelations(em, project);
			await this.addManyRelations(em, project, relations);
		});
	}

	async pruneRelations(em: EntityManager, project: Project) {
		await em.delete(ProjectRelation, { projectId: project.id });
	}

	async addManyRelations(
		em: EntityManager,
		project: Project,
		relations: Array<{ userId: string; role: ProjectRole }>,
	) {
		await em.insert(
			ProjectRelation,
			relations.map((v) =>
				this.projectRelationRepository.create({
					projectId: project.id,
					userId: v.userId,
					role: v.role,
				}),
			),
		);
	}
}
