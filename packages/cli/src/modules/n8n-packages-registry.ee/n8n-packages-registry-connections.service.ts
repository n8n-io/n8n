import { N8nPackagesRegistryConnectionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	SOURCE_CONTROL_REGISTRY_ID,
	type N8nPackagesRegistryConnection,
} from './n8n-packages-registry.types';
import { SourceControlPreferencesService } from '../source-control.ee/source-control-preferences.service.ee';

@Service()
export class N8nPackagesRegistryConnectionsService {
	constructor(
		private readonly registryConnectionRepository: N8nPackagesRegistryConnectionRepository,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {}

	async findAllAvailable(): Promise<N8nPackagesRegistryConnection[]> {
		const storedConnections = await this.registryConnectionRepository.findEnabled();

		return [
			this.getSourceControlConnection(),
			...storedConnections.map((connection): N8nPackagesRegistryConnection => {
				return {
					id: connection.id,
					type: connection.type,
					name: connection.name,
					enabled: connection.isEnabled,
					readonly: false,
					config: connection.config,
					credentialId: connection.credentialId,
				};
			}),
		];
	}

	async findById(id: string): Promise<N8nPackagesRegistryConnection | null> {
		if (id === SOURCE_CONTROL_REGISTRY_ID) return this.getSourceControlConnection();

		const connection = await this.registryConnectionRepository.findEnabledById(id);
		if (!connection) return null;

		return {
			id: connection.id,
			type: connection.type,
			name: connection.name,
			enabled: connection.isEnabled,
			readonly: false,
			config: connection.config,
			credentialId: connection.credentialId,
		};
	}

	private getSourceControlConnection(): N8nPackagesRegistryConnection {
		return {
			id: SOURCE_CONTROL_REGISTRY_ID,
			type: 'source-control',
			name: 'Source control',
			enabled: this.sourceControlPreferencesService.isSourceControlConnected(),
			readonly: true,
			config: {},
			credentialId: null,
		};
	}
}
