// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { PROD_MCP_PLATFORM_AUTHENTICATION_SCOPE } from './environment-utils';
/**
 * Service for handling agentic user authentication.
 */
export class AgenticAuthenticationService {
    static async GetAgenticUserToken(authorization, authHandlerName, turnContext, scopes) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Intentional: maintaining backward compatibility for deprecated 3-param overload
        const effectiveScopes = scopes ?? [PROD_MCP_PLATFORM_AUTHENTICATION_SCOPE];
        return (await authorization.exchangeToken(turnContext, authHandlerName, { scopes: effectiveScopes })).token || '';
    }
}
//# sourceMappingURL=agentic-authorization-service.js.map