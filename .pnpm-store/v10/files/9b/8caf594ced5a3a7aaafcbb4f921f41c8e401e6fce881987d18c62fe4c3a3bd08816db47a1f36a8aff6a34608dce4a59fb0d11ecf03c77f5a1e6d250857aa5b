import type { PipelineResponse } from "../interfaces.js";
/**
 * A wrapper for setTimeout that resolves a promise after delayInMs milliseconds.
 * @param delayInMs - The number of milliseconds to be delayed.
 * @param value - The value to be resolved with after a timeout of t milliseconds.
 * @param options - The options for delay - currently abort options
 *                  - abortSignal - The abortSignal associated with containing operation.
 *                  - abortErrorMsg - The abort error message associated with containing operation.
 * @returns Resolved promise
 */
export declare function delay<T>(delayInMs: number, value?: T, options?: {
    abortSignal?: AbortSignal;
    abortErrorMsg?: string;
}): Promise<T | void>;
/**
 * @internal
 * @returns the parsed value or undefined if the parsed value is invalid.
 */
export declare function parseHeaderValueAsNumber(response: PipelineResponse, headerName: string): number | undefined;
//# sourceMappingURL=helpers.d.ts.map