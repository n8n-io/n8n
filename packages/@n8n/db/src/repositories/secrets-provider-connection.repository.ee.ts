import { Service } from '@n8n/di';
import { Brackets, DataSource, In, Repository } from '@n8n/typeorm';

import { SecretsProviderConnection, SharedCredentials } from '../entities';

@Service()
export class SecretsProviderConnectionRepository extends Repository<SecretsProviderConnection> {
	constructor(dataSource: DataSource) {
		super(SecretsProviderConnection, dataSource.manager);
	}

	async findAll(): Promise<SecretsProviderConnection[]> {
		return await this.find();
	}

	async findIdByProviderKey(providerKey: string): Promise<string | null> {
		const connection = await this.findOne({
			select: ['id'],
			where: { providerKey },
		});

		return connection ? connection.id.toString() : null;
	}

	async findIdsByProviderKeys(providerKeys: string[]): Promise<string[]> {
		if (providerKeys.length === 0) return [];

		const connections = await this.find({
			select: ['id'],
			where: { providerKey: In(providerKeys) },
		});

		return connections.map(({ id }) => id.toString());
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
	 * Retrieves enabled global connections, i.e., connections that are not assigned to any project.
	 * A global connection has no associated entries in its projectAccess relation.
	 *
	 * @param filters - (Optional) Filters to apply to the query.
	 * @param filters.providerKeys - (Optional) Limits results to connections of the specified provider keys.
	 * @returns Promise resolving to all matching SecretsProviderConnection entities.
	 */
	async findEnabledGlobalConnections(
		filters: {
			providerKeys?: Array<SecretsProviderConnection['providerKey']>;
		} = {},
	): Promise<SecretsProviderConnection[]> {
		const { providerKeys } = filters;
		if (providerKeys && providerKeys.length === 0) {
			return [];
		}

		const connectionQuery = this.createQueryBuilder('connection')
			.leftJoin('connection.projectAccess', 'access')
			.where('access.secretsProviderConnectionId IS NULL')
			.andWhere('connection.isEnabled = :isEnabled', { isEnabled: true });

		if (providerKeys) {
			connectionQuery.andWhere('connection.providerKey IN (:...providerKeys)', { providerKeys });
		}

		return await connectionQuery.getMany();
	}

	/**
	 * Finds all enabled secrets provider connections assigned to a given project.
	 * Optionally filters connections by provider keys.
	 *
	 * This returns only those connections explicitly linked to the project,
	 * not global connections (i.e., those without any project restriction).
	 *
	 * @param projectId - The ID of the project to filter on.
	 * @param filters - (Optional) Filters to apply to the query.
	 * @param filters.providerKeys - (Optional) Limits results to connections of the specified provider keys.
	 * @returns Promise resolving to all matching SecretsProviderConnection entities.
	 */
	async findEnabledByProjectId(
		projectId: string,
		filters: {
			providerKeys?: Array<SecretsProviderConnection['providerKey']>;
		} = {},
	): Promise<SecretsProviderConnection[]> {
		const { providerKeys } = filters;
		if (providerKeys && providerKeys.length === 0) {
			return [];
		}

		const connectionQuery = this.createQueryBuilder('connection')
			.innerJoinAndSelect('connection.projectAccess', 'projectAccess')
			.leftJoinAndSelect('projectAccess.project', 'project')
			.where('projectAccess.projectId = :projectId', { projectId })
			.andWhere('connection.isEnabled = :isEnabled', { isEnabled: true });

		if (providerKeys) {
			connectionQuery.andWhere('connection.providerKey IN (:...providerKeys)', { providerKeys });
		}

		return await connectionQuery.getMany();
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
	 * Returns the providerKeys of all project-scoped and global providers
	 * accessible to the owner project of the provided credential ID.
	 *
	 * Optimized to return only the providerKey strings (the only field the
	 * caller needs) and to return early when the table is empty.
	 */
	async findAllAccessibleProviderKeysByCredentialId(credentialId: string): Promise<string[]> {
		if (!(await this.exists())) return [];

		const ownerProjectSubquery = this.manager
			.createQueryBuilder()
			.subQuery()
			.select('sc.projectId')
			.from(SharedCredentials, 'sc')
			.where('sc.credentialsId = :credentialId')
			.andWhere('sc.role = :ownerRole')
			.getQuery();

		// Only selects providerKey data from table
		const rows = await this.createQueryBuilder('connection')
			.select('connection.providerKey', 'providerKey')
			.leftJoin('connection.projectAccess', 'access')
			.where('connection.isEnabled = :isEnabled', { isEnabled: true })
			.andWhere(
				new Brackets((qb) => {
					qb.where('access.secretsProviderConnectionId IS NULL') // Global
						.orWhere(`access.projectId IN ${ownerProjectSubquery}`); // Owner project
				}),
			)
			.setParameters({ credentialId, ownerRole: 'credential:owner' })
			.getRawMany<{ providerKey: string }>();

		return rows.map((row: { providerKey: string }) => row.providerKey);
	}

	/**
	 * Find a connection by its providerKey if it is accessible from a project.
	 * A connection is accessible if it's either:
	 * - A global connection (no project access restrictions), OR
	 * - Explicitly granted access to the specified project
	 * Returns null if not found or not accessible.
	 */
	async findAccessibleByProviderKeyAndProjectId(
		providerKey: string,
		projectId: string,
	): Promise<SecretsProviderConnection | null> {
		return await this.manager
			.createQueryBuilder(SecretsProviderConnection, 'connection')
			.leftJoinAndSelect('connection.projectAccess', 'access')
			.leftJoinAndSelect('access.project', 'project')
			.where('connection.providerKey = :providerKey', { providerKey })
			.andWhere(
				new Brackets((qb) => {
					qb.where('access.secretsProviderConnectionId IS NULL') // Global
						.orWhere('access.projectId = :projectId', { projectId }); // Project-specific
				}),
			)
			.getOne();
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
}
