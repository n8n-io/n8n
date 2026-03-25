import { ClientConfiguration, CommonClientConfiguration } from "../config/ClientConfiguration.js";
import { INetworkModule, NetworkRequestOptions } from "../network/INetworkModule.js";
import { NetworkResponse } from "../network/NetworkResponse.js";
import { ICrypto } from "../crypto/ICrypto.js";
import { Authority } from "../authority/Authority.js";
import { Logger } from "../logger/Logger.js";
import { ServerAuthorizationTokenResponse } from "../response/ServerAuthorizationTokenResponse.js";
import { CacheManager } from "../cache/CacheManager.js";
import { ServerTelemetryManager } from "../telemetry/server/ServerTelemetryManager.js";
import { RequestThumbprint } from "../network/RequestThumbprint.js";
import { CcsCredential } from "../account/CcsCredential.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
import { BaseAuthRequest } from "../request/BaseAuthRequest.js";
/**
 * Base application class which will construct requests to send to and handle responses from the Microsoft STS using the authorization code flow.
 * @internal
 */
export declare abstract class BaseClient {
    logger: Logger;
    protected config: CommonClientConfiguration;
    protected cryptoUtils: ICrypto;
    protected cacheManager: CacheManager;
    protected networkClient: INetworkModule;
    protected serverTelemetryManager: ServerTelemetryManager | null;
    authority: Authority;
    protected performanceClient?: IPerformanceClient;
    protected constructor(configuration: ClientConfiguration, performanceClient?: IPerformanceClient);
    /**
     * Creates default headers for requests to token endpoint
     */
    protected createTokenRequestHeaders(ccsCred?: CcsCredential): Record<string, string>;
    /**
     * Http post to token endpoint
     * @param tokenEndpoint
     * @param queryString
     * @param headers
     * @param thumbprint
     */
    protected executePostToTokenEndpoint(tokenEndpoint: string, queryString: string, headers: Record<string, string>, thumbprint: RequestThumbprint, correlationId: string, queuedEvent?: string): Promise<NetworkResponse<ServerAuthorizationTokenResponse>>;
    /**
     * Wraps sendPostRequestAsync with necessary preflight and postflight logic
     * @param thumbprint - Request thumbprint for throttling
     * @param tokenEndpoint - Endpoint to make the POST to
     * @param options - Body and Headers to include on the POST request
     * @param correlationId - CorrelationId for telemetry
     */
    sendPostRequest<T extends ServerAuthorizationTokenResponse>(thumbprint: RequestThumbprint, tokenEndpoint: string, options: NetworkRequestOptions, correlationId: string): Promise<NetworkResponse<T>>;
    /**
     * Updates the authority object of the client. Endpoint discovery must be completed.
     * @param updatedAuthority
     */
    updateAuthority(cloudInstanceHostname: string, correlationId: string): Promise<void>;
    /**
     * Creates query string for the /token request
     * @param request
     */
    createTokenQueryParameters(request: BaseAuthRequest): string;
}
//# sourceMappingURL=BaseClient.d.ts.map