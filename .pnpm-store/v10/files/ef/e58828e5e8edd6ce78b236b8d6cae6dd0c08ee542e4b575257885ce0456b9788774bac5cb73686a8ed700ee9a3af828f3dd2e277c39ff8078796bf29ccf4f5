"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientSecretCredential = void 0;
const msalClient_js_1 = require("../msal/nodeFlows/msalClient.js");
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const errors_js_1 = require("../errors.js");
const logging_js_1 = require("../util/logging.js");
const scopeUtils_js_1 = require("../util/scopeUtils.js");
const tracing_js_1 = require("../util/tracing.js");
const logger = (0, logging_js_1.credentialLogger)("ClientSecretCredential");
/**
 * Enables authentication to Microsoft Entra ID using a client secret
 * that was generated for an App Registration. More information on how
 * to configure a client secret can be found here:
 *
 * https://learn.microsoft.com/entra/identity-platform/quickstart-configure-app-access-web-apis#add-credentials-to-your-web-application
 *
 */
class ClientSecretCredential {
    tenantId;
    additionallyAllowedTenantIds;
    msalClient;
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
    constructor(tenantId, clientId, clientSecret, options = {}) {
        if (!tenantId) {
            throw new errors_js_1.CredentialUnavailableError("ClientSecretCredential: tenantId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.");
        }
        if (!clientId) {
            throw new errors_js_1.CredentialUnavailableError("ClientSecretCredential: clientId is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.");
        }
        if (!clientSecret) {
            throw new errors_js_1.CredentialUnavailableError("ClientSecretCredential: clientSecret is a required parameter. To troubleshoot, visit https://aka.ms/azsdk/js/identity/serviceprincipalauthentication/troubleshoot.");
        }
        this.clientSecret = clientSecret;
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
        this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
            ...options,
            logger,
            tokenCredentialOptions: options,
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
        return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
            return this.msalClient.getTokenByClientSecret(arrayScopes, this.clientSecret, newOptions);
        });
    }
}
exports.ClientSecretCredential = ClientSecretCredential;
//# sourceMappingURL=clientSecretCredential.js.map