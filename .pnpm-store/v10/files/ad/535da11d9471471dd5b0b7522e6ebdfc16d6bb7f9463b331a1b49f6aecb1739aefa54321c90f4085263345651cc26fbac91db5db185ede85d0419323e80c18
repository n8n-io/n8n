// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { CredentialUnavailableError } from "../errors.js";
import { credentialLogger } from "../util/logging.js";
import { tracingClient } from "../util/tracing.js";
const logger = credentialLogger("ClientAssertionCredential");
/**
 * Authenticates a service principal with a JWT assertion.
 */
export class ClientAssertionCredential {
    msalClient;
    tenantId;
    additionallyAllowedTenantIds;
    getAssertion;
    options;
    /**
     * Creates an instance of the ClientAssertionCredential with the details
     * needed to authenticate against Microsoft Entra ID with a client
     * assertion provided by the developer through the `getAssertion` function parameter.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param getAssertion - A function that retrieves the assertion for the credential to use.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId, clientId, getAssertion, options = {}) {
        if (!tenantId) {
            throw new CredentialUnavailableError("ClientAssertionCredential: tenantId is a required parameter.");
        }
        if (!clientId) {
            throw new CredentialUnavailableError("ClientAssertionCredential: clientId is a required parameter.");
        }
        if (!getAssertion) {
            throw new CredentialUnavailableError("ClientAssertionCredential: clientAssertion is a required parameter.");
        }
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        this.options = options;
        this.getAssertion = getAssertion;
        this.msalClient = createMsalClient(clientId, tenantId, {
            ...options,
            logger,
            tokenCredentialOptions: this.options,
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
            newOptions.tenantId = processMultiTenantRequest(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
            return this.msalClient.getTokenByClientAssertion(arrayScopes, this.getAssertion, newOptions);
        });
    }
}
//# sourceMappingURL=clientAssertionCredential.js.map