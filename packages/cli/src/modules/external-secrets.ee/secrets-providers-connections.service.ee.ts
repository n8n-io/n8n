import type { SecretsProviderType } from '@n8n/api-types';
import { CreateSecretsProviderConnectionDto } from '@n8n/api-types/src';
import type { SecretsProviderConnection } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { SecretsProvidersResponses } from '@/modules/external-secrets.ee/secrets-providers.responses.ee';

@Service()
export class SecretsProvidersConnectionsService {
	constructor(
		private readonly repository: SecretsProviderConnectionRepository,
		private readonly projectAccessRepository: ProjectSecretsProviderAccessRepository,
		private readonly cipher: Cipher,
	) {}

	async createConnection(
		proposedConnection: CreateSecretsProviderConnectionDto,
	): Promise<SecretsProviderConnection> {
		const existing = await this.repository.findOne({
			where: { providerKey: proposedConnection.providerKey },
		});
		if (existing) {
			throw new BadRequestError(
				`Connection with key "${proposedConnection.providerKey}" already exists`,
			);
		}

		const encryptedSettings = this.encryptConnectionSettings(proposedConnection.settings);

		const connection = this.repository.create({
			...proposedConnection,
			encryptedSettings,
			isEnabled: false,
		});

		const savedConnection = await this.repository.save(connection);

		if (proposedConnection.projectIds.length > 0) {
			const entries = proposedConnection.projectIds.map((projectId) =>
				this.projectAccessRepository.create({
					secretsProviderConnectionId: savedConnection.id,
					projectId,
				}),
			);
			await this.projectAccessRepository.save(entries);
		}

		// Do a new lookup as we eagerly fill out projects
		return (await this.repository.findOne({
			where: { providerKey: proposedConnection.providerKey },
		}))!;
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
			if (!updates.settings) {
				throw new BadRequestError(
					'When changing the connection type, new settings must be provided as well',
				);
			}
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

	toPublicConnection(
		connection: SecretsProviderConnection,
	): SecretsProvidersResponses.StrippedConnection {
		return {
			id: String(connection.id),
			name: connection.providerKey,
			type: connection.type as SecretsProviderType,
			isEnabled: connection.isEnabled,
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
			})),
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),
		};
	}

	private encryptConnectionSettings(settings: IDataObject): string {
		return this.cipher.encrypt(settings);
	}
}
