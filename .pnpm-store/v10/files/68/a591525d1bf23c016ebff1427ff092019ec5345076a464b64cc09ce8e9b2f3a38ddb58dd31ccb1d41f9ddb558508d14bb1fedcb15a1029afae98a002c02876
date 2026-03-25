import { IHttpClient } from "../http_client/IHttpClient.js";
import { ServerTelemetryManager } from "@azure/msal-common/browser";
export declare abstract class BaseApiClient {
    private readonly clientId;
    private httpClient;
    private customAuthApiQueryParams?;
    private readonly baseRequestUrl;
    constructor(baseUrl: string, clientId: string, httpClient: IHttpClient, customAuthApiQueryParams?: Record<string, string> | undefined);
    protected request<T>(endpoint: string, data: Record<string, string | boolean>, telemetryManager: ServerTelemetryManager, correlationId: string): Promise<T>;
    protected ensureContinuationTokenIsValid(continuationToken: string | undefined, correlationId: string): void;
    private readResponseCorrelationId;
    private getCommonHeaders;
    private handleApiResponse;
}
//# sourceMappingURL=BaseApiClient.d.ts.map