import { Logger, IPerformanceClient } from "@azure/msal-common/browser";
import { PlatformAuthRequest } from "./PlatformAuthRequest.js";
import { PlatformAuthResponse } from "./PlatformAuthResponse.js";
import { IPlatformAuthHandler } from "./IPlatformAuthHandler.js";
export declare class PlatformAuthExtensionHandler implements IPlatformAuthHandler {
    private extensionId;
    private extensionVersion;
    private logger;
    private readonly handshakeTimeoutMs;
    private timeoutId;
    private resolvers;
    private handshakeResolvers;
    private messageChannel;
    private readonly windowListener;
    private readonly performanceClient;
    private readonly handshakeEvent;
    platformAuthType: string;
    constructor(logger: Logger, handshakeTimeoutMs: number, performanceClient: IPerformanceClient, extensionId?: string);
    /**
     * Sends a given message to the extension and resolves with the extension response
     * @param request
     */
    sendMessage(request: PlatformAuthRequest): Promise<PlatformAuthResponse>;
    /**
     * Returns an instance of the MessageHandler that has successfully established a connection with an extension
     * @param {Logger} logger
     * @param {number} handshakeTimeoutMs
     * @param {IPerformanceClient} performanceClient
     * @param {ICrypto} crypto
     */
    static createProvider(logger: Logger, handshakeTimeoutMs: number, performanceClient: IPerformanceClient): Promise<PlatformAuthExtensionHandler>;
    /**
     * Send handshake request helper.
     */
    private sendHandshakeRequest;
    /**
     * Invoked when a message is posted to the window. If a handshake request is received it means the extension is not installed.
     * @param event
     */
    private onWindowMessage;
    /**
     * Invoked when a message is received from the extension on the MessageChannel port
     * @param event
     */
    private onChannelMessage;
    /**
     * Validates native platform response before processing
     * @param response
     */
    private validatePlatformBrokerResponse;
    /**
     * Returns the Id for the browser extension this handler is communicating with
     * @returns
     */
    getExtensionId(): string | undefined;
    /**
     * Returns the version for the browser extension this handler is communicating with
     * @returns
     */
    getExtensionVersion(): string | undefined;
    getExtensionName(): string | undefined;
}
//# sourceMappingURL=PlatformAuthExtensionHandler.d.ts.map