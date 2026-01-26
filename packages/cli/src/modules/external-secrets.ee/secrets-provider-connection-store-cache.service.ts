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
		if (this.cache.length > 0) {
			return this.cache;
		}

		return await this.reloadAll();
	}

	async reloadAll(): Promise<SecretsProviderConnection[]> {
		this.cache = await this.connectionRepository.findAll();
		return this.cache;
	}

	getCachedConnections(): SecretsProviderConnection[] {
		return this.cache;
	}

	async reloadConnection(providerKey: string): Promise<SecretsProviderConnection | null> {
		const connection = await this.connectionRepository.findOne({ where: { providerKey } });
		if (connection) {
			this.cache = this.cache.map((c) => (c.providerKey === providerKey ? connection : c));
		}

		return connection ?? null;
	}

	async create(connection: SecretsProviderConnection): Promise<SecretsProviderConnection> {
		// TODO: use repository to create connection in the database
		this.cache.push(connection);
		return connection;
	}

	async update(connection: SecretsProviderConnection): Promise<SecretsProviderConnection> {
		// TODO: use repository to update connection in the database
		this.cache = this.cache.map((c) => (c.providerKey === connection.providerKey ? connection : c));
		return connection;
	}

	async delete(providerKey: string): Promise<void> {
		// TODO: use repository to delete connection in the database
		this.cache = this.cache.filter((c) => c.providerKey !== providerKey);
	}

	async get(providerKey: string): Promise<SecretsProviderConnection | undefined> {
		return this.cache.find((c) => c.providerKey === providerKey);
	}
}
