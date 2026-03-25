/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { NativeExtensionMethod } from "../../utils/BrowserConstants.js";
import { StoreInCache, StringDict } from "@azure/msal-common/browser";

/**
 * Token request which native broker will use to acquire tokens
 */
export type PlatformAuthRequest = {
    accountId: string; // WAM specific account id used for identification of WAM account. This can be any broker-id eventually
    clientId: string;
    authority: string;
    redirectUri: string;
    scope: string;
    correlationId: string;
    windowTitleSubstring: string; // The name of the document title. This helps the native prompt properly "parent" to the window making the request
    prompt?: string;
    nonce?: string;
    claims?: string;
    state?: string;
    reqCnf?: string;
    keyId?: string;
    tokenType?: string;
    shrClaims?: string;
    shrNonce?: string;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    extendedExpiryToken?: boolean;
    extraParameters?: StringDict;
    storeInCache?: StoreInCache; // Object of booleans indicating whether to store tokens in the cache or not (default is true)
    signPopToken?: boolean; // Set to true only if token request deos not contain a PoP keyId
    embeddedClientId?: string;
};

/**
 * Request which will be forwarded to native broker by the browser extension
 */
export type NativeExtensionRequestBody = {
    method: NativeExtensionMethod;
    request?: PlatformAuthRequest;
};

/**
 * Browser extension request
 */
export type NativeExtensionRequest = {
    channel: string;
    responseId: string;
    extensionId?: string;
    body: NativeExtensionRequestBody;
};

export type PlatformDOMTokenRequest = {
    brokerId: string;
    accountId?: string;
    clientId: string;
    authority: string;
    scope: string;
    redirectUri: string;
    correlationId: string;
    isSecurityTokenService: boolean;
    state?: string;
    /*
     * Known optional parameters will go into extraQueryParameters.
     * List of known parameters is:
     * "prompt", "nonce", "claims", "loginHint", "instanceAware", "windowTitleSubstring", "extendedExpiryToken", "storeInCache",
     * ProofOfPossessionParams: "reqCnf", "keyId", "tokenType", "shrClaims", "shrNonce", "resourceRequestMethod", "resourceRequestUri", "signPopToken"
     */
    extraParameters?: DOMExtraParameters;
    embeddedClientId?: string;
    storeInCache?: StoreInCache; // Object of booleans indicating whether to store tokens in the cache or not (default is true)
};

export type DOMExtraParameters = StringDict & {
    prompt?: string;
    nonce?: string;
    claims?: string;
    loginHint?: string;
    instanceAware?: string;
    windowTitleSubstring?: string;
    extendedExpiryToken?: string;
    reqCnf?: string;
    keyId?: string;
    tokenType?: string;
    shrClaims?: string;
    shrNonce?: string;
    resourceRequestMethod?: string;
    resourceRequestUri?: string;
    signPopToken?: string; // Set to true only if token request deos not contain a PoP keyId
};
