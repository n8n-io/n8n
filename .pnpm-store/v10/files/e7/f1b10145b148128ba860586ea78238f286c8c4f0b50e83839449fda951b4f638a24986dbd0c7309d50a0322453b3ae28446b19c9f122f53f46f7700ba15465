// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as msalBrowser from "@azure/msal-browser";
import { defaultLoggerCallback, ensureValidMsalToken, getAuthority, getKnownAuthorities, getMSALLogLevel, handleMsalError, msalToPublic, publicToMsal, } from "../utils.js";
import { AuthenticationRequiredError, CredentialUnavailableError } from "../../errors.js";
import { getLogLevel } from "@azure/logger";
import { formatSuccess } from "../../util/logging.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, resolveTenantId, } from "../../util/tenantIdUtils.js";
import { DefaultTenantId } from "../../constants.js";
// We keep a copy of the redirect hash.
// Check if self and location object is defined.
const isLocationDefined = typeof self !== "undefined" && self.location !== undefined;
/**
 * Generates a MSAL configuration that generally works for browsers
 */
function generateMsalBrowserConfiguration(options) {
    const tenantId = options.tenantId || DefaultTenantId;
    const authority = getAuthority(tenantId, options.authorityHost);
    return {
        auth: {
            clientId: options.clientId,
            authority,
            knownAuthorities: getKnownAuthorities(tenantId, authority, options.disableInstanceDiscovery),
            // If the users picked redirect as their login style,
            // but they didn't provide a redirectUri,
            // we can try to use the current page we're in as a default value.
            redirectUri: options.redirectUri || (isLocationDefined ? self.location.origin : undefined),
        },
        cache: {
            cacheLocation: "sessionStorage",
            storeAuthStateInCookie: true, // Set to true to improve the experience on IE11 and Edge.
        },
        system: {
            loggerOptions: {
                loggerCallback: defaultLoggerCallback(options.logger, "Browser"),
                logLevel: getMSALLogLevel(getLogLevel()),
                piiLoggingEnabled: options.loggingOptions?.enableUnsafeSupportLogging,
            },
        },
    };
}
// We keep a copy of the redirect hash.
const redirectHash = isLocationDefined ? self.location.hash : undefined;
/**
 * Uses MSAL Browser 2.X for browser authentication,
 * which uses the [Auth Code Flow](https://learn.microsoft.com/azure/active-directory/develop/v2-oauth2-auth-code-flow).
 * @internal
 */
export function createMsalBrowserClient(options) {
    const loginStyle = options.loginStyle;
    if (!options.clientId) {
        throw new CredentialUnavailableError("A client ID is required in browsers");
    }
    const clientId = options.clientId;
    const logger = options.logger;
    const tenantId = resolveTenantId(logger, options.tenantId, options.clientId);
    const additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.tokenCredentialOptions?.additionallyAllowedTenants);
    const authorityHost = options.authorityHost;
    const msalConfig = generateMsalBrowserConfiguration(options);
    const disableAutomaticAuthentication = options.disableAutomaticAuthentication;
    const loginHint = options.loginHint;
    let account;
    if (options.authenticationRecord) {
        account = {
            ...options.authenticationRecord,
            tenantId,
        };
    }
    // This variable should only be used through calling `getApp` function
    let app;
    /**
     * Return the MSAL account if not set yet
     * @returns MSAL application
     */
    async function getApp() {
        if (!app) {
            // Prepare the MSAL application
            app = await msalBrowser.PublicClientApplication.createPublicClientApplication(msalConfig);
            // setting the account right after the app is created.
            if (account) {
                app.setActiveAccount(publicToMsal(account));
            }
        }
        return app;
    }
    /**
     * Loads the account based on the result of the authentication.
     * If no result was received, tries to load the account from the cache.
     * @param result - Result object received from MSAL.
     */
    async function handleBrowserResult(result) {
        try {
            const msalApp = await getApp();
            if (result && result.account) {
                logger.info(`MSAL Browser V2 authentication successful.`);
                msalApp.setActiveAccount(result.account);
                return msalToPublic(clientId, result.account);
            }
        }
        catch (e) {
            logger.info(`Failed to acquire token through MSAL. ${e.message}`);
        }
        return;
    }
    /**
     * Handles the MSAL authentication result.
     * If the result has an account, we update the local account reference.
     * If the token received is invalid, an error will be thrown depending on what's missing.
     */
    function handleResult(scopes, result, getTokenOptions) {
        if (result?.account) {
            account = msalToPublic(clientId, result.account);
        }
        ensureValidMsalToken(scopes, result, getTokenOptions);
        logger.getToken.info(formatSuccess(scopes));
        return {
            token: result.accessToken,
            expiresOnTimestamp: result.expiresOn.getTime(),
            refreshAfterTimestamp: result.refreshOn?.getTime(),
            tokenType: "Bearer",
        };
    }
    /**
     * Uses MSAL to handle the redirect.
     */
    async function handleRedirect() {
        const msalApp = await getApp();
        return handleBrowserResult((await msalApp.handleRedirectPromise(redirectHash)) || undefined);
    }
    /**
     * Uses MSAL to retrieve the active account.
     */
    async function getActiveAccount() {
        const msalApp = await getApp();
        const activeAccount = msalApp.getActiveAccount();
        if (!activeAccount) {
            return;
        }
        return msalToPublic(clientId, activeAccount);
    }
    /**
     * Uses MSAL to trigger a redirect or a popup login.
     */
    async function login(scopes = []) {
        const arrayScopes = Array.isArray(scopes) ? scopes : [scopes];
        const loginRequest = {
            scopes: arrayScopes,
            loginHint: loginHint,
        };
        const msalApp = await getApp();
        switch (loginStyle) {
            case "redirect": {
                await app.loginRedirect(loginRequest);
                return;
            }
            case "popup":
                return handleBrowserResult(await msalApp.loginPopup(loginRequest));
        }
    }
    /**
     * Tries to retrieve the token silently using MSAL.
     */
    async function getTokenSilent(scopes, getTokenOptions) {
        const activeAccount = await getActiveAccount();
        if (!activeAccount) {
            throw new AuthenticationRequiredError({
                scopes,
                getTokenOptions,
                message: "Silent authentication failed. We couldn't retrieve an active account from the cache.",
            });
        }
        const parameters = {
            authority: getTokenOptions?.authority || msalConfig.auth.authority,
            correlationId: getTokenOptions?.correlationId,
            claims: getTokenOptions?.claims,
            account: publicToMsal(activeAccount),
            forceRefresh: false,
            scopes,
        };
        try {
            logger.info("Attempting to acquire token silently");
            const msalApp = await getApp();
            const response = await msalApp.acquireTokenSilent(parameters);
            return handleResult(scopes, response);
        }
        catch (err) {
            throw handleMsalError(scopes, err, options);
        }
    }
    /**
     * Attempts to retrieve the token in the browser through interactive methods.
     */
    async function getTokenInteractive(scopes, getTokenOptions) {
        const activeAccount = await getActiveAccount();
        if (!activeAccount) {
            throw new AuthenticationRequiredError({
                scopes,
                getTokenOptions,
                message: "Silent authentication failed. We couldn't retrieve an active account from the cache.",
            });
        }
        const parameters = {
            authority: getTokenOptions?.authority || msalConfig.auth.authority,
            correlationId: getTokenOptions?.correlationId,
            claims: getTokenOptions?.claims,
            account: publicToMsal(activeAccount),
            loginHint: loginHint,
            scopes,
        };
        const msalApp = await getApp();
        switch (loginStyle) {
            case "redirect":
                // This will go out of the page.
                // Once the InteractiveBrowserCredential is initialized again,
                // we'll load the MSAL account in the constructor.
                await msalApp.acquireTokenRedirect(parameters);
                return { token: "", expiresOnTimestamp: 0, tokenType: "Bearer" };
            case "popup":
                return handleResult(scopes, await app.acquireTokenPopup(parameters));
        }
    }
    /**
     * Attempts to get token through the silent flow.
     * If failed, get token through interactive method with `doGetToken` method.
     */
    async function getToken(scopes, getTokenOptions = {}) {
        const getTokenTenantId = processMultiTenantRequest(tenantId, getTokenOptions, additionallyAllowedTenantIds) ||
            tenantId;
        if (!getTokenOptions.authority) {
            getTokenOptions.authority = getAuthority(getTokenTenantId, authorityHost);
        }
        // We ensure that redirection is handled at this point.
        await handleRedirect();
        if (!(await getActiveAccount()) && !disableAutomaticAuthentication) {
            await login(scopes);
        }
        // Attempts to get the token silently; else, falls back to interactive method.
        try {
            return await getTokenSilent(scopes, getTokenOptions);
        }
        catch (err) {
            if (err.name !== "AuthenticationRequiredError") {
                throw err;
            }
            if (getTokenOptions?.disableAutomaticAuthentication) {
                throw new AuthenticationRequiredError({
                    scopes,
                    getTokenOptions,
                    message: "Automatic authentication has been disabled. You may call the authenticate() method.",
                });
            }
            logger.info(`Silent authentication failed, falling back to interactive method ${loginStyle}`);
            return getTokenInteractive(scopes, getTokenOptions);
        }
    }
    return {
        getActiveAccount,
        getToken,
    };
}
//# sourceMappingURL=msalBrowserCommon.js.map