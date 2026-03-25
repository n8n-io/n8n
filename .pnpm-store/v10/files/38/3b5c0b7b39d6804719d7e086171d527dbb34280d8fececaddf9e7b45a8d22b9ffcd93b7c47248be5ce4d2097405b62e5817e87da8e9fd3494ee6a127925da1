import { AuthenticationResult, BaseClient, ClientConfiguration, CommonDeviceCodeRequest } from "@azure/msal-common/node";
/**
 * OAuth2.0 Device code client
 * @public
 */
export declare class DeviceCodeClient extends BaseClient {
    constructor(configuration: ClientConfiguration);
    /**
     * Gets device code from device code endpoint, calls back to with device code response, and
     * polls token endpoint to exchange device code for tokens
     * @param request - developer provided CommonDeviceCodeRequest
     */
    acquireToken(request: CommonDeviceCodeRequest): Promise<AuthenticationResult | null>;
    /**
     * Creates device code request and executes http GET
     * @param request - developer provided CommonDeviceCodeRequest
     */
    private getDeviceCode;
    /**
     * Creates query string for the device code request
     * @param request - developer provided CommonDeviceCodeRequest
     */
    createExtraQueryParameters(request: CommonDeviceCodeRequest): string;
    /**
     * Executes POST request to device code endpoint
     * @param deviceCodeEndpoint - token endpoint
     * @param queryString - string to be used in the body of the request
     * @param headers - headers for the request
     * @param thumbprint - unique request thumbprint
     * @param correlationId - correlation id to be used in the request
     */
    private executePostRequestToDeviceCodeEndpoint;
    /**
     * Create device code endpoint query parameters and returns string
     * @param request - developer provided CommonDeviceCodeRequest
     */
    private createQueryString;
    /**
     * Breaks the polling with specific conditions
     * @param deviceCodeExpirationTime - expiration time for the device code request
     * @param userSpecifiedTimeout - developer provided timeout, to be compared against deviceCodeExpirationTime
     * @param userSpecifiedCancelFlag - boolean indicating the developer would like to cancel the request
     */
    private continuePolling;
    /**
     * Creates token request with device code response and polls token endpoint at interval set by the device code response
     * @param request - developer provided CommonDeviceCodeRequest
     * @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
     */
    private acquireTokenWithDeviceCode;
    /**
     * Creates query parameters and converts to string.
     * @param request - developer provided CommonDeviceCodeRequest
     * @param deviceCodeResponse - DeviceCodeResponse returned by the security token service device code endpoint
     */
    private createTokenRequestBody;
}
//# sourceMappingURL=DeviceCodeClient.d.ts.map