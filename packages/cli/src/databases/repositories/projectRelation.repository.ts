import { Service } from 'typedi';
import { DataSource, In, Repository } from '@n8n/typeorm';
import { ProjectRelation } from '../entities/ProjectRelation';

@Service()
export class ProjectRelationRepository extends Repository<ProjectRelation> {
	constructor(dataSource: DataSource) {
		super(ProjectRelation, dataSource.manager);
	}

	async getPersonalProjectOwners(projectIds: string[]) {
		return await this.find({
			where: {
				projectId: In(projectIds),
				role: 'project:personalOwner',
			},
			relations: ['user'],
		});
	}

	/**
	 * Find the role of a user in a project.
	 */
	async findProjectRole({ userId, projectId }: { userId: string; projectId: string }) {
		const relation = await this.findOneBy({ projectId, userId });

		return relation?.role ?? null;
	}
}
