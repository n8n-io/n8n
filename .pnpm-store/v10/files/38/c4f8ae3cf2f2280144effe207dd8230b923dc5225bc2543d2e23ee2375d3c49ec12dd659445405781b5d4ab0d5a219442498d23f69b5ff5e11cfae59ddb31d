/// <reference types="node" resolution-mode="require"/>
import { IncomingHttpHeaders } from "http";
export declare class LinearRetryStrategy {
    /**
     * Calculates the number of milliseconds to sleep based on the `retry-after` HTTP header.
     *
     * @param retryHeader - The value of the `retry-after` HTTP header. This can be either a number of seconds
     *                      or an HTTP date string.
     * @returns The number of milliseconds to sleep before retrying the request. If the `retry-after` header is not
     *          present or cannot be parsed, returns 0.
     */
    calculateDelay(retryHeader: IncomingHttpHeaders["retry-after"], minimumDelay: number): number;
}
//# sourceMappingURL=LinearRetryStrategy.d.ts.map