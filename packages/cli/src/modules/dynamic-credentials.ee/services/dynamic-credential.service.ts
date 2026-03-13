import { Logger } from '@n8n/backend-common';
import { AuthenticatedRequest } from '@n8n/db';
import { CredentialResolverError } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { NextFunction, Response } from 'express';
import { Cipher } from 'n8n-core';
import type {
	ICredentialDataDecryptedObject,
	IExecutionContext,
	IWorkflowSettings,
} from 'n8n-workflow';
import { jsonParse, toCredentialContext } from 'n8n-workflow';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { StaticAuthService } from '@/services/static-auth-service';

import { DynamicCredentialResolverRegistry } from './credential-resolver-registry.service';
import { ResolverConfigExpressionService } from './resolver-config-expression.service';
import { extractSharedFields } from './shared-fields';
import type {
	CredentialResolutionResult,
	CredentialResolveMetadata,
	ICredentialResolutionProvider,
} from '../../../credentials/credential-resolution-provider.interface';
import { DynamicCredentialResolverRepository } from '../database/repositories/credential-resolver.repository';
import { DynamicCredentialsConfig } from '../dynamic-credentials.config';
import { CredentialResolutionError } from '../errors/credential-resolution.error';
import { CredentialResolverNotConfiguredError } from '../errors/credential-resolver-not-configured.error';
import { CredentialResolverNotFoundError } from '../errors/credential-resolver-not-found.error';
import { MissingExecutionContextError } from '../errors/missing-execution-context.error';

/**
 * Service for resolving credentials dynamically via configured resolvers.
 * Acts as a proxy between CredentialsHelper and the dynamic credentials module.
 */
@Service()
export class DynamicCredentialService implements ICredentialResolutionProvider {
	constructor(
		private readonly dynamicCredentialConfig: DynamicCredentialsConfig,
		private readonly resolverRegistry: DynamicCredentialResolverRegistry,
		private readonly resolverRepository: DynamicCredentialResolverRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
		private readonly expressionService: ResolverConfigExpressionService,
	) {}

	/**
	 * Resolves credentials dynamically if configured, otherwise returns static data.
	 * Handles fallback logic based on credential configuration.
	 *
	 * @param credentialsResolveMetadata The credential resolve metadata
	 * @param staticData The decrypted static credential data
	 * @param additionalData Additional workflow execution data for context and settings
	 * @returns Resolved credential data (either dynamic or static)
	 * @throws {CredentialResolutionError} If resolution fails and fallback is not allowed
	 */
	async resolveIfNeeded(
		credentialsResolveMetadata: CredentialResolveMetadata,
		staticData: ICredentialDataDecryptedObject,
		executionContext?: IExecutionContext,
		workflowSettings?: IWorkflowSettings,
	): Promise<CredentialResolutionResult> {
		// Determine which resolver ID to use: credential's own resolver or workflow's fallback
		const resolverId =
			credentialsResolveMetadata.resolverId ?? workflowSettings?.credentialResolverId;

		// Not resolvable - return static credentials
		if (!credentialsResolveMetadata.isResolvable) {
			return { data: staticData, isDynamic: false };
		}

		if (!resolverId) {
			return this.handleResolverNotConfigured(credentialsResolveMetadata);
		}

		// Load resolver configuration
		const resolverEntity = await this.resolverRepository.findOneBy({
			id: resolverId,
		});

		if (!resolverEntity) {
			return this.handleResolverNotFound(credentialsResolveMetadata, resolverId);
		}

		// Get resolver instance from registry
		const resolver = this.resolverRegistry.getResolverByTypename(resolverEntity.type);

		if (!resolver) {
			return this.handleResolverNotFound(credentialsResolveMetadata, resolverId);
		}

		// Build credential context from execution context
		const credentialContext = this.buildCredentialContext(executionContext);

		if (!credentialContext) {
			return this.handleMissingContext(credentialsResolveMetadata);
		}

		try {
			const credentialType = this.loadNodesAndCredentials.getCredential(
				credentialsResolveMetadata.type,
			);

			const sharedFields = extractSharedFields(credentialType.type);

			// Decrypt and parse resolver configuration
			const decryptedConfig = this.cipher.decrypt(resolverEntity.config);
			const parsedConfig = jsonParse<Record<string, unknown>>(decryptedConfig);

			// Resolve expressions in resolver configuration using global data only
			const resolverConfig = await this.expressionService.resolve(parsedConfig);

			// Attempt dynamic resolution
			const dynamicData = await resolver.getSecret(
				credentialsResolveMetadata.id,
				credentialContext,
				{
					resolverId: resolverEntity.id,
					resolverName: resolverEntity.type,
					configuration: resolverConfig,
				},
			);

			this.logger.debug('Successfully resolved dynamic credentials', {
				credentialId: credentialsResolveMetadata.id,
				resolverId,
				resolverSource: credentialsResolveMetadata.resolverId ? 'credential' : 'workflow',
				identity: credentialContext.identity,
			});

			// Remove shared fields from dynamic data to avoid conflicts
			for (const field of sharedFields) {
				if (field in dynamicData) {
					delete dynamicData[field];
				}
			}

			// Adds and override static data with dynamically resolved data
			return { data: { ...staticData, ...dynamicData }, isDynamic: true };
		} catch (error) {
			return this.handleResolutionError(credentialsResolveMetadata, error, resolverId);
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
	 * Throws when resolution fails inside getSecret().
	 * - CredentialResolutionError subtypes (e.g. IdentifierValidationError)
	 *   → rethrown with credential name prepended to the message
	 * - CredentialResolverDataNotFoundError → rethrown with credential name prepended to the message
	 * - Anything else → generic CredentialResolutionError (no internal detail surfaced)
	 */
	private handleResolutionError(
		credentialsResolveMetadata: CredentialResolveMetadata,
		error: unknown,
		resolverId: string,
	): never {
		this.logger.debug('Dynamic credential resolution failed', {
			credentialId: credentialsResolveMetadata.id,
			credentialName: credentialsResolveMetadata.name,
			resolverId,
			resolverSource: credentialsResolveMetadata.resolverId ? 'credential' : 'workflow',
			error: error instanceof Error ? error.message : String(error),
		});

		// Known errors from both the CLI and resolver SDK layers.
		// User-facing, safe to propagate details.
		if (error instanceof CredentialResolutionError || error instanceof CredentialResolverError) {
			throw new CredentialResolutionError(
				`Failed to resolve dynamic credentials for "${credentialsResolveMetadata.name}": ${error.message}`,
				{ cause: error },
			);
		}

		// Internal errors (network, crypto, DB, config validation) must not leak details to the user.
		throw new CredentialResolutionError(
			`Failed to resolve dynamic credentials for "${credentialsResolveMetadata.name}"`,
			{ cause: error },
		);
	}

	/**
	 * Throws when the credential is resolvable but no resolver ID is configured
	 * on the credential or the workflow settings.
	 */
	private handleResolverNotConfigured(
		credentialsResolveMetadata: CredentialResolveMetadata,
	): never {
		this.logger.debug('No resolver configured for dynamic credential', {
			credentialId: credentialsResolveMetadata.id,
			credentialName: credentialsResolveMetadata.name,
		});

		throw new CredentialResolverNotConfiguredError(credentialsResolveMetadata.name);
	}

	/**
	 * Throws when a resolver ID is set but the entity no longer exists in the DB
	 * or the resolver type is not registered.
	 */
	private handleResolverNotFound(
		credentialsResolveMetadata: CredentialResolveMetadata,
		resolverId: string,
	): never {
		this.logger.debug('Resolver not found for dynamic credential', {
			credentialId: credentialsResolveMetadata.id,
			credentialName: credentialsResolveMetadata.name,
			resolverId,
			resolverSource: credentialsResolveMetadata.resolverId ? 'credential' : 'workflow',
		});

		throw new CredentialResolverNotFoundError(credentialsResolveMetadata.name, resolverId);
	}

	/**
	 * Throws when no execution context (or credentials field within it) is available.
	 */
	private handleMissingContext(credentialsResolveMetadata: CredentialResolveMetadata): never {
		this.logger.debug('No execution context available for dynamic credential', {
			credentialId: credentialsResolveMetadata.id,
			credentialName: credentialsResolveMetadata.name,
		});

		throw new MissingExecutionContextError(credentialsResolveMetadata.name);
	}

	/**
	 * Returns middleware for authenticating dynamic credentials endpoints.
	 * Uses static token from configuration.
	 */
	getDynamicCredentialsEndpointsMiddleware() {
		const { endpointAuthToken } = this.dynamicCredentialConfig;
		if (!endpointAuthToken?.trim()) {
			return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
				// If a user was authenticated for this request, we allow access irrelevant of the static authentication
				if (req.user) {
					return next();
				}
				this.logger.error(
					'Dynamic credentials external endpoints require an endpoint auth token. Please set the N8N_DYNAMIC_CREDENTIALS_ENDPOINT_AUTH_TOKEN environment variable to enable access.',
				);
				res.status(500).json({
					message: 'Dynamic credentials configuration is invalid. Check server logs for details.',
				});
				return;
			};
		}

		const staticAuthMiddlware = StaticAuthService.getStaticAuthMiddleware(
			endpointAuthToken,
			'x-authorization',
		)!;

		return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
			// If a user was authenticated for this request, we allow access irrelevant of the static authentication
			if (req.user) {
				return next();
			}
			return staticAuthMiddlware(req, res, next);
		};
	}
}
