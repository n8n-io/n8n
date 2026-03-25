"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TOKEN_CACHE_NAME = exports.CACHE_NON_CAE_SUFFIX = exports.CACHE_CAE_SUFFIX = exports.ALL_TENANTS = exports.DefaultAuthority = exports.DefaultAuthorityHost = exports.AzureAuthorityHosts = exports.DefaultTenantId = exports.DeveloperSignOnClientId = exports.SDK_VERSION = void 0;
/**
 * Current version of the `@azure/identity` package.
 */
exports.SDK_VERSION = `4.13.0`;
/**
 * The default client ID for authentication
 * @internal
 */
// TODO: temporary - this is the Azure CLI clientID - we'll replace it when
// Developer Sign On application is available
// https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/identity/Azure.Identity/src/Constants.cs#L9
exports.DeveloperSignOnClientId = "04b07795-8ddb-461a-bbee-02f9e1bf7b46";
/**
 * The default tenant for authentication
 * @internal
 */
exports.DefaultTenantId = "common";
/**
 * A list of known Azure authority hosts
 */
var AzureAuthorityHosts;
(function (AzureAuthorityHosts) {
    /**
     * China-based Azure Authority Host
     */
    AzureAuthorityHosts["AzureChina"] = "https://login.chinacloudapi.cn";
    /**
     * Germany-based Azure Authority Host
     *
     * @deprecated Microsoft Cloud Germany was closed on October 29th, 2021.
     *
     * */
    AzureAuthorityHosts["AzureGermany"] = "https://login.microsoftonline.de";
    /**
     * US Government Azure Authority Host
     */
    AzureAuthorityHosts["AzureGovernment"] = "https://login.microsoftonline.us";
    /**
     * Public Cloud Azure Authority Host
     */
    AzureAuthorityHosts["AzurePublicCloud"] = "https://login.microsoftonline.com";
})(AzureAuthorityHosts || (exports.AzureAuthorityHosts = AzureAuthorityHosts = {}));
/**
 * @internal
 * The default authority host.
 */
exports.DefaultAuthorityHost = AzureAuthorityHosts.AzurePublicCloud;
/**
 * @internal
 * The default environment host for Azure Public Cloud
 */
exports.DefaultAuthority = "login.microsoftonline.com";
/**
 * @internal
 * Allow acquiring tokens for any tenant for multi-tentant auth.
 */
exports.ALL_TENANTS = ["*"];
/**
 * @internal
 */
exports.CACHE_CAE_SUFFIX = "cae";
/**
 * @internal
 */
exports.CACHE_NON_CAE_SUFFIX = "nocae";
/**
 * @internal
 *
 * The default name for the cache persistence plugin.
 * Matches the constant defined in the cache persistence package.
 */
exports.DEFAULT_TOKEN_CACHE_NAME = "msal.cache";
//# sourceMappingURL=constants.js.map