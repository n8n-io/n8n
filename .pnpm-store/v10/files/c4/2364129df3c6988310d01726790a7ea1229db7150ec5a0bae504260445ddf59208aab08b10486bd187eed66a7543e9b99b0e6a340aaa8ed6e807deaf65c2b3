"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.InteractiveBrowserCredential = void 0;
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const logging_js_1 = require("../util/logging.js");
const scopeUtils_js_1 = require("../util/scopeUtils.js");
const tracing_js_1 = require("../util/tracing.js");
const msalClient_js_1 = require("../msal/nodeFlows/msalClient.js");
const constants_js_1 = require("../constants.js");
const logger = (0, logging_js_1.credentialLogger)("InteractiveBrowserCredential");
/**
 * Enables authentication to Microsoft Entra ID inside of the web browser
 * using the interactive login flow.
 */
class InteractiveBrowserCredential {
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
        this.tenantId = (0, tenantIdUtils_js_1.resolveTenantId)(logger, options.tenantId, options.clientId);
        this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
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
        this.msalClient = (0, msalClient_js_1.createMsalClient)(options.clientId ?? constants_js_1.DeveloperSignOnClientId, this.tenantId, msalClientOptions);
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
        return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.getToken`, options, async (newOptions) => {
            newOptions.tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds, logger);
            const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
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
        return tracing_js_1.tracingClient.withSpan(`${this.constructor.name}.authenticate`, options, async (newOptions) => {
            const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
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
exports.InteractiveBrowserCredential = InteractiveBrowserCredential;
//# sourceMappingURL=interactiveBrowserCredential.js.map