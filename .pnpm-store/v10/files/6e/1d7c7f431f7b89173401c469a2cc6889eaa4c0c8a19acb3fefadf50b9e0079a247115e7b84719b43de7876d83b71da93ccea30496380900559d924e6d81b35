// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, resolveTenantId, } from "../util/tenantIdUtils.js";
import { credentialLogger, formatError } from "../util/logging.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { tracingClient } from "../util/tracing.js";
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { DeveloperSignOnClientId } from "../constants.js";
import { CredentialUnavailableError } from "../errors.js";
const logger = credentialLogger("BrokerCredential");
/**
 * Enables authentication to Microsoft Entra ID using WAM (Web Account Manager) broker.
 * This credential uses the default account logged into the OS via a broker.
 */
export class BrokerCredential {
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
        this.brokerTenantId = resolveTenantId(logger, options.tenantId);
        this.brokerAdditionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
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
        this.brokerMsalClient = createMsalClient(DeveloperSignOnClientId, this.brokerTenantId, msalClientOptions);
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
        return tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = processMultiTenantRequest(this.brokerTenantId, newOptions, this.brokerAdditionallyAllowedTenantIds, logger);
            const arrayScopes = ensureScopes(scopes);
            try {
                return this.brokerMsalClient.getBrokeredToken(arrayScopes, true, {
                    ...newOptions,
                    disableAutomaticAuthentication: true,
                });
            }
            catch (e) {
                logger.getToken.info(formatError(arrayScopes, e));
                throw new CredentialUnavailableError("Failed to acquire token using broker authentication", { cause: e });
            }
        });
    }
}
//# sourceMappingURL=brokerCredential.js.map