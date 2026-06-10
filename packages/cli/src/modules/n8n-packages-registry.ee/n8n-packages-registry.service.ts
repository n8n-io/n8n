import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnprocessableRequestError } from '@/errors/response-errors/unprocessable.error';

import { N8nPackagesRegistryConnectionsService } from './n8n-packages-registry-connections.service';
import {
	SOURCE_CONTROL_REGISTRY_ID,
	type N8nPackagesRegistryConnection,
} from './n8n-packages-registry.types';
import { N8nPackagesRegistryProviders } from './providers/n8n-packages-registry-providers.service';

@Service()
export class N8nPackagesRegistryService {
	constructor(
		private readonly logger: Logger,
		private readonly connectionsService: N8nPackagesRegistryConnectionsService,
		private readonly providers: N8nPackagesRegistryProviders,
	) {}

	async listRegistries(): Promise<N8nPackagesRegistryConnection[]> {
		return await this.connectionsService.findAllAvailable();
	}

	async isConnected(): Promise<boolean> {
		const sourceControlRegistry = await this.connectionsService.findById(
			SOURCE_CONTROL_REGISTRY_ID,
		);
		const isConnected = sourceControlRegistry?.enabled === true;
		this.logger.info(`Source control package registry is connected: ${isConnected}`);
		return isConnected;
	}

	async findAllProjects(user: User, registryId = SOURCE_CONTROL_REGISTRY_ID) {
		const registry = await this.createRegistry(registryId);
		return await registry.listProjects(user);
	}

	async findImportableChangesGroupedByProject(user: User, registryId = SOURCE_CONTROL_REGISTRY_ID) {
		const registry = await this.createRegistry(registryId);
		return await registry.getImportableChangesGroupedByProject(user);
	}

	async importProjectChanges(
		user: User,
		projectId: string,
		registryId = SOURCE_CONTROL_REGISTRY_ID,
	) {
		const registry = await this.createRegistry(registryId);
		return await registry.importProjectChanges(user, projectId);
	}

	private async createRegistry(registryId: string) {
		const connection = await this.connectionsService.findById(registryId);

		if (!connection) {
			throw new NotFoundError(`Package registry not found: ${registryId}`);
		}

		if (!connection.enabled) {
			throw new UnprocessableRequestError(`Package registry is not enabled: ${registryId}`);
		}

		const provider = this.providers.getProvider(connection.type);

		if (!provider) {
			throw new UnprocessableRequestError(`Unsupported package registry type: ${connection.type}`);
		}

		return await provider.init(connection);
	}
}
