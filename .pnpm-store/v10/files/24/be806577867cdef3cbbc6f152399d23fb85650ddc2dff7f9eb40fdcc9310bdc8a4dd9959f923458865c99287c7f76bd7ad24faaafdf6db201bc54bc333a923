/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { PlatformAuthConstants, NativeExtensionMethod } from '../../utils/BrowserConstants.mjs';
import { PerformanceEvents, createAuthError, AuthErrorCodes } from '@azure/msal-common/browser';
import { createNativeAuthError } from '../../error/NativeAuthError.mjs';
import { createBrowserAuthError } from '../../error/BrowserAuthError.mjs';
import { createNewGuid } from '../../crypto/BrowserCrypto.mjs';
import { nativeHandshakeTimeout, nativeExtensionNotInstalled } from '../../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class PlatformAuthExtensionHandler {
    constructor(logger, handshakeTimeoutMs, performanceClient, extensionId) {
        this.logger = logger;
        this.handshakeTimeoutMs = handshakeTimeoutMs;
        this.extensionId = extensionId;
        this.resolvers = new Map(); // Used for non-handshake messages
        this.handshakeResolvers = new Map(); // Used for handshake messages
        this.messageChannel = new MessageChannel();
        this.windowListener = this.onWindowMessage.bind(this); // Window event callback doesn't have access to 'this' unless it's bound
        this.performanceClient = performanceClient;
        this.handshakeEvent = performanceClient.startMeasurement(PerformanceEvents.NativeMessageHandlerHandshake);
        this.platformAuthType =
            PlatformAuthConstants.PLATFORM_EXTENSION_PROVIDER;
    }
    /**
     * Sends a given message to the extension and resolves with the extension response
     * @param request
     */
    async sendMessage(request) {
        this.logger.trace(this.platformAuthType + " - sendMessage called.");
        // fall back to native calls
        const messageBody = {
            method: NativeExtensionMethod.GetToken,
            request: request,
        };
        const req = {
            channel: PlatformAuthConstants.CHANNEL_ID,
            extensionId: this.extensionId,
            responseId: createNewGuid(),
            body: messageBody,
        };
        this.logger.trace(this.platformAuthType + " - Sending request to browser extension");
        this.logger.tracePii(this.platformAuthType +
            ` - Sending request to browser extension: ${JSON.stringify(req)}`);
        this.messageChannel.port1.postMessage(req);
        const response = await new Promise((resolve, reject) => {
            this.resolvers.set(req.responseId, { resolve, reject });
        });
        const validatedResponse = this.validatePlatformBrokerResponse(response);
        return validatedResponse;
    }
    /**
     * Returns an instance of the MessageHandler that has successfully established a connection with an extension
     * @param {Logger} logger
     * @param {number} handshakeTimeoutMs
     * @param {IPerformanceClient} performanceClient
     * @param {ICrypto} crypto
     */
    static async createProvider(logger, handshakeTimeoutMs, performanceClient) {
        logger.trace("PlatformAuthExtensionHandler - createProvider called.");
        try {
            const preferredProvider = new PlatformAuthExtensionHandler(logger, handshakeTimeoutMs, performanceClient, PlatformAuthConstants.PREFERRED_EXTENSION_ID);
            await preferredProvider.sendHandshakeRequest();
            return preferredProvider;
        }
        catch (e) {
            // If preferred extension fails for whatever reason, fallback to using any installed extension
            const backupProvider = new PlatformAuthExtensionHandler(logger, handshakeTimeoutMs, performanceClient);
            await backupProvider.sendHandshakeRequest();
            return backupProvider;
        }
    }
    /**
     * Send handshake request helper.
     */
    async sendHandshakeRequest() {
        this.logger.trace(this.platformAuthType + " - sendHandshakeRequest called.");
        // Register this event listener before sending handshake
        window.addEventListener("message", this.windowListener, false); // false is important, because content script message processing should work first
        const req = {
            channel: PlatformAuthConstants.CHANNEL_ID,
            extensionId: this.extensionId,
            responseId: createNewGuid(),
            body: {
                method: NativeExtensionMethod.HandshakeRequest,
            },
        };
        this.handshakeEvent.add({
            extensionId: this.extensionId,
            extensionHandshakeTimeoutMs: this.handshakeTimeoutMs,
        });
        this.messageChannel.port1.onmessage = (event) => {
            this.onChannelMessage(event);
        };
        window.postMessage(req, window.origin, [this.messageChannel.port2]);
        return new Promise((resolve, reject) => {
            this.handshakeResolvers.set(req.responseId, { resolve, reject });
            this.timeoutId = window.setTimeout(() => {
                /*
                 * Throw an error if neither HandshakeResponse nor original Handshake request are received in a reasonable timeframe.
                 * This typically suggests an event handler stopped propagation of the Handshake request but did not respond to it on the MessageChannel port
                 */
                window.removeEventListener("message", this.windowListener, false);
                this.messageChannel.port1.close();
                this.messageChannel.port2.close();
                this.handshakeEvent.end({
                    extensionHandshakeTimedOut: true,
                    success: false,
                });
                reject(createBrowserAuthError(nativeHandshakeTimeout));
                this.handshakeResolvers.delete(req.responseId);
            }, this.handshakeTimeoutMs); // Use a reasonable timeout in milliseconds here
        });
    }
    /**
     * Invoked when a message is posted to the window. If a handshake request is received it means the extension is not installed.
     * @param event
     */
    onWindowMessage(event) {
        this.logger.trace(this.platformAuthType + " - onWindowMessage called");
        // We only accept messages from ourselves
        if (event.source !== window) {
            return;
        }
        const request = event.data;
        if (!request.channel ||
            request.channel !== PlatformAuthConstants.CHANNEL_ID) {
            return;
        }
        if (request.extensionId && request.extensionId !== this.extensionId) {
            return;
        }
        if (request.body.method === NativeExtensionMethod.HandshakeRequest) {
            const handshakeResolver = this.handshakeResolvers.get(request.responseId);
            /*
             * Filter out responses with no matched resolvers sooner to keep channel ports open while waiting for
             * the proper response.
             */
            if (!handshakeResolver) {
                this.logger.trace(this.platformAuthType +
                    `.onWindowMessage - resolver can't be found for request ${request.responseId}`);
                return;
            }
            // If we receive this message back it means no extension intercepted the request, meaning no extension supporting handshake protocol is installed
            this.logger.verbose(request.extensionId
                ? `Extension with id: ${request.extensionId} not installed`
                : "No extension installed");
            clearTimeout(this.timeoutId);
            this.messageChannel.port1.close();
            this.messageChannel.port2.close();
            window.removeEventListener("message", this.windowListener, false);
            this.handshakeEvent.end({
                success: false,
                extensionInstalled: false,
            });
            handshakeResolver.reject(createBrowserAuthError(nativeExtensionNotInstalled));
        }
    }
    /**
     * Invoked when a message is received from the extension on the MessageChannel port
     * @param event
     */
    onChannelMessage(event) {
        this.logger.trace(this.platformAuthType + " - onChannelMessage called.");
        const request = event.data;
        const resolver = this.resolvers.get(request.responseId);
        const handshakeResolver = this.handshakeResolvers.get(request.responseId);
        try {
            const method = request.body.method;
            if (method === NativeExtensionMethod.Response) {
                if (!resolver) {
                    return;
                }
                const response = request.body.response;
                this.logger.trace(this.platformAuthType +
                    " - Received response from browser extension");
                this.logger.tracePii(this.platformAuthType +
                    ` - Received response from browser extension: ${JSON.stringify(response)}`);
                if (response.status !== "Success") {
                    resolver.reject(createNativeAuthError(response.code, response.description, response.ext));
                }
                else if (response.result) {
                    if (response.result["code"] &&
                        response.result["description"]) {
                        resolver.reject(createNativeAuthError(response.result["code"], response.result["description"], response.result["ext"]));
                    }
                    else {
                        resolver.resolve(response.result);
                    }
                }
                else {
                    throw createAuthError(AuthErrorCodes.unexpectedError, "Event does not contain result.");
                }
                this.resolvers.delete(request.responseId);
            }
            else if (method === NativeExtensionMethod.HandshakeResponse) {
                if (!handshakeResolver) {
                    this.logger.trace(this.platformAuthType +
                        `.onChannelMessage - resolver can't be found for request ${request.responseId}`);
                    return;
                }
                clearTimeout(this.timeoutId); // Clear setTimeout
                window.removeEventListener("message", this.windowListener, false); // Remove 'No extension' listener
                this.extensionId = request.extensionId;
                this.extensionVersion = request.body.version;
                this.logger.verbose(this.platformAuthType +
                    ` - Received HandshakeResponse from extension: ${this.extensionId}`);
                this.handshakeEvent.end({
                    extensionInstalled: true,
                    success: true,
                });
                handshakeResolver.resolve();
                this.handshakeResolvers.delete(request.responseId);
            }
            // Do nothing if method is not Response or HandshakeResponse
        }
        catch (err) {
            this.logger.error("Error parsing response from WAM Extension");
            this.logger.errorPii(`Error parsing response from WAM Extension: ${err}`);
            this.logger.errorPii(`Unable to parse ${event}`);
            if (resolver) {
                resolver.reject(err);
            }
            else if (handshakeResolver) {
                handshakeResolver.reject(err);
            }
        }
    }
    /**
     * Validates native platform response before processing
     * @param response
     */
    validatePlatformBrokerResponse(response) {
        if (response.hasOwnProperty("access_token") &&
            response.hasOwnProperty("id_token") &&
            response.hasOwnProperty("client_info") &&
            response.hasOwnProperty("account") &&
            response.hasOwnProperty("scope") &&
            response.hasOwnProperty("expires_in")) {
            return response;
        }
        else {
            throw createAuthError(AuthErrorCodes.unexpectedError, "Response missing expected properties.");
        }
    }
    /**
     * Returns the Id for the browser extension this handler is communicating with
     * @returns
     */
    getExtensionId() {
        return this.extensionId;
    }
    /**
     * Returns the version for the browser extension this handler is communicating with
     * @returns
     */
    getExtensionVersion() {
        return this.extensionVersion;
    }
    getExtensionName() {
        return this.getExtensionId() ===
            PlatformAuthConstants.PREFERRED_EXTENSION_ID
            ? "chrome"
            : this.getExtensionId()?.length
                ? "unknown"
                : undefined;
    }
}

export { PlatformAuthExtensionHandler };
//# sourceMappingURL=PlatformAuthExtensionHandler.mjs.map
