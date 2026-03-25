/// <reference types="node" resolution-mode="require"/>
import { IncomingHttpHeaders } from "http";
import { Logger } from "@azure/msal-common";
import { IHttpRetryPolicy } from "./IHttpRetryPolicy.js";
export declare const DEFAULT_MANAGED_IDENTITY_MAX_RETRIES: number;
export declare class DefaultManagedIdentityRetryPolicy implements IHttpRetryPolicy {
    static get DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS(): number;
    private linearRetryStrategy;
    pauseForRetry(httpStatusCode: number, currentRetry: number, logger: Logger, retryAfterHeader: IncomingHttpHeaders["retry-after"]): Promise<boolean>;
}
//# sourceMappingURL=DefaultManagedIdentityRetryPolicy.d.ts.map