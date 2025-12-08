import { Logger } from '@n8n/backend-common';
import type { CredentialsEntity } from '@n8n/db';
import { CredentialResolverDataNotFoundError } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { Cipher } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';
import { jsonParse, toCredentialContext } from 'n8n-workflow';

import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import type { ICredentialResolutionProvider } from '../../../credential-resolution-provider.interface';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import { CredentialResolutionError } from '../errors/credential-resolution.error';

/**
 * Service for resolving credentials dynamically via configured resolvers.
 * Acts as a proxy between CredentialsHelper and the dynamic credentials module.
 */
@Service()
export class DynamicCredentialService implements ICredentialResolutionProvider {
	constructor(
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
	) {}

	/**
	 * Resolves credentials dynamically if configured, otherwise returns static data.
	 * Handles fallback logic based on credential configuration.
	 *
	 * @param credentialsEntity The credential entity from database
	 * @param staticData The decrypted static credential data
	 * @param executionContext Optional execution context containing credential context
	 * @param workflowSettings Optional workflow settings containing resolver ID fallback
	 * @returns Resolved credential data (either dynamic or static)
	 * @throws {CredentialResolutionError} If resolution fails and fallback is not allowed
	 */
	async resolveIfNeeded(
		credentialsEntity: CredentialsEntity,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
		workflowSettings?: IWorkflowSettings,
	): Promise<ICredentialDataDecryptedObject> {
		// Determine which resolver ID to use: credential's own resolver or workflow's fallback
		const resolverId = credentialsEntity.resolverId ?? workflowSettings?.credentialResolverId;

		// Not resolvable - return static credentials
		if (!credentialsEntity.isResolvable || !resolverId) {
			return staticData;
		}

		// Load resolver configuration
		const resolverEntity = await this.resolverRepository.findOneBy({
			id: resolverId,
		});

		if (!resolverEntity) {
			return this.handleMissingResolver(credentialsEntity, staticData, resolverId);
		}

		// Get resolver instance from registry
		const resolver = this.resolverRegistry.getResolverByName(resolverEntity.type);

		if (!resolver) {
			return this.handleMissingResolver(credentialsEntity, staticData, resolverId);
		}

		// Build credential context from execution context
		const credentialContext = this.buildCredentialContext(executionContext);

		if (!credentialContext) {
			return this.handleMissingContext(credentialsEntity, staticData);
		}

		// Decrypt and parse resolver configuration
		const decryptedConfig = this.cipher.decrypt(resolverEntity.config);
		const resolverConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

		try {
			// Attempt dynamic resolution
			const dynamicData = await resolver.getSecret(
				credentialsEntity.id,
				credentialContext,
				resolverConfig,
			);

			this.logger.debug('Successfully resolved dynamic credentials', {
				credentialId: credentialsEntity.id,
				resolverId,
				resolverSource: credentialsEntity.resolverId ? 'credential' : 'workflow',
				identity: credentialContext.identity,
			});

			// Adds and override static data with dynamically resolved data
			return { ...staticData, ...dynamicData };
		} catch (error) {
			return this.handleResolutionError(credentialsEntity, staticData, error, resolverId);
		}
	}

	/**
	 * Builds credential context from execution context by decrypting the credentials field
	 */
	private buildCredentialContext(executionContext: IExecutionContext | undefined) {
		if (!executionContext?.credentials) {
			return undefined;
		}

		try {
			// Decrypt credential context from execution context
			const decrypted = this.cipher.decrypt(executionContext.credentials);
			return toCredentialContext(decrypted);
		} catch (error) {
			this.logger.error('Failed to decrypt credential context from execution context', {
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}

	/**
	 * Handles resolution errors with fallback logic
	 */
	private handleResolutionError(
		credentialsEntity: CredentialsEntity,
		staticData: ICredentialDataDecryptedObject,
		error: unknown,
		resolverId: string,
	): ICredentialDataDecryptedObject {
		const isDataNotFound = error instanceof CredentialResolverDataNotFoundError;

		if (credentialsEntity.resolvableAllowFallback) {
			this.logger.debug('Dynamic credential resolution failed, falling back to static', {
				credentialId: credentialsEntity.id,
				credentialName: credentialsEntity.name,
				resolverId,
				resolverSource: credentialsEntity.resolverId ? 'credential' : 'workflow',
				error: (error as Error).message,
				isDataNotFound,
			});
			return staticData;
		}

		this.logger.debug('Dynamic credential resolution failed without fallback', {
			credentialId: credentialsEntity.id,
			credentialName: credentialsEntity.name,
			resolverId,
			resolverSource: credentialsEntity.resolverId ? 'credential' : 'workflow',
			error,
		});

		throw new CredentialResolutionError(
			`Failed to resolve dynamic credentials for "${credentialsEntity.name}"`,
			{ cause: error },
		);
	}

	/**
	 * Handles missing resolver with fallback logic
	 */
	private handleMissingResolver(
		credentialsEntity: CredentialsEntity,
		staticData: ICredentialDataDecryptedObject,
		resolverId: string,
	): ICredentialDataDecryptedObject {
		if (credentialsEntity.resolvableAllowFallback) {
			this.logger.debug('Resolver not found, falling back to static credentials', {
				credentialId: credentialsEntity.id,
				credentialName: credentialsEntity.name,
				resolverId,
				resolverSource: credentialsEntity.resolverId ? 'credential' : 'workflow',
			});
			return staticData;
		}

		throw new CredentialResolutionError(
			`Resolver "${resolverId}" not found for credential "${credentialsEntity.name}"`,
		);
	}

	/**
	 * Handles missing execution context with fallback logic
	 */
	private handleMissingContext(
		credentialsEntity: CredentialsEntity,
		staticData: ICredentialDataDecryptedObject,
	): ICredentialDataDecryptedObject {
		if (credentialsEntity.resolvableAllowFallback) {
			this.logger.debug('No execution context available, falling back to static credentials', {
				credentialId: credentialsEntity.id,
				credentialName: credentialsEntity.name,
			});
			return staticData;
		}

		throw new CredentialResolutionError(
			`Cannot resolve dynamic credentials without execution context for "${credentialsEntity.name}"`,
		);
	}
}
