"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationCodeCredential = void 0;
const tenantIdUtils_js_1 = require("../util/tenantIdUtils.js");
const tenantIdUtils_js_2 = require("../util/tenantIdUtils.js");
const logging_js_1 = require("../util/logging.js");
const scopeUtils_js_1 = require("../util/scopeUtils.js");
const tracing_js_1 = require("../util/tracing.js");
const msalClient_js_1 = require("../msal/nodeFlows/msalClient.js");
const logger = (0, logging_js_1.credentialLogger)("AuthorizationCodeCredential");
/**
 * Enables authentication to Microsoft Entra ID using an authorization code
 * that was obtained through the authorization code flow, described in more detail
 * in the Microsoft Entra ID documentation:
 *
 * https://learn.microsoft.com/entra/identity-platform/v2-oauth2-auth-code-flow
 */
class AuthorizationCodeCredential {
    msalClient;
    disableAutomaticAuthentication;
    authorizationCode;
    redirectUri;
    tenantId;
    additionallyAllowedTenantIds;
    clientSecret;
    /**
     * @hidden
     * @internal
     */
    constructor(tenantId, clientId, clientSecretOrAuthorizationCode, authorizationCodeOrRedirectUri, redirectUriOrOptions, options) {
        (0, tenantIdUtils_js_2.checkTenantId)(logger, tenantId);
        this.clientSecret = clientSecretOrAuthorizationCode;
        if (typeof redirectUriOrOptions === "string") {
            // the clientId+clientSecret constructor
            this.authorizationCode = authorizationCodeOrRedirectUri;
            this.redirectUri = redirectUriOrOptions;
            // in this case, options are good as they come
        }
        else {
            // clientId only
            this.authorizationCode = clientSecretOrAuthorizationCode;
            this.redirectUri = authorizationCodeOrRedirectUri;
            this.clientSecret = undefined;
            options = redirectUriOrOptions;
        }
        // TODO: Validate tenant if provided
        this.tenantId = tenantId;
        this.additionallyAllowedTenantIds = (0, tenantIdUtils_js_1.resolveAdditionallyAllowedTenantIds)(options?.additionallyAllowedTenants);
        this.msalClient = (0, msalClient_js_1.createMsalClient)(clientId, tenantId, {
            ...options,
            logger,
            tokenCredentialOptions: options ?? {},
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
            const tenantId = (0, tenantIdUtils_js_1.processMultiTenantRequest)(this.tenantId, newOptions, this.additionallyAllowedTenantIds);
            newOptions.tenantId = tenantId;
            const arrayScopes = (0, scopeUtils_js_1.ensureScopes)(scopes);
            return this.msalClient.getTokenByAuthorizationCode(arrayScopes, this.redirectUri, this.authorizationCode, this.clientSecret, {
                ...newOptions,
                disableAutomaticAuthentication: this.disableAutomaticAuthentication,
            });
        });
    }
}
exports.AuthorizationCodeCredential = AuthorizationCodeCredential;
//# sourceMappingURL=authorizationCodeCredential.js.map