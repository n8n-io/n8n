// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHttpHeaders, createPipelineRequest } from "@azure/core-rest-pipeline";
import { credentialLogger, formatError, formatSuccess } from "../util/logging.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { IdentityClient } from "../client/identityClient.js";
import { getIdentityTokenEndpointSuffix } from "../util/identityTokenEndpoint.js";
import { tracingClient } from "../util/tracing.js";
const logger = credentialLogger("ClientSecretCredential");
// This credential is exported on browser bundles for development purposes.
// For this credential to work in browsers, browsers would need to have security features disabled.
// Please do not disable your browser security features.
/**
 * Enables authentication to Microsoft Entra ID using a client secret
 * that was generated for an App Registration.  More information on how
 * to configure a client secret can be found here:
 *
 * https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-configure-app-access-web-apis#add-credentials-to-your-web-application
 *
 */
export class ClientSecretCredential {
    identityClient;
    tenantId;
    additionallyAllowedTenantIds;
    clientId;
    clientSecret;
    /**
     * Creates an instance of the ClientSecretCredential with the details
     * needed to authenticate against Microsoft Entra ID with a client
     * secret.
     *
     * @param tenantId - The Microsoft Entra tenant (directory) ID.
     * @param clientId - The client (application) ID of an App Registration in the tenant.
     * @param clientSecret - A client secret that was generated for the App Registration.
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(tenantId, clientId, clientSecret, options) {
        this.identityClient = new IdentityClient(options);
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        this.clientId = clientId;
        this.clientSecret = clientSecret;
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if
     * successful.  If authentication cannot be performed at this time, this method may
     * return null.  If an error occurs during authentication, an {@link AuthenticationError}
     * containing failure details will be thrown.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                TokenCredential implementation might make.
     */
    async getToken(scopes, options = {}) {
        return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            const tenantId = processMultiTenantRequest(this.tenantId, newOptions, this.additionallyAllowedTenantIds);
            const query = new URLSearchParams({
                response_type: "token",
                grant_type: "client_credentials",
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: typeof scopes === "string" ? scopes : scopes.join(" "),
            });
            try {
                const urlSuffix = getIdentityTokenEndpointSuffix(tenantId);
                const request = createPipelineRequest({
                    url: `${this.identityClient.authorityHost}/${tenantId}/${urlSuffix}`,
                    method: "POST",
                    body: query.toString(),
                    headers: createHttpHeaders({
                        Accept: "application/json",
                        "Content-Type": "application/x-www-form-urlencoded",
                    }),
                    abortSignal: options && options.abortSignal,
                    tracingOptions: newOptions?.tracingOptions,
                });
                const tokenResponse = await this.identityClient.sendTokenRequest(request);
                logger.getToken.info(formatSuccess(scopes));
                return (tokenResponse && tokenResponse.accessToken) || null;
            }
            catch (err) {
                logger.getToken.info(formatError(scopes, err));
                throw err;
            }
        });
    }
}
//# sourceMappingURL=clientSecretCredential-browser.mjs.map