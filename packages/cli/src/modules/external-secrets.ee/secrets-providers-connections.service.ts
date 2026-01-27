import type {
	SecretProviderConnection,
	SecretsProviderState,
	SecretsProviderType,
} from '@n8n/api-types';
import type { SecretsProviderConnection } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

@Service()
export class SecretsProvidersConnectionsService {
	constructor(
		private readonly repository: SecretsProviderConnectionRepository,
		private readonly projectAccessRepository: ProjectSecretsProviderAccessRepository,
		private readonly cipher: Cipher,
	) {}

	async createConnection(
		providerKey: string,
		type: string,
		projectIds: string[],
		settings: IDataObject,
	): Promise<SecretsProviderConnection> {
		const encryptedSettings = this.encryptConnectionSettings(settings);

		const connection = this.repository.create({
			providerKey,
			type,
			encryptedSettings,
			isEnabled: false,
		});

		const savedConnection = await this.repository.save(connection);

		if (projectIds.length > 0) {
			const entries = projectIds.map((projectId) =>
				this.projectAccessRepository.create({
					secretsProviderConnectionId: savedConnection.id,
					projectId,
				}),
			);
			await this.projectAccessRepository.save(entries);
		}

		// Do a new lookup as we eagerly fill out projects
		return (await this.repository.findOne({ where: { providerKey } }))!;
	}

	async updateConnection(
		providerKey: string,
		updates: {
			type?: string;
			projectIds?: string[];
			settings?: IDataObject;
		},
	): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findOne({ where: { providerKey } });

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}
		if (updates.type !== undefined) {
			connection.type = updates.type;
		}
		if (updates.settings !== undefined) {
			connection.encryptedSettings = this.encryptConnectionSettings(updates.settings);
		}

		await this.repository.save(connection);

		if (updates.projectIds !== undefined) {
			await this.projectAccessRepository.setProjectAccess(connection.id, updates.projectIds);
		}

		return (await this.repository.findOne({ where: { providerKey } })) as SecretsProviderConnection;
	}

	async deleteConnection(providerKey: string): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findOne({ where: { providerKey } });

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}

		await this.projectAccessRepository.deleteByConnectionId(connection.id);
		await this.repository.remove(connection);

		return connection;
	}

	async getConnection(providerKey: string): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findOne({ where: { providerKey } });

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}

		return connection;
	}

	async listConnections(): Promise<SecretsProviderConnection[]> {
		return await this.repository.findAll();
	}

	toPublicConnection(connection: SecretsProviderConnection): SecretProviderConnection {
		return {
			id: connection.providerKey,
			name: connection.providerKey,
			type: connection.type as SecretsProviderType,

			isEnabled: connection.isEnabled,
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
			})),
			settings: {}, // We should never return these back to the FE so force it to an empty object
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),

			//TODO - These fields will need filling when we come to do that actual connections piece
			secretsCount: 0,
			state: 'initializing' as SecretsProviderState,
		};
	}

	private encryptConnectionSettings(settings: IDataObject): string {
		return this.cipher.encrypt(settings);
	}
}
