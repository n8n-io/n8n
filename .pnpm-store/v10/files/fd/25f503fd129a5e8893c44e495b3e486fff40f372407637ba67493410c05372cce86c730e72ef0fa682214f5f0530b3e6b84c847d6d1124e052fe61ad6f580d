import { Logger, IPerformanceClient } from "@azure/msal-common/browser";
import { PlatformAuthRequest } from "./PlatformAuthRequest.js";
import { PlatformAuthResponse } from "./PlatformAuthResponse.js";
import { IPlatformAuthHandler } from "./IPlatformAuthHandler.js";
export declare class PlatformAuthDOMHandler implements IPlatformAuthHandler {
    protected logger: Logger;
    protected performanceClient: IPerformanceClient;
    protected correlationId: string;
    platformAuthType: string;
    constructor(logger: Logger, performanceClient: IPerformanceClient, correlationId: string);
    static createProvider(logger: Logger, performanceClient: IPerformanceClient, correlationId: string): Promise<PlatformAuthDOMHandler | undefined>;
    /**
     * Returns the Id for the broker extension this handler is communicating with
     * @returns
     */
    getExtensionId(): string;
    getExtensionVersion(): string | undefined;
    getExtensionName(): string | undefined;
    /**
     * Send token request to platform broker via browser DOM API
     * @param request
     * @returns
     */
    sendMessage(request: PlatformAuthRequest): Promise<PlatformAuthResponse>;
    private initializePlatformDOMRequest;
    private validatePlatformBrokerResponse;
    private convertToPlatformBrokerResponse;
    private getDOMExtraParams;
}
//# sourceMappingURL=PlatformAuthDOMHandler.d.ts.map