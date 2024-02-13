import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../entities/Project';

@Service()
export class ProjectRepository extends Repository<Project> {
	constructor(dataSource: DataSource) {
		super(Project, dataSource.manager);
	}

	async getPersonalProjectForUser(userId: string) {
		return await this.findOne({ where: { projectRelations: { userId } } });
	}

	async getPersonalProjectForUserOrFail(userId: string) {
		return await this.findOneOrFail({ where: { projectRelations: { userId } } });
	}
}
