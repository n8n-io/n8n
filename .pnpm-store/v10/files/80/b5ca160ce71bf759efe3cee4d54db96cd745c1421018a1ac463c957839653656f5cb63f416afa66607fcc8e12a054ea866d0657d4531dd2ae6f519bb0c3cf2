// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { checkTenantId } from "../util/tenantIdUtils.js";
import { credentialLogger } from "../util/logging.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { tracingClient } from "../util/tracing.js";
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
const logger = credentialLogger("AuthorizationCodeCredential");
/**
 * Enables authentication to Microsoft Entra ID using an authorization code
 * that was obtained through the authorization code flow, described in more detail
 * in the Microsoft Entra ID documentation:
 *
 * https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
 */
export class AuthorizationCodeCredential {
    msalClient;
    disableAutomaticAuthentication;
    authorizationCode;
    redirectUri;
    tenantId;
    additionallyAllowedTenantIds;
    clientSecret;
    /**
     * @hidden
     * @internal
     */
    constructor(tenantId, clientId, clientSecretOrAuthorizationCode, authorizationCodeOrRedirectUri, redirectUriOrOptions, options) {
        checkTenantId(logger, tenantId);
        this.clientSecret = clientSecretOrAuthorizationCode;
        if (typeof redirectUriOrOptions === "string") {
            // the clientId+clientSecret constructor
            this.authorizationCode = authorizationCodeOrRedirectUri;
            this.redirectUri = redirectUriOrOptions;
            // in this case, options are good as they come
        }
        else {
            // clientId only
            this.authorizationCode = clientSecretOrAuthorizationCode;
            this.redirectUri = authorizationCodeOrRedirectUri;
            this.clientSecret = undefined;
            options = redirectUriOrOptions;
        }
        // TODO: Validate tenant if provided
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        this.msalClient = createMsalClient(clientId, tenantId, {
            ...options,
            logger,
            tokenCredentialOptions: options ?? {},
        });
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    async getToken(scopes, options = {}) {
        return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            const tenantId = processMultiTenantRequest(this.tenantId, newOptions, this.additionallyAllowedTenantIds);
            newOptions.tenantId = tenantId;
            const arrayScopes = ensureScopes(scopes);
            return this.msalClient.getTokenByAuthorizationCode(arrayScopes, this.redirectUri, this.authorizationCode, this.clientSecret, {
                ...newOptions,
                disableAutomaticAuthentication: this.disableAutomaticAuthentication,
            });
        });
    }
}
//# sourceMappingURL=authorizationCodeCredential.js.map