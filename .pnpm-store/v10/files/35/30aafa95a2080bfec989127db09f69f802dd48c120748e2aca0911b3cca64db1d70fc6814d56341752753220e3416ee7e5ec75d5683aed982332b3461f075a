import { AbortSignalLike } from '@azure/abort-controller';

/**
 * CancelOnProgress is used as the return value of a Poller's onProgress method.
 * When a user invokes onProgress, they're required to pass in a function that will be
 * called as a callback with the new data received each time the poll operation is updated.
 * onProgress returns a function that will prevent any further update to reach the original callback.
 */
export declare type CancelOnProgress = () => void;

/**
 * Creates a poller that can be used to poll a long-running operation.
 * @param lro - Description of the long-running operation
 * @param options - options to configure the poller
 * @returns an initialized poller
 */
export declare function createHttpPoller<TResult, TState extends OperationState<TResult>>(lro: LongRunningOperation, options?: CreateHttpPollerOptions<TResult, TState>): Promise<SimplePollerLike<TState, TResult>>;

/**
 * Options for `createPoller`.
 */
export declare interface CreateHttpPollerOptions<TResult, TState> {
    /**
     * Defines how much time the poller is going to wait before making a new request to the service.
     */
    intervalInMs?: number;
    /**
     * A serialized poller which can be used to resume an existing paused Long-Running-Operation.
     */
    restoreFrom?: string;
    /**
     * The potential location of the result of the LRO if specified by the LRO extension in the swagger.
     */
    resourceLocationConfig?: LroResourceLocationConfig;
    /**
     * A function to process the result of the LRO.
     */
    processResult?: (result: unknown, state: TState) => TResult;
    /**
     * A function to process the state of the LRO.
     */
    updateState?: (state: TState, response: LroResponse) => void;
    /**
     * A function to be called each time the operation location is updated by the
     * service.
     */
    withOperationLocation?: (operationLocation: string) => void;
    /**
     * Control whether to throw an exception if the operation failed or was canceled.
     */
    resolveOnUnsuccessful?: boolean;
}

/**
 * Description of a long running operation.
 */
export declare interface LongRunningOperation<T = unknown> {
    /**
     * The request path. This should be set if the operation is a PUT and needs
     * to poll from the same request path.
     */
    requestPath?: string;
    /**
     * The HTTP request method. This should be set if the operation is a PUT or a
     * DELETE.
     */
    requestMethod?: string;
    /**
     * A function that can be used to send initial request to the service.
     */
    sendInitialRequest: () => Promise<LroResponse<unknown>>;
    /**
     * A function that can be used to poll for the current status of a long running operation.
     */
    sendPollRequest: (path: string, options?: {
        abortSignal?: AbortSignalLike;
    }) => Promise<LroResponse<T>>;
}

/**
 * The LRO Engine, a class that performs polling.
 */
export declare class LroEngine<TResult, TState extends PollOperationState<TResult>> extends Poller<TState, TResult> {
    private config;
    constructor(lro: LongRunningOperation<TResult>, options?: LroEngineOptions<TResult, TState>);
    /**
     * The method used by the poller to wait before attempting to update its operation.
     */
    delay(): Promise<void>;
}

/**
 * Options for the LRO poller.
 */
export declare interface LroEngineOptions<TResult, TState> {
    /**
     * Defines how much time the poller is going to wait before making a new request to the service.
     */
    intervalInMs?: number;
    /**
     * A serialized poller which can be used to resume an existing paused Long-Running-Operation.
     */
    resumeFrom?: string;
    /**
     * The potential location of the result of the LRO if specified by the LRO extension in the swagger.
     */
    lroResourceLocationConfig?: LroResourceLocationConfig;
    /**
     * A function to process the result of the LRO.
     */
    processResult?: (result: unknown, state: TState) => TResult;
    /**
     * A function to process the state of the LRO.
     */
    updateState?: (state: TState, lastResponse: RawResponse) => void;
    /**
     * A predicate to determine whether the LRO finished processing.
     */
    isDone?: (lastResponse: unknown, state: TState) => boolean;
    /**
     * Control whether to throw an exception if the operation failed or was canceled.
     */
    resolveOnUnsuccessful?: boolean;
}

/**
 * The potential location of the result of the LRO if specified by the LRO extension in the swagger.
 */
export declare type LroResourceLocationConfig = "azure-async-operation" | "location" | "original-uri";

/**
 * The type of the response of a LRO.
 */
export declare interface LroResponse<T = unknown> {
    /** The flattened response */
    flatResponse: T;
    /** The raw response */
    rawResponse: RawResponse;
}

/**
 * While the poller works as the local control mechanism to start triggering and
 * wait for a long-running operation, OperationState documents the status of
 * the remote long-running operation. It gets updated after each poll.
 */
export declare interface OperationState<TResult> {
    /**
     * The current status of the operation.
     */
    status: OperationStatus;
    /**
     * Will exist if the operation encountered any error.
     */
    error?: Error;
    /**
     * Will exist if the operation produced a result of the expected type.
     */
    result?: TResult;
}

/**
 * The set of possible states an operation can be in at any given time.
 */
export declare type OperationStatus = "notStarted" | "running" | "succeeded" | "canceled" | "failed";

/**
 * A class that represents the definition of a program that polls through consecutive requests
 * until it reaches a state of completion.
 *
 * A poller can be executed manually, by polling request by request by calling to the `poll()` method repeatedly, until its operation is completed.
 * It also provides a way to wait until the operation completes, by calling `pollUntilDone()` and waiting until the operation finishes.
 * Pollers can also request the cancellation of the ongoing process to whom is providing the underlying long running operation.
 *
 * ```ts
 * const poller = new MyPoller();
 *
 * // Polling just once:
 * await poller.poll();
 *
 * // We can try to cancel the request here, by calling:
 * //
 * //     await poller.cancelOperation();
 * //
 *
 * // Getting the final result:
 * const result = await poller.pollUntilDone();
 * ```
 *
 * The Poller is defined by two types, a type representing the state of the poller, which
 * must include a basic set of properties from `PollOperationState<TResult>`,
 * and a return type defined by `TResult`, which can be anything.
 *
 * The Poller class implements the `PollerLike` interface, which allows poller implementations to avoid having
 * to export the Poller's class directly, and instead only export the already instantiated poller with the PollerLike type.
 *
 * ```ts
 * class Client {
 *   public async makePoller: PollerLike<MyOperationState, MyResult> {
 *     const poller = new MyPoller({});
 *     // It might be preferred to return the poller after the first request is made,
 *     // so that some information can be obtained right away.
 *     await poller.poll();
 *     return poller;
 *   }
 * }
 *
 * const poller: PollerLike<MyOperationState, MyResult> = myClient.makePoller();
 * ```
 *
 * A poller can be created through its constructor, then it can be polled until it's completed.
 * At any point in time, the state of the poller can be obtained without delay through the getOperationState method.
 * At any point in time, the intermediate forms of the result type can be requested without delay.
 * Once the underlying operation is marked as completed, the poller will stop and the final value will be returned.
 *
 * ```ts
 * const poller = myClient.makePoller();
 * const state: MyOperationState = poller.getOperationState();
 *
 * // The intermediate result can be obtained at any time.
 * const result: MyResult | undefined = poller.getResult();
 *
 * // The final result can only be obtained after the poller finishes.
 * const result: MyResult = await poller.pollUntilDone();
 * ```
 *
 */
export declare abstract class Poller<TState extends PollOperationState<TResult>, TResult> implements PollerLike<TState, TResult> {
    /** controls whether to throw an error if the operation failed or was canceled. */
    protected resolveOnUnsuccessful: boolean;
    private stopped;
    private resolve?;
    private reject?;
    private pollOncePromise?;
    private cancelPromise?;
    private promise;
    private pollProgressCallbacks;
    /**
     * The poller's operation is available in full to any of the methods of the Poller class
     * and any class extending the Poller class.
     */
    protected operation: PollOperation<TState, TResult>;
    /**
     * A poller needs to be initialized by passing in at least the basic properties of the `PollOperation<TState, TResult>`.
     *
     * When writing an implementation of a Poller, this implementation needs to deal with the initialization
     * of any custom state beyond the basic definition of the poller. The basic poller assumes that the poller's
     * operation has already been defined, at least its basic properties. The code below shows how to approach
     * the definition of the constructor of a new custom poller.
     *
     * ```ts
     * export class MyPoller extends Poller<MyOperationState, string> {
     *   constructor({
     *     // Anything you might need outside of the basics
     *   }) {
     *     let state: MyOperationState = {
     *       privateProperty: private,
     *       publicProperty: public,
     *     };
     *
     *     const operation = {
     *       state,
     *       update,
     *       cancel,
     *       toString
     *     }
     *
     *     // Sending the operation to the parent's constructor.
     *     super(operation);
     *
     *     // You can assign more local properties here.
     *   }
     * }
     * ```
     *
     * Inside of this constructor, a new promise is created. This will be used to
     * tell the user when the poller finishes (see `pollUntilDone()`). The promise's
     * resolve and reject methods are also used internally to control when to resolve
     * or reject anyone waiting for the poller to finish.
     *
     * The constructor of a custom implementation of a poller is where any serialized version of
     * a previous poller's operation should be deserialized into the operation sent to the
     * base constructor. For example:
     *
     * ```ts
     * export class MyPoller extends Poller<MyOperationState, string> {
     *   constructor(
     *     baseOperation: string | undefined
     *   ) {
     *     let state: MyOperationState = {};
     *     if (baseOperation) {
     *       state = {
     *         ...JSON.parse(baseOperation).state,
     *         ...state
     *       };
     *     }
     *     const operation = {
     *       state,
     *       // ...
     *     }
     *     super(operation);
     *   }
     * }
     * ```
     *
     * @param operation - Must contain the basic properties of `PollOperation<State, TResult>`.
     */
    constructor(operation: PollOperation<TState, TResult>);
    /**
     * Defines how much to wait between each poll request.
     * This has to be implemented by your custom poller.
     *
     * \@azure/core-util has a simple implementation of a delay function that waits as many milliseconds as specified.
     * This can be used as follows:
     *
     * ```ts
     * import { delay } from "@azure/core-util";
     *
     * export class MyPoller extends Poller<MyOperationState, string> {
     *   // The other necessary definitions.
     *
     *   async delay(): Promise<void> {
     *     const milliseconds = 1000;
     *     return delay(milliseconds);
     *   }
     * }
     * ```
     *
     */
    protected abstract delay(): Promise<void>;
    /**
     * Starts a loop that will break only if the poller is done
     * or if the poller is stopped.
     */
    private startPolling;
    /**
     * pollOnce does one polling, by calling to the update method of the underlying
     * poll operation to make any relevant change effective.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    private pollOnce;
    /**
     * fireProgress calls the functions passed in via onProgress the method of the poller.
     *
     * It loops over all of the callbacks received from onProgress, and executes them, sending them
     * the current operation state.
     *
     * @param state - The current operation state.
     */
    private fireProgress;
    /**
     * Invokes the underlying operation's cancel method.
     */
    private cancelOnce;
    /**
     * Returns a promise that will resolve once a single polling request finishes.
     * It does this by calling the update method of the Poller's operation.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    poll(options?: {
        abortSignal?: AbortSignalLike;
    }): Promise<void>;
    private processUpdatedState;
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
     * Stops the poller from continuing to poll.
     */
    stopPolling(): void;
    /**
     * Returns true if the poller is stopped.
     */
    isStopped(): boolean;
    /**
     * Attempts to cancel the underlying operation.
     *
     * It only optionally receives an object with an abortSignal property, from \@azure/abort-controller's AbortSignalLike.
     *
     * If it's called again before it finishes, it will throw an error.
     *
     * @param options - Optional properties passed to the operation's update method.
     */
    cancelOperation(options?: {
        abortSignal?: AbortSignalLike;
    }): Promise<void>;
    /**
     * Returns the state of the operation.
     *
     * Even though TState will be the same type inside any of the methods of any extension of the Poller class,
     * implementations of the pollers can customize what's shared with the public by writing their own
     * version of the `getOperationState` method, and by defining two types, one representing the internal state of the poller
     * and a public type representing a safe to share subset of the properties of the internal state.
     * Their definition of getOperationState can then return their public type.
     *
     * Example:
     *
     * ```ts
     * // Let's say we have our poller's operation state defined as:
     * interface MyOperationState extends PollOperationState<ResultType> {
     *   privateProperty?: string;
     *   publicProperty?: string;
     * }
     *
     * // To allow us to have a true separation of public and private state, we have to define another interface:
     * interface PublicState extends PollOperationState<ResultType> {
     *   publicProperty?: string;
     * }
     *
     * // Then, we define our Poller as follows:
     * export class MyPoller extends Poller<MyOperationState, ResultType> {
     *   // ... More content is needed here ...
     *
     *   public getOperationState(): PublicState {
     *     const state: PublicState = this.operation.state;
     *     return {
     *       // Properties from PollOperationState<TResult>
     *       isStarted: state.isStarted,
     *       isCompleted: state.isCompleted,
     *       isCancelled: state.isCancelled,
     *       error: state.error,
     *       result: state.result,
     *
     *       // The only other property needed by PublicState.
     *       publicProperty: state.publicProperty
     *     }
     *   }
     * }
     * ```
     *
     * You can see this in the tests of this repository, go to the file:
     * `../test/utils/testPoller.ts`
     * and look for the getOperationState implementation.
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

/**
 * When the operation is cancelled, the poller will be rejected with an instance
 * of the PollerCancelledError.
 */
export declare class PollerCancelledError extends Error {
    constructor(message: string);
}

/**
 * Abstract representation of a poller, intended to expose just the minimal API that the user needs to work with.
 */
export declare interface PollerLike<TState extends PollOperationState<TResult>, TResult> {
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

/**
 * When a poller is manually stopped through the `stopPolling` method,
 * the poller will be rejected with an instance of the PollerStoppedError.
 */
export declare class PollerStoppedError extends Error {
    constructor(message: string);
}

/**
 * PollOperation is an interface that defines how to update the local reference of the state of the remote
 * long running operation, just as well as how to request the cancellation of the same operation.
 *
 * It also has a method to serialize the operation so that it can be stored and resumed at any time.
 */
export declare interface PollOperation<TState, TResult> {
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
export declare interface PollOperationState<TResult> {
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
 * PollProgressCallback<TState> is the type of the callback functions sent to onProgress.
 * These functions will receive a TState that is defined by your implementation of
 * the Poller class.
 */
export declare type PollProgressCallback<TState> = (state: TState) => void;

/**
 * Simple type of the raw response.
 */
export declare interface RawResponse {
    /** The HTTP status code */
    statusCode: number;
    /** A HttpHeaders collection in the response represented as a simple JSON object where all header names have been normalized to be lower-case. */
    headers: {
        [headerName: string]: string;
    };
    /** The parsed response body */
    body?: unknown;
}

/**
 * A simple poller interface.
 */
export declare interface SimplePollerLike<TState extends OperationState<TResult>, TResult> {
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
     * Returns the state of the operation.
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

export { }
