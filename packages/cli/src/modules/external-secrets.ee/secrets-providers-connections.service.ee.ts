import {
	type CreateSecretsProviderConnectionDto,
	type ReloadSecretProviderConnectionResponse,
	reloadSecretProviderConnectionResponseSchema,
	type SecretCompletionsResponse,
	type SecretProviderConnection,
	type SecretProviderConnectionListItem,
	type SecretsProviderType,
	type TestSecretProviderConnectionResponse,
	testSecretProviderConnectionResponseSchema,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { SecretsProviderAccessRole, SecretsProviderConnection } from '@n8n/db';
import {
	ProjectSecretsProviderAccessRepository,
	SecretsProviderConnectionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { In } from '@n8n/typeorm';
import { Cipher } from 'n8n-core';
import type { IDataObject } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { EventService } from '@/events/event.service';
import type { ProjectSummary } from '@/events/maps/relay.event-map';
import { ExternalSecretsManager } from '@/modules/external-secrets.ee/external-secrets-manager.ee';
import { RedactionService } from '@/modules/external-secrets.ee/redaction.service.ee';

import { ExternalSecretsProviderRegistry } from './provider-registry.service';

@Service()
export class SecretsProvidersConnectionsService {
	constructor(
		private readonly logger: Logger,
		private readonly repository: SecretsProviderConnectionRepository,
		private readonly projectAccessRepository: ProjectSecretsProviderAccessRepository,
		private readonly providerRegistry: ExternalSecretsProviderRegistry,
		private readonly cipher: Cipher,
		private readonly externalSecretsManager: ExternalSecretsManager,
		private readonly redactionService: RedactionService,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('external-secrets');
	}

	async createConnection(
		proposedConnection: CreateSecretsProviderConnectionDto,
		userId: string,
		projectRole: SecretsProviderAccessRole,
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
					role: projectRole,
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

	async updateProjectConnection(
		providerKey: string,
		updates: {
			type?: string;
			settings?: IDataObject;
			isEnabled?: boolean;
		},
		userId: string,
	): Promise<SecretsProviderConnection> {
		const connection = await this.findConnectionOrFail(providerKey);
		this.applyConnectionUpdates(connection, updates);
		await this.repository.save(connection);

		return await this.syncAndEmitUpdate(providerKey, userId);
	}

	async updateGlobalConnection(
		providerKey: string,
		updates: {
			type?: string;
			projectIds?: string[];
			settings?: IDataObject;
			isEnabled?: boolean;
		},
		userId: string,
	): Promise<SecretsProviderConnection> {
		const connection = await this.findConnectionOrFail(providerKey);
		this.applyConnectionUpdates(connection, updates);
		await this.repository.save(connection);

		if (updates.projectIds !== undefined) {
			const existing = await this.projectAccessRepository.findByConnectionId(connection.id);
			const existingProjectIds = new Set(existing.map((e) => e.projectId));
			const desiredProjectIds = new Set(updates.projectIds);

			// Remove access for projects no longer in the list
			const projectIdsToRemove = existing
				.filter((e) => !desiredProjectIds.has(e.projectId))
				.map((e) => e.projectId);

			// Add access for newly added projects with user role
			// Existing projects keep their current role (e.g. owner)
			const entriesToAdd = updates.projectIds
				.filter((id) => !existingProjectIds.has(id))
				.map((projectId) => ({
					projectId,
					role: 'secretsProviderConnection:user' as const,
				}));

			await this.projectAccessRepository.updateProjectAccess(
				connection.id,
				projectIdsToRemove,
				entriesToAdd,
			);
		}

		return await this.syncAndEmitUpdate(providerKey, userId);
	}

	private applyConnectionUpdates(
		connection: SecretsProviderConnection,
		updates: { type?: string; settings?: IDataObject; isEnabled?: boolean },
	): void {
		if (updates.type !== undefined) {
			connection.type = updates.type;
			if (!updates.settings) {
				throw new BadRequestError(
					'When changing the connection type, new settings must be provided as well',
				);
			}
		}
		if (updates.settings !== undefined) {
			const savedSettings = this.decryptConnectionSettings(connection.encryptedSettings);
			const unredactedSettings = this.redactionService.unredact(updates.settings, savedSettings);
			connection.encryptedSettings = this.encryptConnectionSettings(unredactedSettings);
		}
		if (updates.isEnabled !== undefined) {
			connection.isEnabled = updates.isEnabled;
		}
	}

	private async syncAndEmitUpdate(
		providerKey: string,
		userId: string,
	): Promise<SecretsProviderConnection> {
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
		const connection = await this.findConnectionOrFail(providerKey);
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

	private async findConnectionOrFail(providerKey: string): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findOne({ where: { providerKey } });
		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}
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
		const connectedProviderKeys = this.providerRegistry.getConnectedNames();

		return await this.repository.findEnabledGlobalConnections({
			providerKeys: connectedProviderKeys,
		});
	}

	async getProjectCompletions(projectId: string): Promise<SecretsProviderConnection[]> {
		const connectedProviderKeys = this.providerRegistry.getConnectedNames();

		return await this.repository.findEnabledByProjectId(projectId, {
			providerKeys: connectedProviderKeys,
		});
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
	): SecretProviderConnectionListItem {
		const secretNames = this.externalSecretsManager.getSecretNames(connection.providerKey);
		const connectionInstance = this.externalSecretsManager.getProvider(connection.providerKey);

		return {
			id: String(connection.id),
			name: connection.providerKey,
			type: connection.type as SecretsProviderType,
			isEnabled: connection.isEnabled,
			secretsCount: secretNames.length,
			// Provider may not be registered yet in multi-main setups.
			// When that's the case the default state is 'initializing'.
			state: connectionInstance?.state ?? 'initializing',
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
				role: access.role,
			})),
			createdAt: connection.createdAt.toISOString(),
			updatedAt: connection.updatedAt.toISOString(),
		};
	}

	toPublicConnection(connection: SecretsProviderConnection): SecretProviderConnection {
		const decryptedSettings = this.decryptConnectionSettings(connection.encryptedSettings);
		const properties = this.externalSecretsManager.getProviderProperties(connection.type);
		const redactedSettings = this.redactionService.redact(decryptedSettings, properties);
		const secretNames = this.externalSecretsManager.getSecretNames(connection.providerKey);
		const connectionInstance = this.externalSecretsManager.getProvider(connection.providerKey);

		return {
			id: String(connection.id),
			name: connection.providerKey,
			type: connection.type as SecretsProviderType,
			isEnabled: connection.isEnabled,
			secretsCount: secretNames.length,
			// Provider may not be registered yet in multi-main setups.
			// When that's the case the default state is 'initializing'.
			state: connectionInstance?.state ?? 'initializing',
			secrets: secretNames.map((name) => ({ name })),
			projects: connection.projectAccess.map((access) => ({
				id: access.project.id,
				name: access.project.name,
				role: access.role,
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
		try {
			const connection = await this.getConnection(providerKey);
			await this.externalSecretsManager.updateProvider(providerKey);

			this.eventService.emit('external-secrets-connection-reloaded', {
				userId,
				providerKey: connection.providerKey,
				vaultType: connection.type,
				...this.extractProjectInfo(connection),
			});

			return reloadSecretProviderConnectionResponseSchema.parse({ success: true });
		} catch (error) {
			if (error instanceof NotFoundError) {
				throw error;
			}
			this.logger.warn(`Failed to reload provider ${providerKey}`, { providerKey });
			return reloadSecretProviderConnectionResponseSchema.parse({ success: false });
		}
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

	/**
	 * Cleans up external-secrets connections when a project is deleted.
	 * - If this project owns the connection, delete it entirely (access rows cascade).
	 * - Otherwise, remove this project's access and disable the shared connection.
	 * - Sync each affected provider key once after cleanup.
	 */
	async cleanupConnectionsForProjectDeletion(projectId: string): Promise<void> {
		const accessEntries = await this.projectAccessRepository.findByProjectId(projectId);
		const providerKeysToSync = new Set<string>();
		const ownerConnectionIds = new Set<number>();
		const nonOwnerConnectionIds = new Set<number>();

		for (const access of accessEntries) {
			providerKeysToSync.add(access.secretsProviderConnection.providerKey);

			if (access.role === 'secretsProviderConnection:owner') {
				ownerConnectionIds.add(access.secretsProviderConnectionId);
			} else {
				nonOwnerConnectionIds.add(access.secretsProviderConnectionId);
			}
		}

		// Wrap deletion + update ops in a transaction for consistency
		await this.repository.manager.transaction(async (entityManager) => {
			if (ownerConnectionIds.size > 0) {
				// Delete owned connections entirely; DB cascade removes access entries
				await entityManager.delete(this.repository.target, { id: In([...ownerConnectionIds]) });
			}

			if (nonOwnerConnectionIds.size > 0) {
				// Remove only this project's access and disable shared connections
				await entityManager.delete(this.projectAccessRepository.target, {
					projectId,
					secretsProviderConnectionId: In([...nonOwnerConnectionIds]),
				});
				await entityManager.update(
					this.repository.target,
					{ id: In([...nonOwnerConnectionIds]) },
					{ isEnabled: false },
				);
			}
		});

		for (const providerKey of providerKeysToSync) {
			await this.externalSecretsManager.syncProviderConnection(providerKey);
		}
	}

	private encryptConnectionSettings(settings: IDataObject): string {
		return this.cipher.encrypt(settings);
	}

	async getConnectionForProject(
		providerKey: string,
		projectId: string,
	): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findByProviderKeyAndProjectId(providerKey, projectId);

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}

		return connection;
	}

	async getConnectionAccessibleFromProject(
		providerKey: string,
		projectId: string,
	): Promise<SecretsProviderConnection> {
		const connection = await this.repository.findAccessibleByProviderKeyAndProjectId(
			providerKey,
			projectId,
		);

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}

		return connection;
	}

	async deleteConnectionForProject(
		providerKey: string,
		projectId: string,
	): Promise<SecretsProviderConnection> {
		const connection = await this.repository.removeByProviderKeyAndProjectId(
			providerKey,
			projectId,
		);

		if (!connection) {
			throw new NotFoundError(`Connection with key "${providerKey}" not found`);
		}

		await this.projectAccessRepository.deleteByConnectionId(connection.id);
		await this.externalSecretsManager.syncProviderConnection(providerKey);

		return connection;
	}

	private decryptConnectionSettings(encryptedSettings: string): IDataObject {
		return jsonParse(this.cipher.decrypt(encryptedSettings));
	}
}
