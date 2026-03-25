"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrokerCredential = void 0;
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const logging_js_1 = require("../util/logging.js");
const scopeUtils_js_1 = require("../util/scopeUtils.js");
const tracing_js_1 = require("../util/tracing.js");
const msalClient_js_1 = require("../msal/nodeFlows/msalClient.js");
const constants_js_1 = require("../constants.js");
const errors_js_1 = require("../errors.js");
const logger = (0, logging_js_1.credentialLogger)("BrokerCredential");
/**
 * Enables authentication to Microsoft Entra ID using WAM (Web Account Manager) broker.
 * This credential uses the default account logged into the OS via a broker.
 */
class BrokerCredential {
    brokerMsalClient;
    brokerTenantId;
    brokerAdditionallyAllowedTenantIds;
    /**
     * Creates an instance of BrokerCredential with the required broker options.
     *
     * This credential uses WAM (Web Account Manager) for authentication, which provides
     * better security and user experience on Windows platforms.
     *
     * @param options - Options for configuring the broker credential, including required broker options.
     */
    constructor(options) {
        this.brokerTenantId = (0, tenantIdUtils_js_1.resolveTenantId)(logger, options.tenantId);
        this.brokerAdditionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
        const msalClientOptions = {
            ...options,
            tokenCredentialOptions: options,
            logger,
            brokerOptions: {
                enabled: true,
                parentWindowHandle: new Uint8Array(0),
                useDefaultBrokerAccount: true,
            },
        };
        this.brokerMsalClient = (0, msalClient_js_1.createMsalClient)(constants_js_1.DeveloperSignOnClientId, this.brokerTenantId, msalClientOptions);
    }
    /**
     * Authenticates with Microsoft Entra ID using WAM broker and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * This method extends the base getToken method to support silentAuthenticationOnly option
     * when using broker authentication.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure the token request, including silentAuthenticationOnly option.
     */
    async getToken(scopes, options = {}) {
        return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.brokerTenantId, newOptions, this.brokerAdditionallyAllowedTenantIds, logger);
            const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
            try {
                return this.brokerMsalClient.getBrokeredToken(arrayScopes, true, {
                    ...newOptions,
                    disableAutomaticAuthentication: true,
                });
            }
            catch (e) {
                logger.getToken.info((0, logging_js_1.formatError)(arrayScopes, e));
                throw new errors_js_1.CredentialUnavailableError("Failed to acquire token using broker authentication", { cause: e });
            }
        });
    }
}
exports.BrokerCredential = BrokerCredential;
//# sourceMappingURL=brokerCredential.js.map