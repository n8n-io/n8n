import { LongRunningOperation, LroResourceLocationConfig, RawResponse } from "../../http/models.js";
import { PollOperation, PollOperationState } from "../pollOperation.js";
import { RestorableOperationState } from "../../poller/models.js";
import { AbortSignalLike } from "@azure/abort-controller";
import { PollerConfig } from "./models.js";
export declare class GenericPollOperation<TResult, TState extends PollOperationState<TResult>> implements PollOperation<TState, TResult> {
    state: RestorableOperationState<TState>;
    private lro;
    private setErrorAsResult;
    private lroResourceLocationConfig?;
    private processResult?;
    private updateState?;
    private isDone?;
    private pollerConfig?;
    constructor(state: RestorableOperationState<TState>, lro: LongRunningOperation, setErrorAsResult: boolean, lroResourceLocationConfig?: LroResourceLocationConfig | undefined, processResult?: ((result: unknown, state: TState) => TResult) | undefined, updateState?: ((state: TState, lastResponse: RawResponse) => void) | undefined, isDone?: ((lastResponse: TResult, state: TState) => boolean) | undefined);
    setPollerConfig(pollerConfig: PollerConfig): void;
    update(options?: {
        abortSignal?: AbortSignalLike;
        fireProgress?: (state: TState) => void;
    }): Promise<PollOperation<TState, TResult>>;
    cancel(): Promise<PollOperation<TState, TResult>>;
    /**
     * Serializes the Poller operation.
     */
    toString(): string;
}
//# sourceMappingURL=operation.d.ts.map