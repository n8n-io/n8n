/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BridgeStatusCode } from './BridgeStatusCode.mjs';
import { createNewGuid } from '../crypto/BrowserCrypto.mjs';
import { BrowserConstants } from '../utils/BrowserConstants.mjs';
import { version } from '../packageMetadata.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * BridgeProxy
 * Provides a proxy for accessing a bridge to a host app and/or
 * platform broker
 */
class BridgeProxy {
    /**
     * initializeNestedAppAuthBridge - Initializes the bridge to the host app
     * @returns a promise that resolves to an InitializeBridgeResponse or rejects with an Error
     * @remarks This method will be called by the create factory method
     * @remarks If the bridge is not available, this method will throw an error
     */
    static async initializeNestedAppAuthBridge() {
        if (window === undefined) {
            throw new Error("window is undefined");
        }
        if (window.nestedAppAuthBridge === undefined) {
            throw new Error("window.nestedAppAuthBridge is undefined");
        }
        try {
            window.nestedAppAuthBridge.addEventListener("message", (response) => {
                const responsePayload = typeof response === "string" ? response : response.data;
                const responseEnvelope = JSON.parse(responsePayload);
                const request = BridgeProxy.bridgeRequests.find((element) => element.requestId === responseEnvelope.requestId);
                if (request !== undefined) {
                    BridgeProxy.bridgeRequests.splice(BridgeProxy.bridgeRequests.indexOf(request), 1);
                    if (responseEnvelope.success) {
                        request.resolve(responseEnvelope);
                    }
                    else {
                        request.reject(responseEnvelope.error);
                    }
                }
            });
            const bridgeResponse = await new Promise((resolve, reject) => {
                const message = BridgeProxy.buildRequest("GetInitContext");
                const request = {
                    requestId: message.requestId,
                    method: message.method,
                    resolve: resolve,
                    reject: reject,
                };
                BridgeProxy.bridgeRequests.push(request);
                window.nestedAppAuthBridge.postMessage(JSON.stringify(message));
            });
            return BridgeProxy.validateBridgeResultOrThrow(bridgeResponse.initContext);
        }
        catch (error) {
            window.console.log(error);
            throw error;
        }
    }
    /**
     * getTokenInteractive - Attempts to get a token interactively from the bridge
     * @param request A token request
     * @returns a promise that resolves to an auth result or rejects with a BridgeError
     */
    getTokenInteractive(request) {
        return this.getToken("GetTokenPopup", request);
    }
    /**
     * getTokenSilent Attempts to get a token silently from the bridge
     * @param request A token request
     * @returns a promise that resolves to an auth result or rejects with a BridgeError
     */
    getTokenSilent(request) {
        return this.getToken("GetToken", request);
    }
    async getToken(requestType, request) {
        const result = await this.sendRequest(requestType, {
            tokenParams: request,
        });
        return {
            token: BridgeProxy.validateBridgeResultOrThrow(result.token),
            account: BridgeProxy.validateBridgeResultOrThrow(result.account),
        };
    }
    getHostCapabilities() {
        return this.capabilities ?? null;
    }
    getAccountContext() {
        return this.accountContext ? this.accountContext : null;
    }
    static buildRequest(method, requestParams) {
        return {
            messageType: "NestedAppAuthRequest",
            method: method,
            requestId: createNewGuid(),
            sendTime: Date.now(),
            clientLibrary: BrowserConstants.MSAL_SKU,
            clientLibraryVersion: version,
            ...requestParams,
        };
    }
    /**
     * A method used to send a request to the bridge
     * @param request A token request
     * @returns a promise that resolves to a response of provided type or rejects with a BridgeError
     */
    sendRequest(method, requestParams) {
        const message = BridgeProxy.buildRequest(method, requestParams);
        const promise = new Promise((resolve, reject) => {
            const request = {
                requestId: message.requestId,
                method: message.method,
                resolve: resolve,
                reject: reject,
            };
            BridgeProxy.bridgeRequests.push(request);
            window.nestedAppAuthBridge.postMessage(JSON.stringify(message));
        });
        return promise;
    }
    static validateBridgeResultOrThrow(input) {
        if (input === undefined) {
            const bridgeError = {
                status: BridgeStatusCode.NestedAppAuthUnavailable,
            };
            throw bridgeError;
        }
        return input;
    }
    /**
     * Private constructor for BridgeProxy
     * @param sdkName The name of the SDK being used to make requests on behalf of the app
     * @param sdkVersion The version of the SDK being used to make requests on behalf of the app
     * @param capabilities The capabilities of the bridge / SDK / platform broker
     */
    constructor(sdkName, sdkVersion, accountContext, capabilities) {
        this.sdkName = sdkName;
        this.sdkVersion = sdkVersion;
        this.accountContext = accountContext;
        this.capabilities = capabilities;
    }
    /**
     * Factory method for creating an implementation of IBridgeProxy
     * @returns A promise that resolves to a BridgeProxy implementation
     */
    static async create() {
        const response = await BridgeProxy.initializeNestedAppAuthBridge();
        return new BridgeProxy(response.sdkName, response.sdkVersion, response.accountContext, response.capabilities);
    }
}
BridgeProxy.bridgeRequests = [];

export { BridgeProxy, BridgeProxy as default };
//# sourceMappingURL=BridgeProxy.mjs.map
