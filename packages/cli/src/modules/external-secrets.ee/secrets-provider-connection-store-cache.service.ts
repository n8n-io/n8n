import { Logger } from '@n8n/backend-common';
import { SecretsProviderConnection, SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Loads providers connections from the database and caches them in memory
 */
@Service()
export class SecretsProviderConnectionStoreCache {
	private cache = new Map<string, SecretsProviderConnection>();

	constructor(
		private readonly logger: Logger,
		private readonly connectionRepository: SecretsProviderConnectionRepository,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async loadAll(): Promise<SecretsProviderConnection[]> {
		if (this.cache.size > 0) {
			return Array.from(this.cache.values());
		}

		return await this.reloadAll();
	}

	async reloadAll(): Promise<SecretsProviderConnection[]> {
		const connections = await this.connectionRepository.findAll();
		this.cache.clear();
		for (const connection of connections) {
			this.cache.set(connection.providerKey, connection);
		}
		return connections;
	}

	getCachedConnections(): SecretsProviderConnection[] {
		return Array.from(this.cache.values());
	}

	async reloadConnection(providerKey: string): Promise<SecretsProviderConnection | null> {
		const connection = await this.connectionRepository.findOne({ where: { providerKey } });
		if (connection) {
			this.cache.set(providerKey, connection);
		}

		return connection ?? null;
	}

	async create(connection: SecretsProviderConnection): Promise<SecretsProviderConnection> {
		// TODO: use repository to create connection in the database
		this.cache.set(connection.providerKey, connection);
		return connection;
	}

	async update(connection: SecretsProviderConnection): Promise<SecretsProviderConnection> {
		// TODO: use repository to update connection in the database
		this.cache.set(connection.providerKey, connection);
		return connection;
	}

	async delete(providerKey: string): Promise<void> {
		// TODO: use repository to delete connection in the database
		this.cache.delete(providerKey);
	}

	async get(providerKey: string): Promise<SecretsProviderConnection | undefined> {
		return this.cache.get(providerKey);
	}
}
