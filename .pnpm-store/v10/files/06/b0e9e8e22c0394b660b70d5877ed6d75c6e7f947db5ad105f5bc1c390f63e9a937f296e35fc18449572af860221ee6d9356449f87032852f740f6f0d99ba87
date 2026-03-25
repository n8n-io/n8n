import { TurnContext } from '@microsoft/agents-hosting';
/**
 * Utility class providing helper methods for agent runtime operations.
 */
export declare class Utility {
    private static cachedPackageName;
    /**
     * Reads the application name from package.json at module load time.
     * This ensures file I/O happens during initialization, not during requests.
     *
     * Note: Uses process.cwd() which assumes the application is started from its root directory.
     * This is a fallback mechanism - npm_package_name (checked first in getApplicationName) is
     * the preferred source as it's reliably set by npm/pnpm when running package scripts.
     */
    private static initPackageName;
    /**
     * **WARNING: NO SIGNATURE VERIFICATION** - This method uses jwt.decode() which does NOT
     * verify the token signature. The token claims can be spoofed by malicious actors.
     * This method is ONLY suitable for logging, analytics, and diagnostics purposes.
     * Do NOT use the returned value for authorization, access control, or security decisions.
     *
     * Decodes the current token and retrieves the App ID (appid or azp claim).
     *
     * Note: Returns a default GUID ('00000000-0000-0000-0000-000000000000') for empty tokens
     * for backward compatibility with callers that expect a valid-looking GUID.
     * For agent identification where empty string is preferred, use {@link getAgentIdFromToken}.
     *
     * @param token Token to Decode
     * @returns AppId, or default GUID for empty token, or empty string if decode fails
     */
    static GetAppIdFromToken(token: string): string;
    /**
     * **WARNING: NO SIGNATURE VERIFICATION** - This method uses jwt.decode() which does NOT
     * verify the token signature. The token claims can be spoofed by malicious actors.
     * This method is ONLY suitable for logging, analytics, and diagnostics purposes.
     * Do NOT use the returned value for authorization, access control, or security decisions.
     *
     * Decodes the token and retrieves the best available agent identifier.
     * Checks claims in priority order: xms_par_app_azp (agent blueprint ID) > appid > azp.
     *
     * Note: Returns empty string for empty/missing tokens (unlike {@link GetAppIdFromToken} which
     * returns a default GUID). This allows callers to omit headers when no identifier is available.
     *
     * @param token JWT token to decode
     * @returns Agent ID (GUID) or empty string if not found or token is empty
     */
    static getAgentIdFromToken(token: string): string;
    /**
     * Resolves the agent identity from the turn context or auth token.
     * @param context Turn Context of the turn.
     * @param authToken Auth token if available.
     * @returns Agent identity (App ID)
     */
    static ResolveAgentIdentity(context: TurnContext, authToken: string): string;
    /**
     * Generates a User-Agent header string containing SDK version, OS type, Node.js version, and orchestrator.
     * @param orchestrator Optional orchestrator identifier to include in the User-Agent string.
     * @returns Formatted User-Agent header string.
     */
    static GetUserAgentHeader(orchestrator?: string): string;
    /**
     * Gets the application name from npm_package_name environment variable or package.json.
     * The package.json result is cached at module load time to avoid sync I/O during requests.
     * @returns Application name or undefined if not available.
     */
    static getApplicationName(): string | undefined;
    /**
     * Resets the cached application name. Used for testing purposes.
     * @internal
     */
    static resetApplicationNameCache(): void;
}
//# sourceMappingURL=utility.d.ts.map