import { AbortSignalLike } from "@azure/abort-controller";
/**
 * PollOperationState contains an opinionated list of the smallest set of properties needed
 * to define any long running operation poller.
 *
 * While the Poller class works as the local control mechanism to start triggering, wait for,
 * and potentially cancel a long running operation, the PollOperationState documents the status
 * of the remote long running operation.
 *
 * It should be updated at least when the operation starts, when it's finished, and when it's cancelled.
 * Though, implementations can have any other number of properties that can be updated by other reasons.
 */
export interface PollOperationState<TResult> {
    /**
     * True if the operation has started.
     */
    isStarted?: boolean;
    /**
     * True if the operation has been completed.
     */
    isCompleted?: boolean;
    /**
     * True if the operation has been cancelled.
     */
    isCancelled?: boolean;
    /**
     * Will exist if the operation encountered any error.
     */
    error?: Error;
    /**
     * Will exist if the operation concluded in a result of an expected type.
     */
    result?: TResult;
}
/**
 * PollOperation is an interface that defines how to update the local reference of the state of the remote
 * long running operation, just as well as how to request the cancellation of the same operation.
 *
 * It also has a method to serialize the operation so that it can be stored and resumed at any time.
 */
export interface PollOperation<TState, TResult> {
    /**
     * The state of the operation.
     * It will be used to store the basic properties of PollOperationState<TResult>,
     * plus any custom property that the implementation may require.
     */
    state: TState;
    /**
     * Defines how to request the remote service for updates on the status of the long running operation.
     *
     * It optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     * Also optionally receives a "fireProgress" function, which, if called, is responsible for triggering the
     * poller's onProgress callbacks.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    update(options?: {
        abortSignal?: AbortSignalLike;
        fireProgress?: (state: TState) => void;
    }): Promise<PollOperation<TState, TResult>>;
    /**
     * Attempts to cancel the underlying operation.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * It returns a promise that should be resolved with an updated version of the poller's operation.
     *
     * @param options - Optional properties passed to the operation's update method.
     *
     * @deprecated `cancel` has been deprecated because it was not implemented.
     */
    cancel(options?: {
        abortSignal?: AbortSignalLike;
    }): Promise<PollOperation<TState, TResult>>;
    /**
     * Serializes the operation.
     * Useful when wanting to create a poller that monitors an existing operation.
     */
    toString(): string;
}
//# sourceMappingURL=pollOperation.d.ts.map