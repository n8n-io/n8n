import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { SecretsProviderConnection } from '../entities';

@Service()
export class SecretsProviderConnectionRepository extends Repository<SecretsProviderConnection> {
	constructor(dataSource: DataSource) {
		super(SecretsProviderConnection, dataSource.manager);
	}

	async findAll(): Promise<SecretsProviderConnection[]> {
		return await this.find();
	}

	async findGlobalConnections(): Promise<SecretsProviderConnection[]> {
		return await this.createQueryBuilder('connection')
			.leftJoin('connection.projectAccess', 'access')
			.where('access.secretsProviderConnectionId IS NULL')
			.getMany();
	}

	async findByProjectId(projectId: string): Promise<SecretsProviderConnection[]> {
		return await this.createQueryBuilder('connection')
			.innerJoin('connection.projectAccess', 'projectAccess')
			.where('projectAccess.projectId = :projectId', { projectId })
			.getMany();
	}

	/**
	 * Find all connections accessible to a project:
	 * - Connections specifically shared with this project
	 * - Global connections (those with no project assignments)
	 */
	async findAllAccessibleByProjectWithProjectAccess(
		projectId: string,
	): Promise<SecretsProviderConnection[]> {
		const projectConnections = await this.createQueryBuilder('connection')
			.leftJoinAndSelect('connection.projectAccess', 'projectAccess')
			.leftJoinAndSelect('projectAccess.project', 'project')
			.where('projectAccess.projectId = :projectId', { projectId })
			.getMany();

		const globalConnections = await this.createQueryBuilder('connection')
			.leftJoinAndSelect('connection.projectAccess', 'access')
			.where('access.secretsProviderConnectionId IS NULL')
			.getMany();

		return projectConnections.concat(globalConnections);
	}
}
