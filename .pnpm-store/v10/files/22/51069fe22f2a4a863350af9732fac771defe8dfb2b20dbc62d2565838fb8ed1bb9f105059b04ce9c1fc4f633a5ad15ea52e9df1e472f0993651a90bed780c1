import { LangGraphRunnableConfig } from "../pregel/runnable_types.cjs";

//#region src/func/types.d.ts

/**
 * Allows the entrypoint function to return a value to the caller, as well as a separate state value to persist to the checkpoint
 */
type EntrypointFinal<ValueT, SaveT> = {
  /**
   * The value to return to the caller
   */
  value?: ValueT;
  /**
   * The value to save to the checkpoint
   */
  save?: SaveT;
  __lg_type: "__pregel_final";
};
/**
 * Checks if a value is an EntrypointFinal - use this instead of `instanceof`, as value may have been deserialized
 * @param value The value to check
 * @returns Whether the value is an EntrypointFinal
 */

/**
 * The return type of an entrypoint function.
 */
type EntrypointReturnT<OutputT> = OutputT extends EntrypointFinal<infer ValueT, unknown> | Promise<EntrypointFinal<infer ValueT, unknown>> ? ValueT : OutputT;
/**
 * The value to be saved when a function returns an EntrypointFinal.
 */
type EntrypointFinalSaveT<OutputT> = OutputT extends EntrypointFinal<unknown, infer SaveT> | Promise<EntrypointFinal<unknown, infer SaveT>> ? SaveT : OutputT;
/**
 * The value to be returned when a function returns an EntrypointFinal.
 */

/**
 * Checks if an AsyncGenerator exists in the ES target/lib that we're compiling to.
 *
 * This is necessary because `tsc --init` targets ES2016 by default, which doesn't include AsyncGenerators.
 *
 * This works because when `skipLibCheck` is true (and it is in the default `tsconfig.json` created by `tsc --init`),
 * TypeScript will replace any unresolved library types with `any`. So, when `AsyncGenerator` doesn't exist, this checks
 * if `any` extends `object`, which it doesn't. When that happens, this type resolves to the `false` literal, and we can
 * use it in the type predicates below to skip over the AsyncGenerator-specific logic.
 *
 * If we didn't have this, then the types below would be checking if the user's function extends `any` in place of the
 * `AsyncGenerator` type, and the type predicate would branch to `never`, disallowing any valid function from being passed
 * to `task` or `entrypoint`.
 */
type AsyncGeneratorExists = AsyncGenerator<unknown, unknown, unknown> extends object ? true : false;
/**
 * Matches valid function signatures for entrypoints. Disallows generator functions.
 */
type EntrypointFunc<InputT, OutputT> = [OutputT] extends never ? (input: InputT, config: LangGraphRunnableConfig) => never : AsyncGeneratorExists extends true // only check if it may be an AsyncGenerator when those actually exist
? OutputT extends AsyncGenerator<unknown, unknown, unknown> ? never : OutputT extends Generator<unknown, unknown, unknown> ? never : (input: InputT, config: LangGraphRunnableConfig) => OutputT : OutputT extends Generator<unknown, unknown, unknown> ? never : (input: InputT, config: LangGraphRunnableConfig) => OutputT;
/**
 * Matches valid function signatures for tasks. Disallows generator functions.
 */
type TaskFunc<ArgsT extends unknown[], OutputT> = [OutputT] extends [never] ? (...args: ArgsT) => never : AsyncGeneratorExists extends true // only check if it may be an AsyncGenerator when those actually exist
? OutputT extends AsyncGenerator<unknown, unknown, unknown> ? never : OutputT extends Generator<unknown, unknown, unknown> ? never : (...args: ArgsT) => OutputT : OutputT extends Generator<unknown, unknown, unknown> ? never : (...args: ArgsT) => OutputT;
//#endregion
export { EntrypointFinal, EntrypointFinalSaveT, EntrypointFunc, EntrypointReturnT, TaskFunc };
//# sourceMappingURL=types.d.cts.map