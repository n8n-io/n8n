import type { Constructable } from '@n8n/di';
import type {
	ICredentialContext,
	ICredentialDataDecryptedObject,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Configuration object passed to resolver methods. Structure is defined by resolver type's metadata.options.
 */
export type CredentialResolverConfiguration = Record<string, unknown>;

/**
 * Metadata describing a credential resolver type for UI integration and discovery.
 */
export interface CredentialResolverMetadata {
	/** Unique identifier for the resolver type */
	name: string;

	/** Human-readable description of what this resolver does */
	description: string;

	/** Optional display name shown in UI. Falls back to name if not provided. */
	displayName?: string;

	/** Configuration schema using n8n's INodeProperties format for dynamic form rendering */
	options?: INodeProperties[];
}

/**
 * Core interface for credential resolver implementations.
 * Resolvers fetch credential data dynamically based on execution context and configuration.
 */
export interface ICredentialResolver {
	/** Metadata for UI integration and resolver discovery */
	metadata: CredentialResolverMetadata;

	/**
	 * Retrieves credential data for a specific entity from the resolver's storage.
	 * @throws {CredentialResolverDataNotFoundError} When no data exists for the given context
	 * @throws {CredentialResolverError} For other resolver-specific errors
	 */
	getSecret(
		credentialId: string,
		context: ICredentialContext,
		options: CredentialResolverConfiguration,
	): Promise<ICredentialDataDecryptedObject>;

	/**
	 * Stores credential data for a specific entity in the resolver's storage.
	 * @throws {CredentialResolverError} When storage operation fails
	 */
	setSecret(
		credentialId: string,
		context: ICredentialContext,
		data: ICredentialDataDecryptedObject,
		options: CredentialResolverConfiguration,
	): Promise<void>;

	/**
	 * Deletes credential data for a specific entity from the resolver's storage.
	 * Optional - not all resolvers support deletion.
	 * @throws {CredentialResolverError} When deletion operation fails
	 */
	deleteSecret?(
		credentialId: string,
		context: ICredentialContext,
		options: CredentialResolverConfiguration,
	): Promise<void>;

	/**
	 * Validates resolver configuration before saving.
	 * Should verify connectivity, authentication, and configuration structure.
	 * @throws {CredentialResolverValidationError} When configuration is invalid
	 */
	validateOptions(options: CredentialResolverConfiguration): Promise<void>;

	/**
	 * Runs initialization logic for the resolver. This might be called multiple times!
	 * Optional - not all resolvers require initialization.
	 */
	init?(): Promise<void>;
}

/**
 * Type helper for credential resolver class constructors.
 */
export type CredentialResolverClass = Constructable<ICredentialResolver>;
