import { Service } from 'typedi';
import { DataSource, In, Repository } from 'typeorm';
import { ProjectRelation } from '../entities/ProjectRelation';

@Service()
export class ProjectRelationRepository extends Repository<ProjectRelation> {
	constructor(dataSource: DataSource) {
		super(ProjectRelation, dataSource.manager);
	}

	/**
	 * Find the roles of a user in an array of projects.
	 */
	async findRoles(userId: string, projectIds: string[]) {
		const rows = await this.find({
			where: { userId, projectId: In(projectIds) },
			select: ['role'],
		});

		return rows.map((row) => row.role);
	}
}
