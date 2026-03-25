"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientAssertionCredential = void 0;
const msalClient_js_1 = require("../msal/nodeFlows/msalClient.js");
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const errors_js_1 = require("../errors.js");
const logging_js_1 = require("../util/logging.js");
const tracing_js_1 = require("../util/tracing.js");
const logger = (0, logging_js_1.credentialLogger)("ClientAssertionCredential");
/**
 * Authenticates a service principal with a JWT assertion.
 */
class ClientAssertionCredential {
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
            throw new errors_js_1.CredentialUnavailableError("ClientAssertionCredential: tenantId is a required parameter.");
        }
        if (!clientId) {
            throw new errors_js_1.CredentialUnavailableError("ClientAssertionCredential: clientId is a required parameter.");
        }
        if (!getAssertion) {
            throw new errors_js_1.CredentialUnavailableError("ClientAssertionCredential: clientAssertion is a required parameter.");
        }
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
        this.options = options;
        this.getAssertion = getAssertion;
        this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
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
        return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
            return this.msalClient.getTokenByClientAssertion(arrayScopes, this.getAssertion, newOptions);
        });
    }
}
exports.ClientAssertionCredential = ClientAssertionCredential;
//# sourceMappingURL=clientAssertionCredential.js.map