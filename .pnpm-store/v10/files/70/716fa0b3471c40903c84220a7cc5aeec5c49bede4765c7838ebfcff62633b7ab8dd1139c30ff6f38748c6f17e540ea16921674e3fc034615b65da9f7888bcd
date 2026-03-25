import { BaseCallbackHandler } from "../../callbacks/base.js";

//#region src/singletons/async_local_storage/context.d.ts
/**
 * Set a context variable. Context variables are scoped to any
 * child runnables called by the current runnable, or globally if set outside
 * of any runnable.
 *
 * @remarks
 * This function is only supported in environments that support AsyncLocalStorage,
 * including Node.js, Deno, and Cloudflare Workers.
 *
 * @example
 * ```ts
 * import { RunnableLambda } from "@langchain/core/runnables";
 * import {
 *   getContextVariable,
 *   setContextVariable
 * } from "@langchain/core/context";
 *
 * const nested = RunnableLambda.from(() => {
 *   // "bar" because it was set by a parent
 *   console.log(getContextVariable("foo"));
 *
 *   // Override to "baz", but only for child runnables
 *   setContextVariable("foo", "baz");
 *
 *   // Now "baz", but only for child runnables
 *   return getContextVariable("foo");
 * });
 *
 * const runnable = RunnableLambda.from(async () => {
 *   // Set a context variable named "foo"
 *   setContextVariable("foo", "bar");
 *
 *   const res = await nested.invoke({});
 *
 *   // Still "bar" since child changes do not affect parents
 *   console.log(getContextVariable("foo"));
 *
 *   return res;
 * });
 *
 * // undefined, because context variable has not been set yet
 * console.log(getContextVariable("foo"));
 *
 * // Final return value is "baz"
 * const result = await runnable.invoke({});
 * ```
 *
 * @param name The name of the context variable.
 * @param value The value to set.
 */
declare function setContextVariable<T>(name: PropertyKey, value: T): void;
/**
 * Get the value of a previously set context variable. Context variables
 * are scoped to any child runnables called by the current runnable,
 * or globally if set outside of any runnable.
 *
 * @remarks
 * This function is only supported in environments that support AsyncLocalStorage,
 * including Node.js, Deno, and Cloudflare Workers.
 *
 * @example
 * ```ts
 * import { RunnableLambda } from "@langchain/core/runnables";
 * import {
 *   getContextVariable,
 *   setContextVariable
 * } from "@langchain/core/context";
 *
 * const nested = RunnableLambda.from(() => {
 *   // "bar" because it was set by a parent
 *   console.log(getContextVariable("foo"));
 *
 *   // Override to "baz", but only for child runnables
 *   setContextVariable("foo", "baz");
 *
 *   // Now "baz", but only for child runnables
 *   return getContextVariable("foo");
 * });
 *
 * const runnable = RunnableLambda.from(async () => {
 *   // Set a context variable named "foo"
 *   setContextVariable("foo", "bar");
 *
 *   const res = await nested.invoke({});
 *
 *   // Still "bar" since child changes do not affect parents
 *   console.log(getContextVariable("foo"));
 *
 *   return res;
 * });
 *
 * // undefined, because context variable has not been set yet
 * console.log(getContextVariable("foo"));
 *
 * // Final return value is "baz"
 * const result = await runnable.invoke({});
 * ```
 *
 * @param name The name of the context variable.
 */
declare function getContextVariable<T = any>(name: PropertyKey): T | undefined;
/**
 * Register a callback configure hook to automatically add callback handlers to all runs.
 *
 * There are two ways to use this:
 *
 * 1. Using a context variable:
 *    - Set `contextVar` to specify the variable name
 *    - Use `setContextVariable()` to store your handler instance
 *
 * 2. Using an environment variable:
 *    - Set both `envVar` and `handlerClass`
 *    - The handler will be instantiated when the env var is set to "true".
 *
 * @example
 * ```typescript
 * // Method 1: Using context variable
 * import {
 *   registerConfigureHook,
 *   setContextVariable
 * } from "@langchain/core/context";
 *
 * const tracer = new MyCallbackHandler();
 * registerConfigureHook({
 *   contextVar: "my_tracer",
 * });
 * setContextVariable("my_tracer", tracer);
 *
 * // ...run code here
 *
 * // Method 2: Using environment variable
 * registerConfigureHook({
 *   handlerClass: MyCallbackHandler,
 *   envVar: "MY_TRACER_ENABLED",
 * });
 * process.env.MY_TRACER_ENABLED = "true";
 *
 * // ...run code here
 * ```
 *
 * @param config Configuration object for the hook
 * @param config.contextVar Name of the context variable containing the handler instance
 * @param config.inheritable Whether child runs should inherit this handler
 * @param config.handlerClass Optional callback handler class (required if using envVar)
 * @param config.envVar Optional environment variable name to control handler activation
 */
declare const registerConfigureHook: (config: ConfigureHook) => void;
type ConfigureHook = {
  contextVar?: string;
  inheritable?: boolean;
  handlerClass?: new (...args: any[]) => BaseCallbackHandler;
  envVar?: string;
};
//#endregion
export { ConfigureHook, getContextVariable, registerConfigureHook, setContextVariable };
//# sourceMappingURL=context.d.ts.map