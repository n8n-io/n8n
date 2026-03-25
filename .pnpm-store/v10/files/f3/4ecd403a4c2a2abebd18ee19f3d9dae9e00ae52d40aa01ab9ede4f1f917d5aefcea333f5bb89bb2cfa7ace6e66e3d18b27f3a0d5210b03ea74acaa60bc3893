// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { credentialLogger, formatError } from "../util/logging.js";
import { processMultiTenantRequest, resolveAdditionallyAllowedTenantIds, } from "../util/tenantIdUtils.js";
import { CredentialUnavailableError } from "../errors.js";
import { checkTenantId } from "../util/tenantIdUtils.js";
import { createMsalClient } from "../msal/nodeFlows/msalClient.js";
import { ensureScopes } from "../util/scopeUtils.js";
import { hasVSCodePlugin, vsCodeAuthRecordPath } from "../msal/nodeFlows/msalPlugins.js";
import { deserializeAuthenticationRecord } from "../msal/utils.js";
import { readFile } from "node:fs/promises";
const CommonTenantId = "common";
const VSCodeClientId = "aebc6443-996d-45c2-90f0-388ff96faa56";
const logger = credentialLogger("VisualStudioCodeCredential");
// Map of unsupported Tenant IDs and the errors we will be throwing.
const unsupportedTenantIds = {
    adfs: "The VisualStudioCodeCredential does not support authentication with ADFS tenants.",
};
function checkUnsupportedTenant(tenantId) {
    // If the Tenant ID isn't supported, we throw.
    const unsupportedTenantError = unsupportedTenantIds[tenantId];
    if (unsupportedTenantError) {
        throw new CredentialUnavailableError(unsupportedTenantError);
    }
}
/**
 * Connects to Azure using the user account signed in through the Azure Resources extension in Visual Studio Code.
 * Once the user has logged in via the extension, this credential can share the same refresh token
 * that is cached by the extension.
 */
export class VisualStudioCodeCredential {
    tenantId;
    additionallyAllowedTenantIds;
    msalClient;
    options;
    /**
     * Creates an instance of VisualStudioCodeCredential to use for automatically authenticating via VSCode.
     *
     * **Note**: `VisualStudioCodeCredential` is provided by a plugin package:
     * `@azure/identity-vscode`. If this package is not installed, then authentication using
     * `VisualStudioCodeCredential` will not be available.
     *
     * @param options - Options for configuring the client which makes the authentication request.
     */
    constructor(options) {
        this.options = options || {};
        if (options && options.tenantId) {
            checkTenantId(logger, options.tenantId);
            this.tenantId = options.tenantId;
        }
        else {
            this.tenantId = CommonTenantId;
        }
        this.additionallyAllowedTenantIds = resolveAdditionallyAllowedTenantIds(options?.additionallyAllowedTenants);
        checkUnsupportedTenant(this.tenantId);
    }
    /**
     * Runs preparations for any further getToken request:
     *   - Validates that the plugin is available.
     *   - Loads the authentication record from VSCode if available.
     *   - Creates the MSAL client with the loaded plugin and authentication record.
     */
    async prepare(scopes) {
        const tenantId = processMultiTenantRequest(this.tenantId, this.options, this.additionallyAllowedTenantIds, logger) || this.tenantId;
        if (!hasVSCodePlugin() || !vsCodeAuthRecordPath) {
            throw new CredentialUnavailableError("Visual Studio Code Authentication is not available." +
                " Ensure you have have Azure Resources Extension installed in VS Code," +
                " signed into Azure via VS Code, installed the @azure/identity-vscode package," +
                " and properly configured the extension.");
        }
        // Load the authentication record directly from the path
        const authenticationRecord = await this.loadAuthRecord(vsCodeAuthRecordPath, scopes);
        this.msalClient = createMsalClient(VSCodeClientId, tenantId, {
            ...this.options,
            isVSCodeCredential: true,
            brokerOptions: {
                enabled: true,
                parentWindowHandle: new Uint8Array(0),
                useDefaultBrokerAccount: true,
            },
            authenticationRecord,
        });
    }
    /**
     * The promise of the single preparation that will be executed at the first getToken request for an instance of this class.
     */
    preparePromise;
    /**
     * Runs preparations for any further getToken, but only once.
     */
    prepareOnce(scopes) {
        if (!this.preparePromise) {
            this.preparePromise = this.prepare(scopes);
        }
        return this.preparePromise;
    }
    /**
     * Returns the token found by searching VSCode's authentication cache or
     * returns null if no token could be found.
     *
     * @param scopes - The list of scopes for which the token will have access.
     * @param options - The options used to configure any requests this
     *                `TokenCredential` implementation might make.
     */
    async getToken(scopes, options) {
        // Load the plugin and authentication record only once
        const scopeArray = ensureScopes(scopes);
        await this.prepareOnce(scopeArray);
        if (!this.msalClient) {
            throw new CredentialUnavailableError("Visual Studio Code Authentication failed to initialize." +
                " Ensure you have have Azure Resources Extension installed in VS Code," +
                " signed into Azure via VS Code, installed the @azure/identity-vscode package," +
                " and properly configured the extension.");
        }
        // Disable automatic authentication to ensure that the user is not prompted interactively if no token is available
        return this.msalClient.getTokenByInteractiveRequest(scopeArray, {
            ...options,
            disableAutomaticAuthentication: true,
        });
    }
    /**
     * Loads the authentication record from the specified path.
     * @param authRecordPath - The path to the authentication record file.
     * @param scopes - The list of scopes for which the token will have access.
     * @returns The authentication record or undefined if loading fails.
     */
    async loadAuthRecord(authRecordPath, scopes) {
        try {
            const authRecordContent = await readFile(authRecordPath, { encoding: "utf8" });
            return deserializeAuthenticationRecord(authRecordContent);
        }
        catch (error) {
            logger.getToken.info(formatError(scopes, error));
            throw new CredentialUnavailableError("Cannot load authentication record in Visual Studio Code." +
                " Ensure you have have Azure Resources Extension installed in VS Code," +
                " signed into Azure via VS Code, installed the @azure/identity-vscode package," +
                " and properly configured the extension.");
        }
    }
}
//# sourceMappingURL=visualStudioCodeCredential.js.map