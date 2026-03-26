import { Logger } from '@n8n/backend-common';
import { User, WorkflowRepository } from '@n8n/db';
import {
	CredentialResolverConfiguration,
	CredentialResolverValidationError,
	ICredentialResolver,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

import { ActiveWorkflowManager } from '@/active-workflow-manager';

import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { ResolverConfigExpressionService } from './resolver-config-expression.service';
import { DynamicCredentialResolver } from '../database/entities/credential-resolver';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import { DynamicCredentialResolverNotFoundError } from '../errors/credential-resolver-not-found.error';

export interface CreateResolverParams {
	name: string;
	type: string;
	config: CredentialResolverConfiguration;
	user: User;
}

export interface UpdateResolverParams {
	name?: string;
	type?: string;
	config?: CredentialResolverConfiguration;
	clearCredentials?: boolean;
	user: User;
}

/**
 * Service layer for managing DynamicCredentialResolver entities.
 * Provides CRUD operations with:
 * - Config encryption at rest
 * - Validation against resolver type's config schema
 * - Expression resolution in config values
 */
@Service()
export class DynamicCredentialResolverService {
	constructor(
		private readonly logger: Logger,
		private readonly repository: DynamicCredentialResolverRepository,
		private readonly registry: DynamicCredentialResolverRegistry,
		private readonly cipher: Cipher,
		private readonly expressionService: ResolverConfigExpressionService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
	) {
		this.logger = this.logger.scoped('dynamic-credentials');
	}

	/**
	 * Creates a new credential resolver.
	 * @throws {CredentialResolverValidationError} When the resolver type is unknown or config is invalid
	 */
	async create(params: CreateResolverParams): Promise<DynamicCredentialResolver> {
		await this.validateConfig(params.type, params.config);

		const encryptedConfig = this.encryptConfig(params.config);

		const resolver = this.repository.create({
			name: params.name,
			type: params.type,
			config: encryptedConfig,
		});

		const saved = await this.repository.save(resolver);
		this.logger.debug(`Created credential resolver "${saved.name}" (${saved.id})`);

		return this.withDecryptedConfig(saved);
	}

	/**
	 * Retrieves all credential resolvers.
	 * Config is returned decrypted.
	 */
	async findAll(): Promise<DynamicCredentialResolver[]> {
		const resolvers = await this.repository.find();
		return resolvers.map((resolver) => this.withDecryptedConfig(resolver));
	}

	/**
	 * Retrieves all available resolver types.
	 */
	getAvailableTypes(): ICredentialResolver[] {
		return this.registry.getAllResolvers();
	}

	/**
	 * Retrieves a credential resolver by ID.
	 * Config is returned decrypted.
	 * @throws {DynamicCredentialResolverNotFoundError} When resolver is not found
	 */
	async findById(id: string): Promise<DynamicCredentialResolver> {
		const resolver = await this.repository.findOneBy({ id });
		if (!resolver) {
			throw new DynamicCredentialResolverNotFoundError(id);
		}
		return this.withDecryptedConfig(resolver);
	}

	/**
	 * Updates an existing credential resolver.
	 * @throws {DynamicCredentialResolverNotFoundError} When resolver is not found
	 * @throws {CredentialResolverValidationError} When the config is invalid for the resolver type
	 */
	async update(id: string, params: UpdateResolverParams): Promise<DynamicCredentialResolver> {
		const existing = await this.repository.findOneBy({ id });
		if (!existing) {
			throw new DynamicCredentialResolverNotFoundError(id);
		}

		if (params.type !== undefined) {
			existing.type = params.type;
			// Re-validate existing config against new type if config wasn't provided
			if (params.config === undefined) {
				const existingConfig = this.decryptConfig(existing.config);
				await this.validateConfig(existing.type, existingConfig);
			}
		}

		if (params.config !== undefined) {
			await this.validateConfig(existing.type, params.config);
			existing.config = this.encryptConfig(params.config);
		}

		if (params.name !== undefined) {
			existing.name = params.name;
		}

		if (params.clearCredentials === true) {
			const resolver = this.registry.getResolverByTypename(existing.type);

			if (!resolver) {
				throw new CredentialResolverValidationError(`Unknown resolver type: ${existing.type}`);
			}

			if ('deleteAllSecrets' in resolver && typeof resolver.deleteAllSecrets === 'function') {
				await resolver.deleteAllSecrets({
					resolverId: id,
					resolverName: resolver.metadata.name,
					configuration: this.decryptConfig(existing.config),
				});
			}
		}

		const saved = await this.repository.save(existing);
		this.logger.debug(`Updated credential resolver "${saved.name}" (${saved.id})`);

		return this.withDecryptedConfig(saved);
	}

	/**
	 * Finds workflows that reference a credential resolver by ID.
	 * @throws {DynamicCredentialResolverNotFoundError} When resolver is not found
	 */
	async findAffectedWorkflows(id: string): Promise<Array<{ id: string; name: string }>> {
		const existing = await this.repository.findOneBy({ id });
		if (!existing) {
			throw new DynamicCredentialResolverNotFoundError(id);
		}
		return await this.workflowRepository.findByCredentialResolverId(id);
	}

	/**
	 * Deletes a credential resolver by ID.
	 * Clears credentialResolverId from workflow settings and reactivates affected
	 * active workflows so that the ActiveWorkflowManager picks up the updated settings.
	 * @throws {DynamicCredentialResolverNotFoundError} When resolver is not found
	 */
	async delete(id: string): Promise<void> {
		const existing = await this.repository.findOneBy({ id });
		if (!existing) {
			throw new DynamicCredentialResolverNotFoundError(id);
		}

		// Identify active workflows that reference this resolver before clearing
		const affectedWorkflows = await this.workflowRepository.findActiveByCredentialResolverId(id);

		// Clear workflow references and delete resolver in a single transaction
		const { manager } = this.repository;
		await manager.transaction(async (trx) => {
			await this.workflowRepository.clearCredentialResolverId(id, trx);
			await trx.remove(existing);
		});

		this.logger.debug(`Deleted credential resolver "${existing.name}" (${id})`);

		// Reactivate affected active workflows sequentially so they pick up the cleared settings
		for (const workflowId of affectedWorkflows) {
			try {
				await this.activeWorkflowManager.remove(workflowId);
				await this.activeWorkflowManager.add(workflowId, 'update');
			} catch (error) {
				this.logger.warn(
					`Failed to reactivate workflow "${workflowId}" after resolver deletion, deactivating it`,
					{ error },
				);
				// Deactivate the workflow so UI state reflects reality
				await this.workflowRepository.update(workflowId, {
					active: false,
					activeVersionId: null,
				});
			}
		}
	}

	/**
	 * Validates the config against the resolver type's schema.
	 * Resolves expressions
	 * @throws {CredentialResolverValidationError} When the resolver type is unknown or config is invalid
	 */
	private async validateConfig(
		type: string,
		config: CredentialResolverConfiguration,
	): Promise<void> {
		const resolverImplementation = this.registry.getResolverByTypename(type);
		if (!resolverImplementation) {
			throw new CredentialResolverValidationError(`Unknown resolver type: ${type}`);
		}

		// Resolve expressions in the config to validate syntax
		let resolvedConfig = config;
		try {
			resolvedConfig = await this.expressionService.resolve(config);
		} catch (error) {
			// If expression resolution fails, it means there's a syntax error
			throw new CredentialResolverValidationError(
				`Invalid expression in resolver config: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Validate the resolved config against the resolver's schema
		await resolverImplementation.validateOptions(resolvedConfig);
	}

	/**
	 * Encrypts the config for storage.
	 */
	private encryptConfig(config: CredentialResolverConfiguration): string {
		return this.cipher.encrypt(config);
	}

	/**
	 * Decrypts the config from storage.
	 */
	private decryptConfig(encryptedConfig: string): CredentialResolverConfiguration {
		const decryptedData = this.cipher.decrypt(encryptedConfig);
		try {
			return jsonParse<CredentialResolverConfiguration>(decryptedData);
		} catch {
			throw new UnexpectedError(
				'Credential resolver config could not be decrypted. The likely reason is that a different "encryptionKey" was used to encrypt the data.',
			);
		}
	}

	/**
	 * Populates the decryptedConfig field on the resolver.
	 */
	private withDecryptedConfig(resolver: DynamicCredentialResolver): DynamicCredentialResolver {
		resolver.decryptedConfig = this.decryptConfig(resolver.config);
		return resolver;
	}
}
