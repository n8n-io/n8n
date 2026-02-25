/**
 * Credential Resolver Module
 *
 * Provides interfaces and infrastructure for dynamic credential resolution based on execution context.
 * Resolvers fetch credential data at runtime from external storage based on entity identity.
 */

export {
	CredentialResolverEntryMetadata,
	CredentialResolver,
} from './credential-resolver-metadata';
export * from './errors';
export type * from './credential-resolver';
