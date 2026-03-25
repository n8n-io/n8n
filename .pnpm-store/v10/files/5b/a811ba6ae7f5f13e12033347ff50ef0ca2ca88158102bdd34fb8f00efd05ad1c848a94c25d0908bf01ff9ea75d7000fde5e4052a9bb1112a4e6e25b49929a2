"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgenticAuthenticationService = void 0;
const environment_utils_1 = require("./environment-utils");
/**
 * Service for handling agentic user authentication.
 */
class AgenticAuthenticationService {
    static async GetAgenticUserToken(authorization, authHandlerName, turnContext, scopes) {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- Intentional: maintaining backward compatibility for deprecated 3-param overload
        const effectiveScopes = scopes ?? [environment_utils_1.PROD_MCP_PLATFORM_AUTHENTICATION_SCOPE];
        return (await authorization.exchangeToken(turnContext, authHandlerName, { scopes: effectiveScopes })).token || '';
    }
}
exports.AgenticAuthenticationService = AgenticAuthenticationService;
//# sourceMappingURL=agentic-authorization-service.js.map