// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { CredentialUnavailableError } from "../errors.js";
import { credentialLogger } from "../util/logging.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { tracingClient } from "../util/tracing.js";
const logger = credentialLogger("UsernamePasswordCredential");
/**
 * Enables authentication to Microsoft Entra ID with a user's
 * username and password. This credential requires a high degree of
 * trust so you should only use it when other, more secure credential
 * types can't be used.
 * @deprecated UsernamePasswordCredential is deprecated. Use a more secure credential. See https://aka.ms/azsdk/identity/mfa for details.
 */
export class UsernamePasswordCredential {
    tenantId;
    additionallyAllowedTenantIds;
    msalClient;
    username;
    password;
    /**
     * Creates an instance of the UsernamePasswordCredential with the details
     * needed to authenticate against Microsoft Entra ID with a username
     * and password.
     *
     * @param tenantId - The Microsoft Entra tenant (directory).
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param username - The user account's e-mail address (user name).
     * @param password - The user account's account password
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId, clientId, username, password, options = {}) {
        if (!tenantId) {
            throw new CredentialUnavailableError("UsernamePasswordCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
        }
        if (!clientId) {
            throw new CredentialUnavailableError("UsernamePasswordCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
        }
        if (!username) {
            throw new CredentialUnavailableError("UsernamePasswordCredential: username is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
        }
        if (!password) {
            throw new CredentialUnavailableError("UsernamePasswordCredential: password is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/usernamepasswordcredential/troubleshoot.");
        }
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        this.username = username;
        this.password = password;
        this.msalClient = createMsalClient(clientId, this.tenantId, {
            ...options,
            tokenCredentialOptions: options ?? {},
        });
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the user provided the option `disableAutomaticAuthentication`,
     * once the token can't be retrieved silently,
     * this method won't attempt to request user interaction to retrieve the token.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    async getToken(scopes, options = {}) {
        return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = processMultiTenantRequest(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = ensureScopes(scopes);
            return this.msalClient.getTokenByUsernamePassword(arrayScopes, this.username, this.password, newOptions);
        });
    }
}
//# sourceMappingURL=usernamePasswordCredential.js.map