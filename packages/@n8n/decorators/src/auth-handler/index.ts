/**
 * Authentication Handler Module
 *
 * Provides interfaces and infrastructure for authentication handlers.
 * Handlers can implement custom authentication logic for different auth methods (LDAP, SAML, OAuth, etc.).
 *
 * The system uses a discriminated union pattern based on the `type` field in metadata:
 * - 'password': Username/password authentication (IPasswordAuthHandler)
 * - Future: 'oauth', 'saml', etc.
 */

export { AuthHandlerEntryMetadata, AuthHandler } from './auth-handler-metadata';
export type * from './auth-handler';
