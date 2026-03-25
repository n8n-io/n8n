import { INetworkModule, Logger, NetworkRequestOptions, NetworkResponse } from "@azure/msal-common/node";
import { IHttpRetryPolicy } from "../retry/IHttpRetryPolicy.js";
export declare class HttpClientWithRetries implements INetworkModule {
    private httpClientNoRetries;
    private retryPolicy;
    private logger;
    constructor(httpClientNoRetries: INetworkModule, retryPolicy: IHttpRetryPolicy, logger: Logger);
    private sendNetworkRequestAsyncHelper;
    private sendNetworkRequestAsync;
    sendGetRequestAsync<T>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;
    sendPostRequestAsync<T>(url: string, options?: NetworkRequestOptions): Promise<NetworkResponse<T>>;
}
//# sourceMappingURL=HttpClientWithRetries.d.ts.map