import { HttpOperationMode, LongRunningOperation, LroResourceLocationConfig, LroResponse, RawResponse } from "./models.js";
import { LroError, OperationConfig, OperationStatus, RestorableOperationState, StateProxy } from "../poller/models.js";
import { AbortSignalLike } from "@azure/abort-controller";
export declare function inferLroMode(inputs: {
    rawResponse: RawResponse;
    requestPath?: string;
    requestMethod?: string;
    resourceLocationConfig?: LroResourceLocationConfig;
}): (OperationConfig & {
    mode: HttpOperationMode;
}) | undefined;
export declare function parseRetryAfter<T>({ rawResponse }: LroResponse<T>): number | undefined;
export declare function getErrorFromResponse<T>(response: LroResponse<T>): LroError | undefined;
export declare function getStatusFromInitialResponse<TState>(inputs: {
    response: LroResponse<unknown>;
    state: RestorableOperationState<TState>;
    operationLocation?: string;
}): OperationStatus;
/**
 * Initiates the long-running operation.
 */
export declare function initHttpOperation<TResult, TState>(inputs: {
    stateProxy: StateProxy<TState, TResult>;
    resourceLocationConfig?: LroResourceLocationConfig;
    processResult?: (result: unknown, state: TState) => TResult;
    setErrorAsResult: boolean;
    lro: LongRunningOperation;
}): Promise<RestorableOperationState<TState>>;
export declare function getOperationLocation<TState>({ rawResponse }: LroResponse, state: RestorableOperationState<TState>): string | undefined;
export declare function getOperationStatus<TState>({ rawResponse }: LroResponse, state: RestorableOperationState<TState>): OperationStatus;
export declare function getResourceLocation<TState>(res: LroResponse, state: RestorableOperationState<TState>): string | undefined;
export declare function isOperationError(e: Error): boolean;
/** Polls the long-running operation. */
export declare function pollHttpOperation<TState, TResult>(inputs: {
    lro: LongRunningOperation;
    stateProxy: StateProxy<TState, TResult>;
    processResult?: (result: unknown, state: TState) => TResult;
    updateState?: (state: TState, lastResponse: LroResponse) => void;
    isDone?: (lastResponse: LroResponse, state: TState) => boolean;
    setDelay: (intervalInMs: number) => void;
    options?: {
        abortSignal?: AbortSignalLike;
    };
    state: RestorableOperationState<TState>;
    setErrorAsResult: boolean;
}): Promise<void>;
//# sourceMappingURL=operation.d.ts.map