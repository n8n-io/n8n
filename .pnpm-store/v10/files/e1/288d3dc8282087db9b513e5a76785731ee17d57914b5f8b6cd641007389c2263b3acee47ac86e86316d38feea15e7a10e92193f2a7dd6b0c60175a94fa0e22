import { LroError, Operation, OperationStatus, RestorableOperationState, StateProxy } from "./models.js";
/**
 * Deserializes the state
 */
export declare function deserializeState<TState>(serializedState: string): RestorableOperationState<TState>;
/**
 * Initiates the long-running operation.
 */
export declare function initOperation<TResponse, TResult, TState>(inputs: {
    init: Operation<TResponse, unknown>["init"];
    stateProxy: StateProxy<TState, TResult>;
    getOperationStatus: (inputs: {
        response: TResponse;
        state: RestorableOperationState<TState>;
        operationLocation?: string;
    }) => OperationStatus;
    processResult?: (result: TResponse, state: TState) => TResult;
    withOperationLocation?: (operationLocation: string, isUpdated: boolean) => void;
    setErrorAsResult: boolean;
}): Promise<RestorableOperationState<TState>>;
/** Polls the long-running operation. */
export declare function pollOperation<TResponse, TState, TResult, TOptions>(inputs: {
    poll: Operation<TResponse, TOptions>["poll"];
    stateProxy: StateProxy<TState, TResult>;
    state: RestorableOperationState<TState>;
    getOperationStatus: (response: TResponse, state: RestorableOperationState<TState>) => OperationStatus;
    getResourceLocation: (response: TResponse, state: RestorableOperationState<TState>) => string | undefined;
    isOperationError: (error: Error) => boolean;
    getPollingInterval?: (response: TResponse) => number | undefined;
    setDelay: (intervalInMs: number) => void;
    getOperationLocation?: (response: TResponse, state: RestorableOperationState<TState>) => string | undefined;
    withOperationLocation?: (operationLocation: string, isUpdated: boolean) => void;
    processResult?: (result: TResponse, state: TState) => TResult;
    getError?: (response: TResponse) => LroError | undefined;
    updateState?: (state: TState, lastResponse: TResponse) => void;
    isDone?: (lastResponse: TResponse, state: TState) => boolean;
    setErrorAsResult: boolean;
    options?: TOptions;
}): Promise<void>;
//# sourceMappingURL=operation.d.ts.map