/**
 * Auth configuration stored in ~/.../com.vercel.cli/auth.json
 */
export interface AuthConfig {
    /** An `access_token` obtained using the OAuth Device Authorization flow. */
    token?: string;
    /** A `refresh_token` obtained using the OAuth Device Authorization flow. */
    refreshToken?: string;
    /**
     * The absolute time (seconds) when the token expires.
     * Used to optimistically check if the token is still valid.
     */
    expiresAt?: number;
    /** Whether to skip writing this config to disk. */
    skipWrite?: boolean;
}
/**
 * Read the auth config from disk
 * Returns null if the file doesn't exist or cannot be read
 */
export declare function readAuthConfig(): AuthConfig | null;
/**
 * Write the auth config to disk with proper permissions
 */
export declare function writeAuthConfig(config: AuthConfig): void;
/**
 * Check if an access token is valid (not expired)
 * Copied from packages/cli/src/util/client.ts:72-81
 */
export declare function isValidAccessToken(authConfig: AuthConfig): boolean;
