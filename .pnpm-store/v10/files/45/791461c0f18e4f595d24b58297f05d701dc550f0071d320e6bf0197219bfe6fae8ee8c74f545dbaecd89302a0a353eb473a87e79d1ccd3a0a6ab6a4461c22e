import { AuthBridge } from "./AuthBridge.js";
import { AuthResult } from "./AuthResult.js";
import { BridgeCapabilities } from "./BridgeCapabilities.js";
import { AccountContext } from "./BridgeAccountContext.js";
import { BridgeRequest } from "./BridgeRequest.js";
import { IBridgeProxy } from "./IBridgeProxy.js";
import { InitContext } from "./InitContext.js";
import { TokenRequest } from "./TokenRequest.js";
declare global {
    interface Window {
        nestedAppAuthBridge: AuthBridge;
    }
}
/**
 * BridgeProxy
 * Provides a proxy for accessing a bridge to a host app and/or
 * platform broker
 */
export declare class BridgeProxy implements IBridgeProxy {
    static bridgeRequests: BridgeRequest[];
    sdkName: string;
    sdkVersion: string;
    capabilities?: BridgeCapabilities;
    accountContext?: AccountContext;
    /**
     * initializeNestedAppAuthBridge - Initializes the bridge to the host app
     * @returns a promise that resolves to an InitializeBridgeResponse or rejects with an Error
     * @remarks This method will be called by the create factory method
     * @remarks If the bridge is not available, this method will throw an error
     */
    protected static initializeNestedAppAuthBridge(): Promise<InitContext>;
    /**
     * getTokenInteractive - Attempts to get a token interactively from the bridge
     * @param request A token request
     * @returns a promise that resolves to an auth result or rejects with a BridgeError
     */
    getTokenInteractive(request: TokenRequest): Promise<AuthResult>;
    /**
     * getTokenSilent Attempts to get a token silently from the bridge
     * @param request A token request
     * @returns a promise that resolves to an auth result or rejects with a BridgeError
     */
    getTokenSilent(request: TokenRequest): Promise<AuthResult>;
    private getToken;
    getHostCapabilities(): BridgeCapabilities | null;
    getAccountContext(): AccountContext | null;
    private static buildRequest;
    /**
     * A method used to send a request to the bridge
     * @param request A token request
     * @returns a promise that resolves to a response of provided type or rejects with a BridgeError
     */
    private sendRequest;
    private static validateBridgeResultOrThrow;
    /**
     * Private constructor for BridgeProxy
     * @param sdkName The name of the SDK being used to make requests on behalf of the app
     * @param sdkVersion The version of the SDK being used to make requests on behalf of the app
     * @param capabilities The capabilities of the bridge / SDK / platform broker
     */
    private constructor();
    /**
     * Factory method for creating an implementation of IBridgeProxy
     * @returns A promise that resolves to a BridgeProxy implementation
     */
    static create(): Promise<IBridgeProxy>;
}
export default BridgeProxy;
//# sourceMappingURL=BridgeProxy.d.ts.map