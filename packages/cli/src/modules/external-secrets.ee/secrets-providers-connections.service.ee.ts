import type { SecretCompletionsResponse, SecretsProviderType } from '@n8n/api-types';
import {
	CreateSecretsProviderConnectionDto,
	TestSecretProviderConnectionResponse,
	testSecretProviderConnectionResponseSchema,
	reloadSecretProviderConnectionResponseSchema,
	ReloadSecretProviderConnectionResponse,
} from '@n8n/api-types';
import type { SecretsProviderConnection } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';

import { jsonParse } from 'n8n-workflow';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { ProjectSummary } from '@/events/maps/relay.event-map';
import { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { RedactionService } from '@/modules/external-secrets.ee/redaction.service.ee';
import { SecretsProvidersResponses } from '@/modules/external-secrets.ee/secrets-providers.responses.ee';

@Service()
export class SecretsProvidersConnectionsService {
	constructor(
		private readonly repository: SecretsProviderConnectionRepository,
		private readonly projectAccessRepository: ProjectSecretsProviderAccessRepository,
		private readonly cipher: Cipher,
		private readonly externalSecretsManager: ExternalSecretsManager,
		private readonly redactionService: RedactionService,
		private readonly eventService: EventService,
	) {}

	async createConnection(
		proposedConnection: CreateSecretsProviderConnectionDto,
		userId: string,
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
			isEnabled: true,
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
		const result = (await this.repository.findOne({
			where: { providerKey: proposedConnection.providerKey },
		}))!;

		await this.externalSecretsManager.syncProviderConnection(proposedConnection.providerKey);

		this.eventService.emit('external-secrets-connection-created', {
			userId,
			providerKey: result.providerKey,
			vaultType: result.type,
			...this.extractProjectInfo(result),
		});

		return result;
	}

	async updateConnection(
		providerKey: string,
		updates: {
			type?: string;
			projectIds?: string[];
			settings?: IDataObject;
		},
		userId: string,
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
			// Unredact incoming settings before encrypting
			const savedSettings = this.decryptConnectionSettings(connection.encryptedSettings);
			const unredactedSettings = this.redactionService.unredact(updates.settings, savedSettings);
			connection.encryptedSettings = this.encryptConnectionSettings(unredactedSettings);
		}

		await this.repository.save(connection);

		if (updates.projectIds !== undefined) {
			await this.projectAccessRepository.setProjectAccess(connection.id, updates.projectIds);
		}

		await this.externalSecretsManager.syncProviderConnection(providerKey);

		const result = (await this.repository.findOne({
			where: { providerKey },
		})) as SecretsProviderConnection;

		this.eventService.emit('external-secrets-connection-updated', {
			userId,
			providerKey: result.providerKey,
			vaultType: result.type,
			...this.extractProjectInfo(result),
		});

		return result;
	}

	async deleteConnection(providerKey: string, userId: string): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findOne({ where: { providerKey } });

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}

		const projectInfo = this.extractProjectInfo(connection);

		await this.projectAccessRepository.deleteByConnectionId(connection.id);
		await this.repository.remove(connection);

		await this.externalSecretsManager.syncProviderConnection(providerKey);

		this.eventService.emit('external-secrets-connection-deleted', {
			userId,
			providerKey: connection.providerKey,
			vaultType: connection.type,
			...projectInfo,
		});

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

	async getGlobalCompletions(): Promise<SecretsProviderConnection[]> {
		return await this.repository.findGlobalConnections();
	}

	async getProjectCompletions(projectId: string): Promise<SecretsProviderConnection[]> {
		return await this.repository.findByProjectId(projectId);
	}

	async listConnectionsForProject(projectId: string): Promise<SecretsProviderConnection[]> {
		return await this.repository.findAllAccessibleByProjectWithProjectAccess(projectId);
	}

	toSecretCompletionsResponse(connections: SecretsProviderConnection[]): SecretCompletionsResponse {
		return Object.fromEntries(
			connections.map((connection) => [
				connection.providerKey,
				this.externalSecretsManager.getSecretNames(connection.providerKey),
			]),
		);
	}

	toPublicConnectionListItem(
		connection: SecretsProviderConnection,
	): SecretsProvidersResponses.ConnectionListItem {
		return {
			id: String(connection.id),
			name: connection.providerKey,
			type: connection.type as SecretsProviderType,
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
			})),
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),
		};
	}

	toPublicConnection(connection: SecretsProviderConnection): SecretsProvidersResponses.Connection {
		const decryptedSettings = this.decryptConnectionSettings(connection.encryptedSettings);
		const { provider } = this.externalSecretsManager.getProviderWithSettings(connection.type);
		const redactedSettings = this.redactionService.redact(decryptedSettings, provider.properties);

		return {
			id: String(connection.id),
			name: connection.providerKey,
			type: connection.type as SecretsProviderType,
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
			})),
			settings: redactedSettings,
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),
		};
	}

	async testConnection(
		providerKey: string,
		userId: string,
	): Promise<TestSecretProviderConnectionResponse> {
		const connection = await this.getConnection(providerKey);
		const decryptedSettings = this.decryptConnectionSettings(connection.encryptedSettings);
		const result = await this.externalSecretsManager.testProviderSettings(
			connection.type,
			decryptedSettings,
		);
		const response = testSecretProviderConnectionResponseSchema.parse(result);

		this.eventService.emit('external-secrets-connection-tested', {
			userId,
			providerKey: connection.providerKey,
			vaultType: connection.type,
			...this.extractProjectInfo(connection),
			isValid: response.success,
			...(response.error && { errorMessage: response.error }),
		});

		return response;
	}

	async reloadConnectionSecrets(
		providerKey: string,
		userId: string,
	): Promise<ReloadSecretProviderConnectionResponse> {
		const connection = await this.getConnection(providerKey);
		await this.externalSecretsManager.updateProvider(providerKey);

		this.eventService.emit('external-secrets-connection-reloaded', {
			userId,
			providerKey: connection.providerKey,
			vaultType: connection.type,
			...this.extractProjectInfo(connection),
		});

		return reloadSecretProviderConnectionResponseSchema.parse({ success: true });
	}

	private extractProjectInfo(connection: SecretsProviderConnection): {
		projects: ProjectSummary[];
	} {
		return {
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
			})),
		};
	}

	private encryptConnectionSettings(settings: IDataObject): string {
		return this.cipher.encrypt(settings);
	}

	private decryptConnectionSettings(encryptedSettings: string): IDataObject {
		return jsonParse(this.cipher.decrypt(encryptedSettings));
	}
}
