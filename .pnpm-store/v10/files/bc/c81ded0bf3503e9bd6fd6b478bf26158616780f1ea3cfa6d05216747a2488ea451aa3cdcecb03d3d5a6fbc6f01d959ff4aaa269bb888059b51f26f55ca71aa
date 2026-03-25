import { WaiterConfiguration as WaiterConfiguration__ } from "@smithy/types";
/**
 * @internal
 */
export interface WaiterConfiguration<T> extends WaiterConfiguration__<T> {
}
/**
 * @internal
 */
export declare const waiterServiceDefaults: {
    minDelay: number;
    maxDelay: number;
};
/**
 * @internal
 */
export type WaiterOptions<Client> = WaiterConfiguration<Client> & Required<Pick<WaiterConfiguration<Client>, "minDelay" | "maxDelay">>;
/**
 * @internal
 */
export declare enum WaiterState {
    ABORTED = "ABORTED",
    FAILURE = "FAILURE",
    SUCCESS = "SUCCESS",
    RETRY = "RETRY",
    TIMEOUT = "TIMEOUT"
}
/**
 * @internal
 */
export type WaiterResult = {
    state: WaiterState;
    /**
     * (optional) Indicates a reason for why a waiter has reached its state.
     */
    reason?: any;
    /**
     * Responses observed by the waiter during its polling, where the value
     * is the count.
     */
    observedResponses?: Record<string, number>;
};
/**
 * @internal
 *
 * Handles and throws exceptions resulting from the waiterResult
 * @param result - WaiterResult
 */
export declare const checkExceptions: (result: WaiterResult) => WaiterResult;
