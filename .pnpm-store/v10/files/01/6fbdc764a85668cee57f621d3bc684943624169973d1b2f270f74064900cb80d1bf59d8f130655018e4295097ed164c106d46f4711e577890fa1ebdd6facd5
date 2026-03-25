import { CallbackManager } from "@langchain/core/callbacks/manager";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { RunTree } from "./run_trees.js";
import { TraceableFunction } from "./traceable.js";
/**
 * Converts the current run tree active within a traceable-wrapped function
 * into a LangChain compatible callback manager. This is useful to handoff tracing
 * from LangSmith to LangChain Runnables and LLMs.
 *
 * @param {RunTree | undefined} currentRunTree Current RunTree from within a traceable-wrapped function. If not provided, the current run tree will be inferred from AsyncLocalStorage.
 * @returns {CallbackManager | undefined} Callback manager used by LangChain Runnable objects.
 */
export declare function getLangchainCallbacks(currentRunTree?: RunTree | undefined): Promise<CallbackManager | undefined>;
type AnyTraceableFunction = TraceableFunction<(...any: any[]) => any>;
/**
 * RunnableTraceable is a Runnable that wraps a traceable function.
 * This allows adding Langsmith traced functions into LangChain sequences.
 * @deprecated Wrap or pass directly instead.
 */
export declare class RunnableTraceable<RunInput, RunOutput> extends Runnable<RunInput, RunOutput> {
    lc_serializable: boolean;
    lc_namespace: string[];
    protected func: AnyTraceableFunction;
    constructor(fields: {
        func: AnyTraceableFunction;
    });
    invoke(input: RunInput, options?: Partial<RunnableConfig>): Promise<RunOutput>;
    _streamIterator(input: RunInput, options?: Partial<RunnableConfig>): AsyncGenerator<RunOutput>;
    static from(func: AnyTraceableFunction): RunnableTraceable<unknown, unknown>;
}
export {};
