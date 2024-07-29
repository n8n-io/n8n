import { Service } from 'typedi';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';
import { Project } from '../entities/Project';

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

	/**
	 * Return the project with the given ID if the user has access to it.
	 */
	async getProjectForUserOrFail(projectId: string, userId: string) {
		return await this.findOneOrFail({
			where: { id: projectId, projectRelations: { userId } },
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

	async getProjectCounts() {
		return {
			personal: await this.count({ where: { type: 'personal' } }),
			team: await this.count({ where: { type: 'team' } }),
		};
	}
}
