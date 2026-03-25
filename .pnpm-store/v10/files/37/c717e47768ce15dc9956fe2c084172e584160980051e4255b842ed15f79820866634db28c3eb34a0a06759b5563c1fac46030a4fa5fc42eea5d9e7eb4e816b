// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { tracingClient } from "../util/tracing.js";
import { createMsalBrowserClient } from "../msal/browserFlows/msalBrowserCommon.js";
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
    /**
     * Creates an instance of the InteractiveBrowserCredential with the
     * details needed to authenticate against Microsoft Entra ID with
     * a user identity.
     *
     * This credential uses the [Authorization Code Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow).
     * On Node.js, it will open a browser window while it listens for a redirect response from the authentication service.
     * On browsers, it authenticates via popups. The `loginStyle` optional parameter can be set to `redirect` to authenticate by redirecting the user to an Azure secure login page, which then will redirect the user back to the web application where the authentication started.
     *
     * It's recommended that the Microsoft Entra Applications used are configured to authenticate using Single Page Applications.
     * More information here: [link](https://learn.microsoft.com/en-us/azure/active-directory/develop/scenario-spa-app-registration#redirect-uri-msaljs-20-with-auth-code-flow).
     *
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(options) {
        if (!options?.clientId) {
            const error = new Error("The parameter `clientId` cannot be left undefined for the `InteractiveBrowserCredential`");
            logger.info(formatError("", error));
            throw error;
        }
        this.tenantId = options?.tenantId;
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        const browserOptions = options;
        const loginStyle = browserOptions.loginStyle || "popup";
        const loginStyles = ["redirect", "popup"];
        if (loginStyles.indexOf(loginStyle) === -1) {
            const error = new Error(`Invalid loginStyle: ${browserOptions.loginStyle}. Should be any of the following: ${loginStyles.join(", ")}.`);
            logger.info(formatError("", error));
            throw error;
        }
        const msalOptions = {
            ...options,
            tokenCredentialOptions: options,
            logger,
            loginStyle: loginStyle,
            redirectUri: typeof options.redirectUri === "function" ? options.redirectUri() : options.redirectUri,
        };
        this.msalClient = createMsalBrowserClient(msalOptions);
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
            const tenantId = processMultiTenantRequest(this.tenantId, newOptions, this.additionallyAllowedTenantIds);
            newOptions.tenantId = tenantId;
            const arrayScopes = ensureScopes(scopes);
            return this.msalClient.getToken(arrayScopes, {
                ...newOptions,
                disableAutomaticAuthentication: this.disableAutomaticAuthentication,
            });
        });
    }
    /**
     * Authenticates with Microsoft Entra ID and returns an access token if successful.
     * If authentication fails, a {@link CredentialUnavailableError} will be thrown with the details of the failure.
     *
     * If the token can't be retrieved silently, this method will require user interaction to retrieve the token.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                  TokenCredential implementation might make.
     */
    async authenticate(scopes, options = {}) {
        return tracingClient.withSpan(`${this.constructor.name}.authenticate`, options, async (newOptions) => {
            const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
            await this.msalClient.getToken(arrayScopes, newOptions);
            return this.msalClient.getActiveAccount();
        });
    }
}
//# sourceMappingURL=interactiveBrowserCredential-browser.mjs.map