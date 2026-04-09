import { LroEngineOptions } from "./models.js";
import { LongRunningOperation } from "../../http/models.js";
import { PollOperationState } from "../pollOperation.js";
import { Poller } from "../poller.js";
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
//# sourceMappingURL=lroEngine.d.ts.map