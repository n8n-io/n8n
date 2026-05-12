import { Logger } from '@n8n/backend-common';
import { CredentialResolverDataNotFoundError, CredentialResolverError } from '@n8n/decorators';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { NextFunction, Response } from 'express';
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
import { DynamicCredentialUserEntryRepository } from '../database/repositories/dynamic-credential-user-entry.repository';
import { DynamicCredentialsConfig } from '../dynamic-credentials.config';
import { CredentialResolutionError } from '../errors/credential-resolution.error';
import { CredentialResolverNotConfiguredError } from '../errors/credential-resolver-not-configured.error';
import { CredentialResolverNotFoundError } from '../errors/credential-resolver-not-found.error';
import { MissingExecutionContextError } from '../errors/missing-execution-context.error';
import { AuthenticatedRequest } from '@n8n/db';

/**
 * Stable identifier for the system-managed resolver instance that powers
 * "private" (per-user self-connect) credentials. The name is reserved and
 * not user-facing.
 */
const PRIVATE_CREDENTIAL_RESOLVER_NAME = '__system_user_self_connect__';
const PRIVATE_CREDENTIAL_RESOLVER_TYPE = 'credential-resolver.n8n-1.0';

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
		private readonly userEntryRepository: DynamicCredentialUserEntryRepository,
		private readonly loadNodesAndCredentials: LoadNodesAndCredentials,
		private readonly cipher: Cipher,
		private readonly logger: Logger,
		private readonly expressionService: ResolverConfigExpressionService,
	) {}

	/**
	 * Returns the subset of credential ids that already have a stored connection
	 * for the given user. Powers the per-user `connectedByMe` flag on credential
	 * list responses.
	 */
	async getConnectedCredentialIdsForUser(
		userId: string,
		credentialIds: string[],
	): Promise<Set<string>> {
		if (credentialIds.length === 0) {
			return new Set();
		}

		const entries = await this.userEntryRepository.find({
			where: { userId, credentialId: In(credentialIds) },
			select: ['credentialId'],
		});

		return new Set(entries.map((entry) => entry.credentialId));
	}

	/**
	 * Returns the id of the system-managed n8n self-connect resolver, creating it
	 * lazily on first call. End-users never need a workspace admin to wire one up
	 * for the "private credential" flow.
	 */
	async getPrivateCredentialResolverId(): Promise<string | null> {
		const existing = await this.resolverRepository.findOneBy({
			name: PRIVATE_CREDENTIAL_RESOLVER_NAME,
			type: PRIVATE_CREDENTIAL_RESOLVER_TYPE,
		});
		if (existing) {
			return existing.id;
		}

		const encryptedEmptyConfig = await this.cipher.encryptV2({});
		const created = this.resolverRepository.create({
			name: PRIVATE_CREDENTIAL_RESOLVER_NAME,
			type: PRIVATE_CREDENTIAL_RESOLVER_TYPE,
			config: encryptedEmptyConfig,
		});
		const saved = await this.resolverRepository.save(created);
		this.logger.debug('Seeded system resolver for private credentials', {
			resolverId: saved.id,
		});
		return saved.id;
	}

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
		// Not resolvable - return static credentials
		if (!credentialsResolveMetadata.isResolvable) {
			return { data: staticData, isDynamic: false };
		}

		// Resolver precedence: explicit credential setting → workflow setting →
		// system "user self-connect" resolver as default for private credentials.
		const resolverId =
			credentialsResolveMetadata.resolverId ??
			workflowSettings?.credentialResolverId ??
			(await this.getPrivateCredentialResolverId());

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
		const credentialContext = await this.buildCredentialContext(executionContext);

		if (!credentialContext) {
			return this.handleMissingContext(credentialsResolveMetadata);
		}

		try {
			const credentialType = this.loadNodesAndCredentials.getCredential(
				credentialsResolveMetadata.type,
			);

			const sharedFields = extractSharedFields(credentialType.type);

			// Decrypt and parse resolver configuration
			const decryptedConfig = await this.cipher.decryptV2(resolverEntity.config);
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

			// Editor-driven manual runs resolve against the running user's own
			// per-user storage — the user is connecting to themselves, so output
			// redaction would just hide their own data. Externally-identified
			// resolutions (chat-hub etc.) keep the safe default.
			const isManualSelfConnect = credentialContext.metadata?.source === 'manual-execution';

			// Adds and override static data with dynamically resolved data
			return {
				data: { ...staticData, ...dynamicData },
				isDynamic: true,
				requiresRedaction: !isManualSelfConnect,
			};
		} catch (error) {
			return this.handleResolutionError(
				credentialsResolveMetadata,
				error,
				resolverId,
				credentialContext.metadata,
			);
		}
	}

	/**
	 * Builds credential context from execution context by decrypting the credentials field
	 */
	private async buildCredentialContext(executionContext: IExecutionContext | undefined) {
		if (!executionContext?.credentials) {
			return undefined;
		}

		try {
			// Decrypt credential context from execution context
			const decrypted = await this.cipher.decryptV2(executionContext.credentials);
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
		credentialContextMetadata?: Record<string, unknown>,
	): never {
		this.logger.debug('Dynamic credential resolution failed', {
			credentialId: credentialsResolveMetadata.id,
			credentialName: credentialsResolveMetadata.name,
			resolverId,
			resolverSource: credentialsResolveMetadata.resolverId ? 'credential' : 'workflow',
			error: error instanceof Error ? error.message : String(error),
		});

		// Manual editor runs: the identity is the running n8n user, so a missing
		// entry means "they haven't connected yet". Surface an actionable message.
		// Other contexts (chat-hub, OAuth introspection) have external identities
		// where this phrasing wouldn't apply — fall through to the generic message.
		if (
			error instanceof CredentialResolverDataNotFoundError &&
			credentialContextMetadata?.source === 'manual-execution'
		) {
			throw new CredentialResolutionError(
				`You haven't connected the credential "${credentialsResolveMetadata.name}" yet. Open it and connect to run this workflow.`,
				{ cause: error },
			);
		}

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
