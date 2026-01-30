import { Service } from '@n8n/di';
import { DataSource, Repository, In, Not } from '@n8n/typeorm';

import { ProjectSecretsProviderAccess, SecretsProviderConnection } from '../entities';

@Service()
export class SecretsProviderConnectionRepository extends Repository<SecretsProviderConnection> {
	constructor(dataSource: DataSource) {
		super(SecretsProviderConnection, dataSource.manager);
	}

	async findAll(): Promise<SecretsProviderConnection[]> {
		return await this.find();
	}

	/**
	 * Find all global connections (connections with no project access entries)
	 */
	async findGlobalConnections(): Promise<SecretsProviderConnection[]> {
		// Get all connection IDs that have project access
		const connectionsWithAccess = await this.manager
			.createQueryBuilder(ProjectSecretsProviderAccess, 'access')
			.select('DISTINCT access.secretsProviderConnectionId', 'connectionId')
			.getRawMany<{ connectionId: number }>();

		const connectionIds = connectionsWithAccess.map((r) => r.connectionId);

		// If no connections have access, return all connections
		if (connectionIds.length === 0) {
			return await this.find({ relations: ['projectAccess'] });
		}

		// Return connections that are NOT in the list of connections with access
		return await this.find({
			where: { id: Not(In(connectionIds)) },
			relations: ['projectAccess'],
		});
	}

	/**
	 * Find all connections that have access to a specific project
	 */
	async findByProjectId(projectId: string): Promise<SecretsProviderConnection[]> {
		// Get connection IDs that have access to this project
		const accessRecords = await this.manager.find(ProjectSecretsProviderAccess, {
			where: { projectId },
			select: ['secretsProviderConnectionId'],
		});

		if (accessRecords.length === 0) {
			return [];
		}

		const connectionIds = accessRecords.map((r) => r.secretsProviderConnectionId);

		// Return connections with the projectAccess relation loaded
		return await this.find({
			where: { id: In(connectionIds) },
			relations: ['projectAccess'],
		});
	}
}
