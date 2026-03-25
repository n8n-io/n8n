import { TurnContext, Authorization } from '@microsoft/agents-hosting';
/**
 * Service for handling agentic user authentication.
 */
export declare class AgenticAuthenticationService {
    /**
     * Gets an agentic user token for platform authentication.
     * Uses the default MCP platform authentication scope.
     *
     * @param authorization The authorization handler.
     * @param authHandlerName The name of the auth handler to use.
     * @param turnContext The turn context for the current request.
     * @returns The token string, or empty string if no token was returned.
     * @deprecated Use the overload with explicit scopes parameter for better control over requested permissions.
     */
    static GetAgenticUserToken(authorization: Authorization, authHandlerName: string, turnContext: TurnContext): Promise<string>;
    /**
     * Gets an agentic user token for platform authentication.
     *
     * @param authorization The authorization handler.
     * @param authHandlerName The name of the auth handler to use.
     * @param turnContext The turn context for the current request.
     * @param scopes The OAuth scopes to request. Should be obtained from the appropriate configuration (e.g., ToolingConfiguration.mcpPlatformAuthenticationScope).
     * @returns The token string, or empty string if no token was returned.
     */
    static GetAgenticUserToken(authorization: Authorization, authHandlerName: string, turnContext: TurnContext, scopes: string[]): Promise<string>;
}
//# sourceMappingURL=agentic-authorization-service.d.ts.map