// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, resolveTenantId, } from "../util/tenantIdUtils.js";
import { credentialLogger } from "../util/logging.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { tracingClient } from "../util/tracing.js";
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { DeveloperSignOnClientId } from "../constants.js";
const logger = credentialLogger("DeviceCodeCredential");
/**
 * Method that logs the user code from the DeviceCodeCredential.
 * @param deviceCodeInfo - The device code.
 */
export function defaultDeviceCodePromptCallback(deviceCodeInfo) {
    console.log(deviceCodeInfo.message);
}
/**
 * Enables authentication to Microsoft Entra ID using a device code
 * that the user can enter into https://microsoft.com/devicelogin.
 */
export class DeviceCodeCredential {
    tenantId;
    additionallyAllowedTenantIds;
    disableAutomaticAuthentication;
    msalClient;
    userPromptCallback;
    /**
     * Creates an instance of DeviceCodeCredential with the details needed
     * to initiate the device code authorization flow with Microsoft Entra ID.
     *
     * A message will be logged, giving users a code that they can use to authenticate once they go to https://microsoft.com/devicelogin
     *
     * Developers can configure how this message is shown by passing a custom `userPromptCallback`:
     *
     * ```ts snippet:device_code_credential_example
     * import { DeviceCodeCredential } from "@azure/identity";
     *
     * const credential = new DeviceCodeCredential({
     *   tenantId: process.env.AZURE_TENANT_ID,
     *   clientId: process.env.AZURE_CLIENT_ID,
     *   userPromptCallback: (info) => {
     *     console.log("CUSTOMIZED PROMPT CALLBACK", info.message);
     *   },
     * });
     * ```
     *
     * @param options - Options for configuring the client which makes the authentication requests.
     */
    constructor(options) {
        this.tenantId = options?.tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        const clientId = options?.clientId ?? DeveloperSignOnClientId;
        const tenantId = resolveTenantId(logger, options?.tenantId, clientId);
        this.userPromptCallback = options?.userPromptCallback ?? defaultDeviceCodePromptCallback;
        this.msalClient = createMsalClient(clientId, tenantId, {
            ...options,
            logger,
            tokenCredentialOptions: options || {},
        });
        this.disableAutomaticAuthentication = options?.disableAutomaticAuthentication;
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
            return this.msalClient.getTokenByDeviceCode(arrayScopes, this.userPromptCallback, {
                ...newOptions,
                disableAutomaticAuthentication: this.disableAutomaticAuthentication,
            });
        });
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the token can't be retrieved silently, this method will always generate a challenge for the user.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                  TokenCredential implementation might make.
     */
    async authenticate(scopes, options = {}) {
        return tracingClient.withSpan(`${this.constructor.name}.authenticate`, options, async (newOptions) => {
            const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
            await this.msalClient.getTokenByDeviceCode(arrayScopes, this.userPromptCallback, {
                ...newOptions,
                disableAutomaticAuthentication: false, // this method should always allow user interaction
            });
            return this.msalClient.getActiveAccount();
        });
    }
}
//# sourceMappingURL=deviceCodeCredential.js.map