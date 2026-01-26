import { Logger } from '@n8n/backend-common';
import { SecretsProviderConnection, SecretsProviderConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Loads providers connections from the database and caches them in memory
 */
@Service()
export class SecretsProviderConnectionStoreCache {
	private cache = new Map<string, SecretsProviderConnection>();

	private cacheInitialized = false;

	constructor(
		private readonly logger: Logger,
		private readonly connectionRepository: SecretsProviderConnectionRepository,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	private async ensureCacheInitialized(): Promise<void> {
		if (!this.cacheInitialized) {
			await this.reloadAll();
		}
	}

	async reloadAll(): Promise<SecretsProviderConnection[]> {
		this.cacheInitialized = false;
		const connections = await this.connectionRepository.findAll();
		this.cache.clear();
		for (const connection of connections) {
			this.cache.set(connection.providerKey, connection);
		}
		this.cacheInitialized = true;
		this.logger.debug(`Loaded ${connections.length} connections into cache`);
		return connections;
	}

	async getCachedConnections(): Promise<SecretsProviderConnection[]> {
		await this.ensureCacheInitialized();
		return Array.from(this.cache.values());
	}

	async getCachedConnectionByProviderKey(
		providerKey: string,
	): Promise<SecretsProviderConnection | undefined> {
		await this.ensureCacheInitialized();
		return this.cache.get(providerKey);
	}

	async reloadConnection(providerKey: string): Promise<SecretsProviderConnection | null> {
		const connection = await this.connectionRepository.findOneByProviderKey(providerKey);

		if (connection) {
			this.cache.set(providerKey, connection);
			this.logger.debug(`Reloaded connection into cache: ${providerKey}`);
		} else {
			this.cache.delete(providerKey);
			this.logger.debug(`Connection not found during reload, removed from cache: ${providerKey}`);
		}

		return connection;
	}

	async create(connection: SecretsProviderConnection): Promise<SecretsProviderConnection> {
		const connectionEntity = this.connectionRepository.create(connection);

		const savedConnection = await this.connectionRepository.save(connectionEntity);

		if (savedConnection) {
			this.cache.set(savedConnection.providerKey, savedConnection);
			this.logger.debug(`Created connection in cache: ${savedConnection.providerKey}`);
		}

		return savedConnection;
	}

	async update(connection: SecretsProviderConnection): Promise<SecretsProviderConnection> {
		const result = await this.connectionRepository.updateByProviderKey(
			connection.providerKey,
			connection,
		);

		if (result.affected) {
			const updatedConnection = await this.connectionRepository.findOneByProviderKey(
				connection.providerKey,
			);
			if (updatedConnection) {
				this.cache.set(connection.providerKey, updatedConnection);
				this.logger.debug(`Updated connection in cache: ${connection.providerKey}`);
				return updatedConnection;
			}
		}

		const existingConnection = await this.connectionRepository.findOneByProviderKey(
			connection.providerKey,
		);
		if (existingConnection) {
			this.cache.set(connection.providerKey, existingConnection);
			return existingConnection;
		} else {
			this.cache.delete(connection.providerKey);
			this.logger.debug(`Connection not found, removed from cache: ${connection.providerKey}`);
		}

		return connection;
	}

	async delete(providerKey: string): Promise<void> {
		const result = await this.connectionRepository.deleteByProviderKey(providerKey);

		if (result.affected) {
			this.cache.delete(providerKey);
			this.logger.debug(`Deleted connection from cache: ${providerKey}`);
		}
	}
}
