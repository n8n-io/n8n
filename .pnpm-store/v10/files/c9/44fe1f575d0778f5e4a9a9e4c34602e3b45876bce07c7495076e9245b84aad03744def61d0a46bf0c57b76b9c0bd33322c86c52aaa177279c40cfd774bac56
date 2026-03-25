import { RunnableConfig } from "../../runnables/types.cjs";

//#region src/callbacks/dispatch/web.d.ts
/**
 * Dispatch a custom event. Requires an explicit config object.
 * @param name The name of the custom event.
 * @param payload The data for the custom event.
 *   Ideally should be JSON serializable to avoid serialization issues downstream, but not enforced.
 * @param config Config object.
 *
 * @example
 * ```typescript
 * import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
 *
 * const foo = RunnableLambda.from(async (input: string, config?: RunnableConfig) => {
 *   await dispatchCustomEvent(
 *     "my_custom_event",
 *     { arbitraryField: "someval" },
 *     config
 *   );
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
declare function dispatchCustomEvent(name: string, payload: any, config?: RunnableConfig): Promise<void>;
//#endregion
export { dispatchCustomEvent };
//# sourceMappingURL=web.d.cts.map