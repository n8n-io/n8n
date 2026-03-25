import { RunnableConfig } from "../../runnables/types.cjs";

//#region src/callbacks/dispatch/index.d.ts
/**
 * Dispatch a custom event.
 *
 * Note: this method is only supported in non-web environments
 * due to usage of async_hooks to infer config.
 *
 * If you are using this method in the browser, please import and use
 * from "@langchain/core/callbacks/dispatch/web".
 *
 * @param name The name of the custom event.
 * @param payload The data for the custom event.
 *   Ideally should be JSON serializable to avoid serialization issues downstream, but not enforced.
 * @param config Optional config object.
 *
 * @example
 * ```typescript
 * import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
 *
 * const foo = RunnableLambda.from(async (input: string) => {
 *   await dispatchCustomEvent("my_custom_event", { arbitraryField: "someval" });
 *   return input;
 * });
 *
 * const callbacks = [{
 *   handleCustomEvent: (eventName: string, payload: any) => {
 *     // Logs "my_custom_event" and { arbitraryField: "someval" }
 *     console.log(eventName, payload);
 *   }
 * }];
 *
 * await foo.invoke("hi", { callbacks })
 * ```
 */
declare function dispatchCustomEvent(eventName: string, payload: any, config?: RunnableConfig): Promise<void>;
//#endregion
export { dispatchCustomEvent };
//# sourceMappingURL=index.d.cts.map