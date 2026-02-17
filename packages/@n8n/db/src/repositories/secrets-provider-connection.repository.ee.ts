import { Service } from '@n8n/di';
import { Brackets, DataSource, Repository } from '@n8n/typeorm';

import { SecretsProviderConnection } from '../entities';

@Service()
export class SecretsProviderConnectionRepository extends Repository<SecretsProviderConnection> {
	constructor(dataSource: DataSource) {
		super(SecretsProviderConnection, dataSource.manager);
	}

	async findAll(): Promise<SecretsProviderConnection[]> {
		return await this.find();
	}

	async hasGlobalProvider(providerKey: string): Promise<boolean> {
		const count = await this.manager
			.createQueryBuilder(SecretsProviderConnection, 'connection')
			.leftJoin('connection.projectAccess', 'access')
			.where('access.secretsProviderConnectionId IS NULL')
			.andWhere('connection.providerKey = :providerKey', { providerKey })
			.getCount();

		return count > 0;
	}

	/**
	 * Find all global connections (connections with no project access entries)
	 */
	async findGlobalConnections(): Promise<SecretsProviderConnection[]> {
		return await this.createQueryBuilder('connection')
			.leftJoin('connection.projectAccess', 'access')
			.where('access.secretsProviderConnectionId IS NULL')
			.getMany();
	}

	async findByProjectId(projectId: string): Promise<SecretsProviderConnection[]> {
		return await this.createQueryBuilder('connection')
			.innerJoinAndSelect('connection.projectAccess', 'projectAccess')
			.leftJoinAndSelect('projectAccess.project', 'project')
			.where('projectAccess.projectId = :projectId', { projectId })
			.getMany();
	}

	/**
	 * Checks if a provider is accessible from a project.
	 * A provider is accessible if it's either:
	 * - A global provider (no project access restrictions), OR
	 * - Explicitly granted access to the specified project
	 */
	async isProviderAvailableInProject(providerKey: string, projectId: string): Promise<boolean> {
		const count = await this.manager
			.createQueryBuilder(SecretsProviderConnection, 'connection')
			.leftJoin('connection.projectAccess', 'access')
			.where('connection.providerKey = :providerKey', { providerKey })
			.andWhere(
				new Brackets((qb) => {
					qb.where('access.secretsProviderConnectionId IS NULL') // Global provider
						.orWhere('access.projectId = :projectId', { projectId }); // Project-specific
				}),
			)
			.getCount();

		return count > 0;
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

	/**
	 * Find a connection by its providerKey, but only if it is assigned to the specified project.
	 * Returns null if not found.
	 */
	async findByProviderKeyAndProjectId(
		providerKey: string,
		projectId: string,
	): Promise<SecretsProviderConnection | null> {
		return await this.createQueryBuilder('connection')
			.innerJoinAndSelect('connection.projectAccess', 'projectAccess')
			.leftJoinAndSelect('projectAccess.project', 'project')
			.where('connection.providerKey = :providerKey', { providerKey })
			.andWhere('projectAccess.projectId = :projectId', { projectId })
			.getOne();
	}

	/**
	 * Remove a connection by its providerKey, but only if it is assigned to the specified project.
	 * Returns the removed connection, or null if no matching connection was found.
	 */
	async removeByProviderKeyAndProjectId(
		providerKey: string,
		projectId: string,
	): Promise<SecretsProviderConnection | null> {
		const connection = await this.findByProviderKeyAndProjectId(providerKey, projectId);

		if (!connection) {
			return null;
		}

		return await this.remove(connection);
	}
}
