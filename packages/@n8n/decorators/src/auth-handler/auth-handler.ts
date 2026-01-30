import type { Constructable } from '@n8n/di';

/**
 * Authentication type discriminator.
 * Extend this union as new authentication methods are added (e.g., 'password' | 'oauth' | 'saml').
 */
export type AuthType = 'password';

/**
 * Metadata describing an auth handler.
 */
export interface AuthHandlerMetadata {
	/** Unique name of the auth handler (e.g., 'ldap', 'saml') */
	name: string;
	/** Type of authentication this handler provides */
	type: AuthType;
}

/**
 * Base interface for all authentication handlers.
 * Contains common fields shared across all auth types.
 */
interface IAuthHandlerBase<TUser> {
	/**
	 * Metadata identifying this auth handler.
	 */
	readonly metadata: AuthHandlerMetadata;

	/** The user type returned by the auth handler */
	readonly userClass: Constructable<TUser>;

	/**
	 * Optional lifecycle hook called during handler initialization.
	 * Use this to set up connections, load config, etc.
	 */
	init?(): Promise<void>;
}

/**
 * Interface for password-based authentication handlers.
 * Implementations can provide custom authentication logic for different auth methods (LDAP, SAML, etc.).
 *
 * @template TUser - The user type returned by the auth handler (typically from @n8n/db)
 */
export interface IPasswordAuthHandler<TUser> extends IAuthHandlerBase<TUser> {
	readonly metadata: AuthHandlerMetadata & { type: 'password' };

	/**
	 * Handles login attempt with provided credentials.
	 *
	 * @param loginId - User identifier (email, username, LDAP ID, etc.)
	 * @param password - User password
	 * @returns User object if authentication succeeds, undefined otherwise
	 */
	handleLogin(loginId: string, password: string): Promise<TUser | undefined>;
}

/**
 * Union type of all authentication handler interfaces.
 * TypeScript uses the `metadata.type` field to discriminate between handler types.
 */
export type IAuthHandler<TUser = unknown> = IPasswordAuthHandler<TUser>;

/**
 * Type helper for auth handler class constructors.
 */
export type AuthHandlerClass = Constructable<IAuthHandler>;
