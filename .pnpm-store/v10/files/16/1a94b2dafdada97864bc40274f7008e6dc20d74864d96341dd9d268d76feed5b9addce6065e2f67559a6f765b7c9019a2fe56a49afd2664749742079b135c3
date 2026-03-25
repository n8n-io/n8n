import { BaseClient } from "./BaseClient.js";
import { ClientConfiguration } from "../config/ClientConfiguration.js";
import { CommonSilentFlowRequest } from "../request/CommonSilentFlowRequest.js";
import { AuthenticationResult } from "../response/AuthenticationResult.js";
import { CacheOutcome } from "../utils/Constants.js";
import { IPerformanceClient } from "../telemetry/performance/IPerformanceClient.js";
/** @internal */
export declare class SilentFlowClient extends BaseClient {
    constructor(configuration: ClientConfiguration, performanceClient?: IPerformanceClient);
    /**
     * Retrieves token from cache or throws an error if it must be refreshed.
     * @param request
     */
    acquireCachedToken(request: CommonSilentFlowRequest): Promise<[AuthenticationResult, CacheOutcome]>;
    private setCacheOutcome;
    /**
     * Helper function to build response object from the CacheRecord
     * @param cacheRecord
     */
    private generateResultFromCacheRecord;
}
//# sourceMappingURL=SilentFlowClient.d.ts.map