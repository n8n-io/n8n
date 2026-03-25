import type { RunTree } from "../run_trees.js";
import type { ContextPlaceholder, TraceableFunction } from "./types.js";
interface AsyncLocalStorageInterface {
    getStore: () => RunTree | ContextPlaceholder | undefined;
    run: (context: RunTree | ContextPlaceholder | undefined, fn: () => void) => void;
}
declare class AsyncLocalStorageProvider {
    getInstance(): AsyncLocalStorageInterface;
    initializeGlobalInstance(instance: AsyncLocalStorageInterface): void;
}
export declare const AsyncLocalStorageProviderSingleton: AsyncLocalStorageProvider;
/**
 * Return the current run tree from within a traceable-wrapped function.
 * Will throw an error if called outside of a traceable function.
 *
 * @returns The run tree for the given context.
 */
export declare function getCurrentRunTree(): RunTree;
export declare function getCurrentRunTree(permitAbsentRunTree: false): RunTree;
export declare function getCurrentRunTree(permitAbsentRunTree: boolean): RunTree | undefined;
export declare function withRunTree<Fn extends (...args: any[]) => any>(runTree: RunTree, fn: Fn): Promise<Awaited<ReturnType<Fn>>>;
export declare const ROOT: unique symbol;
export declare function isTraceableFunction(x: unknown): x is TraceableFunction<any>;
export type { TraceableFunction } from "./types.js";
