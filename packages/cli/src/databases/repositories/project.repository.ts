import { Service } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository, In } from '@n8n/typeorm';
import { Project } from '../entities/Project';
import { ProjectRelation } from '../entities/ProjectRelation';

@Service()
export class ProjectRepository extends Repository<Project> {
	constructor(dataSource: DataSource) {
		super(Project, dataSource.manager);
	}

	async getPersonalProjectForUser(userId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;

		return await em.findOne(Project, {
			where: { type: 'personal', projectRelations: { userId, role: 'project:personalOwner' } },
		});
	}

	async getPersonalProjectForUserOrFail(userId: string, entityManager?: EntityManager) {
		const em = entityManager ?? this.manager;

		return await em.findOneOrFail(Project, {
			where: { type: 'personal', projectRelations: { userId, role: 'project:personalOwner' } },
		});
	}

	async getAccessibleProjects(userId: string) {
		return await this.find({
			where: [
				{ type: 'personal' },
				{
					projectRelations: {
						userId,
					},
				},
			],
		});
	}

	async getPersonalProjectForUsers(userIds: string[]) {
		return await this.find({
			where: {
				type: 'personal',
				projectRelations: { userId: In(userIds) },
			},
		});
	}

	async createProjectForUser(userId: string, entityManager?: EntityManager) {
		entityManager = entityManager ?? this.manager;

		const project = await entityManager.save<Project>(
			entityManager.create(Project, { type: 'personal' }),
		);
		await entityManager.save<ProjectRelation>(
			entityManager.create(ProjectRelation, {
				projectId: project.id,
				userId,
				role: 'project:personalOwner',
			}),
		);

		return project;
	}
}
