import { NativeExtensionMethod } from "../../utils/BrowserConstants.js";
import { StoreInCache, StringDict } from "@azure/msal-common/browser";
/**
 * Token request which native broker will use to acquire tokens
 */
export type PlatformAuthRequest = {
    accountId: string;
    clientId: string;
    authority: string;
    redirectUri: string;
    scope: string;
    correlationId: string;
    windowTitleSubstring: string;
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
    storeInCache?: StoreInCache;
    signPopToken?: boolean;
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
    extraParameters?: DOMExtraParameters;
    embeddedClientId?: string;
    storeInCache?: StoreInCache;
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
    signPopToken?: string;
};
//# sourceMappingURL=PlatformAuthRequest.d.ts.map