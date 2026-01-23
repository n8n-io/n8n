import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import {
	CredentialResolverConfiguration,
	CredentialResolverValidationError,
	ICredentialResolver,
} from '@n8n/decorators';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { Cipher } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';

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
	) {
		this.logger = this.logger.scoped('dynamic-credentials');
	}

	/**
	 * Creates a new credential resolver.
	 * @throws {CredentialResolverValidationError} When the resolver type is unknown or config is invalid
	 */
	async create(params: CreateResolverParams): Promise<DynamicCredentialResolver> {
		const canUseExternalSecrets = hasGlobalScope(params.user, 'externalSecret:list');

		await this.validateConfig(params.type, params.config, canUseExternalSecrets);

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

		const canUseExternalSecrets = hasGlobalScope(params.user, 'externalSecret:list');

		if (params.type !== undefined) {
			existing.type = params.type;
			// Re-validate existing config against new type if config wasn't provided
			if (params.config === undefined) {
				const existingConfig = this.decryptConfig(existing.config);
				await this.validateConfig(existing.type, existingConfig, canUseExternalSecrets);
			}
		}

		if (params.config !== undefined) {
			await this.validateConfig(existing.type, params.config, canUseExternalSecrets);
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
	 * Deletes a credential resolver by ID.
	 * @throws {DynamicCredentialResolverNotFoundError} When resolver is not found
	 */
	async delete(id: string): Promise<void> {
		const existing = await this.repository.findOneBy({ id });
		if (!existing) {
			throw new DynamicCredentialResolverNotFoundError(id);
		}

		await this.repository.remove(existing);
		this.logger.debug(`Deleted credential resolver "${existing.name}" (${id})`);
	}

	/**
	 * Validates the config against the resolver type's schema.
	 * Resolves expressions
	 * @throws {CredentialResolverValidationError} When the resolver type is unknown or config is invalid
	 */
	private async validateConfig(
		type: string,
		config: CredentialResolverConfiguration,
		canUseExternalSecrets: boolean = false,
	): Promise<void> {
		const resolverImplementation = this.registry.getResolverByTypename(type);
		if (!resolverImplementation) {
			throw new CredentialResolverValidationError(`Unknown resolver type: ${type}`);
		}

		// Resolve expressions in the config to validate syntax
		let resolvedConfig = config;
		try {
			resolvedConfig = await this.expressionService.resolve(config, canUseExternalSecrets ?? false);
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
