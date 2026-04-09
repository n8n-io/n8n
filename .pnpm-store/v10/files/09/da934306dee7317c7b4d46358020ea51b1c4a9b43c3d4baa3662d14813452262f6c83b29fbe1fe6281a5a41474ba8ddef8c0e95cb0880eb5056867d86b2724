import { AbortSignalLike } from "@azure/abort-controller";
import { CancelOnProgress } from "../poller/models.js";
import { PollOperationState } from "./pollOperation.js";
/**
 * Abstract representation of a poller, intended to expose just the minimal API that the user needs to work with.
 */
export interface PollerLike<TState extends PollOperationState<TResult>, TResult> {
    /**
     * Returns a promise that will resolve once a single polling request finishes.
     * It does this by calling the update method of the Poller's operation.
     */
    poll(options?: {
        abortSignal?: AbortSignalLike;
    }): Promise<void>;
    /**
     * Returns a promise that will resolve once the underlying operation is completed.
     */
    pollUntilDone(pollOptions?: {
        abortSignal?: AbortSignalLike;
    }): Promise<TResult>;
    /**
     * Invokes the provided callback after each polling is completed,
     * sending the current state of the poller's operation.
     *
     * It returns a method that can be used to stop receiving updates on the given callback function.
     */
    onProgress(callback: (state: TState) => void): CancelOnProgress;
    /**
     * Returns true if the poller has finished polling.
     */
    isDone(): boolean;
    /**
     * Stops the poller. After this, no manual or automated requests can be sent.
     */
    stopPolling(): void;
    /**
     * Returns true if the poller is stopped.
     */
    isStopped(): boolean;
    /**
     * Attempts to cancel the underlying operation.
     * @deprecated `cancelOperation` has been deprecated because it was not implemented.
     */
    cancelOperation(options?: {
        abortSignal?: AbortSignalLike;
    }): Promise<void>;
    /**
     * Returns the state of the operation.
     * The TState defined in PollerLike can be a subset of the TState defined in
     * the Poller implementation.
     */
    getOperationState(): TState;
    /**
     * Returns the result value of the operation,
     * regardless of the state of the poller.
     * It can return undefined or an incomplete form of the final TResult value
     * depending on the implementation.
     */
    getResult(): TResult | undefined;
    /**
     * Returns a serialized version of the poller's operation
     * by invoking the operation's toString method.
     */
    toString(): string;
}
//# sourceMappingURL=models.d.ts.map