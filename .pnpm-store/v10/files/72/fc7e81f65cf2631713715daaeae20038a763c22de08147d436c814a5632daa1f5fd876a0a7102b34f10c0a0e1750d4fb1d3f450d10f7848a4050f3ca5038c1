// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, resolveTenantId, } from "../util/tenantIdUtils.js";
import { credentialLogger } from "../util/logging.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { tracingClient } from "../util/tracing.js";
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { DeveloperSignOnClientId } from "../constants.js";
const logger = credentialLogger("InteractiveBrowserCredential");
/**
 * Enables authentication to Microsoft Entra ID inside of the web browser
 * using the interactive login flow.
 */
export class InteractiveBrowserCredential {
    tenantId;
    additionallyAllowedTenantIds;
    msalClient;
    disableAutomaticAuthentication;
    browserCustomizationOptions;
    loginHint;
    /**
     * Creates an instance of InteractiveBrowserCredential with the details needed.
     *
     * This credential uses the [Authorization Code Flow](https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow).
     * On Node.js, it will open a browser window while it listens for a redirect response from the authentication service.
     * On browsers, it authenticates via popups. The `loginStyle` optional parameter can be set to `redirect` to authenticate by redirecting the user to an Azure secure login page, which then will redirect the user back to the web application where the authentication started.
     *
     * For Node.js, if a `clientId` is provided, the Microsoft Entra application will need to be configured to have a "Mobile and desktop applications" redirect endpoint.
     * Follow our guide on [setting up Redirect URIs for Desktop apps that calls to web APIs](https://learn.microsoft.com/entra/identity-platform/scenario-desktop-app-registration#redirect-uris).
     *
     * @param options - Options for configuring the client which makes the authentication requests.
     */
    constructor(options) {
        this.tenantId = resolveTenantId(logger, options.tenantId, options.clientId);
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        const msalClientOptions = {
            ...options,
            tokenCredentialOptions: options,
            logger,
        };
        const ibcNodeOptions = options;
        this.browserCustomizationOptions = ibcNodeOptions.browserCustomizationOptions;
        this.loginHint = ibcNodeOptions.loginHint;
        if (ibcNodeOptions?.brokerOptions?.enabled) {
            if (!ibcNodeOptions?.brokerOptions?.parentWindowHandle) {
                throw new Error("In order to do WAM authentication, `parentWindowHandle` under `brokerOptions` is a required parameter");
            }
            else {
                msalClientOptions.brokerOptions = {
                    enabled: true,
                    parentWindowHandle: ibcNodeOptions.brokerOptions.parentWindowHandle,
                    legacyEnableMsaPassthrough: ibcNodeOptions.brokerOptions?.legacyEnableMsaPassthrough,
                    useDefaultBrokerAccount: ibcNodeOptions.brokerOptions?.useDefaultBrokerAccount,
                };
            }
        }
        this.msalClient = createMsalClient(options.clientId ?? DeveloperSignOnClientId, this.tenantId, msalClientOptions);
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
            return this.msalClient.getTokenByInteractiveRequest(arrayScopes, {
                ...newOptions,
                disableAutomaticAuthentication: this.disableAutomaticAuthentication,
                browserCustomizationOptions: this.browserCustomizationOptions,
                loginHint: this.loginHint,
            });
        });
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the token can't be retrieved silently, this method will always generate a challenge for the user.
     *
     * On Node.js, this credential has [Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636) enabled by default.
     * PKCE is a security feature that mitigates authentication code interception attacks.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                  TokenCredential implementation might make.
     */
    async authenticate(scopes, options = {}) {
        return tracingClient.withSpan(`${this.constructor.name}.authenticate`, options, async (newOptions) => {
            const arrayScopes = ensureScopes(scopes);
            await this.msalClient.getTokenByInteractiveRequest(arrayScopes, {
                ...newOptions,
                disableAutomaticAuthentication: false, // this method should always allow user interaction
                browserCustomizationOptions: this.browserCustomizationOptions,
                loginHint: this.loginHint,
            });
            return this.msalClient.getActiveAccount();
        });
    }
}
//# sourceMappingURL=interactiveBrowserCredential.js.map