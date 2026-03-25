import type { PipelineResponse } from "../interfaces.js";
import type { RetryStrategy } from "./retryStrategy.js";
/**
 * A response is a retry response if it has a throttling status code (429 or 503),
 * as long as one of the [ "Retry-After" or "retry-after-ms" or "x-ms-retry-after-ms" ] headers has a valid value.
 */
export declare function isThrottlingRetryResponse(response?: PipelineResponse): boolean;
export declare function throttlingRetryStrategy(): RetryStrategy;
//# sourceMappingURL=throttlingRetryStrategy.d.ts.map