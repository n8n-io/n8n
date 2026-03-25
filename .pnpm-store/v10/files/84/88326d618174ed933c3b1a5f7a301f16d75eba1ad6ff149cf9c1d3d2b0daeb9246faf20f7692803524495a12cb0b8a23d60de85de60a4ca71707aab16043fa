import { RunTreeConfig } from "./run_trees.js";
import { Attachments, InvocationParamsSchema, KVMap } from "./schemas.js";
import type { TraceableFunction } from "./singletons/types.js";
import { OTELTracer } from "./experimental/otel/types.js";
export type ProcessInputs<Args extends unknown[]> = Args extends [] ? Record<string, never> : Args extends [infer Input] ? Input extends KVMap ? Input extends Iterable<infer Item> | AsyncIterable<infer Item> ? {
    input: Array<Item>;
} : Input : {
    input: Input;
} : {
    args: Args;
};
export type ProcessOutputs<ReturnValue> = ReturnValue extends KVMap ? ReturnValue extends Iterable<infer Item> | AsyncIterable<infer Item> ? {
    outputs: Array<Item>;
} : ReturnValue : {
    outputs: ReturnValue;
};
export type TraceableConfig<Func extends (...args: any[]) => any> = Partial<Omit<RunTreeConfig, "inputs" | "outputs">> & {
    aggregator?: (args: any[]) => any;
    argsConfigPath?: [number] | [number, string];
    tracer?: OTELTracer;
    __finalTracedIteratorKey?: string;
    __deferredSerializableArgOptions?: {
        depth?: number;
        maxDepth?: number;
    };
    /**
     * Extract attachments from args and return remaining args.
     * @param args Arguments of the traced function
     * @returns Tuple of [Attachments, remaining args]
     */
    extractAttachments?: (...args: Parameters<Func>) => [Attachments | undefined, KVMap];
    /**
     * Extract invocation parameters from the arguments of the traced function.
     * This is useful for LangSmith to properly track common metadata like
     * provider, model name and temperature.
     *
     * @param args Arguments of the traced function
     * @returns Key-value map of the invocation parameters, which will be merged with the existing metadata
     */
    getInvocationParams?: (...args: Parameters<Func>) => InvocationParamsSchema | undefined;
    /**
     * Apply transformations to the inputs before logging.
     * This function should NOT mutate the inputs.
     * `processInputs` is not inherited by nested traceable functions.
     *
     * The input to this function is determined as follows based on the
     * arguments passed to the wrapped function:
     * - If called with one argument that is an object, it will be the unchanged argument
     * - If called with one argument that is not an object, it will be `{ input: arg }`
     * - If called with multiple arguments, it will be `{ args: [...arguments] }`
     * - If called with no arguments, it will be an empty object `{}`
     *
     * @param inputs Key-value map of the function inputs.
     * @returns Transformed key-value map
     */
    processInputs?: (inputs: Readonly<ProcessInputs<Parameters<Func>>>) => KVMap | Promise<KVMap>;
    /**
     * Apply transformations to the outputs before logging.
     * This function should NOT mutate the outputs.
     * `processOutputs` is not inherited by nested traceable functions.
     *
     * The input to this function is determined as follows based on the
     * return value of the wrapped function:
     * - If the return value is an object, it will be the unchanged return value
     * - If the return value is not an object, it will wrapped as `{ outputs: returnValue }`
     *
     * @param outputs Key-value map of the function outputs
     * @returns Transformed key-value map
     */
    processOutputs?: (outputs: Readonly<ProcessOutputs<Awaited<ReturnType<Func>>>>) => KVMap | Promise<KVMap>;
};
/**
 * Higher-order function that takes function as input and returns a
 * "TraceableFunction" - a wrapped version of the input that
 * automatically handles tracing. If the returned traceable function calls any
 * traceable functions, those are automatically traced as well.
 *
 * The returned TraceableFunction can accept a run tree or run tree config as
 * its first argument. If omitted, it will default to the caller's run tree,
 * or will be treated as a root run.
 *
 * @param wrappedFunc Targeted function to be traced
 * @param config Additional metadata such as name, tags or providing
 *     a custom LangSmith client instance
 */
export declare function traceable<Func extends (...args: any[]) => any>(wrappedFunc: Func, config?: TraceableConfig<Func>): TraceableFunction<Func>;
export { getCurrentRunTree, isTraceableFunction, withRunTree, ROOT, } from "./singletons/traceable.js";
export type { RunTreeLike, TraceableFunction } from "./singletons/types.js";
