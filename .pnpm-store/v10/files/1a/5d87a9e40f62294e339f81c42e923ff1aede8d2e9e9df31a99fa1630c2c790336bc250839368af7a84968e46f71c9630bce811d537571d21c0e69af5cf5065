import { LangGraphRunnableConfig } from "../runnable_types.cjs";
import { BaseStore } from "@langchain/langgraph-checkpoint";
import { RunnableConfig } from "@langchain/core/runnables";

//#region src/pregel/utils/config.d.ts

/**
 * A helper utility function that returns the {@link BaseStore} that was set when the graph was initialized
 *
 * @returns a reference to the {@link BaseStore} that was set when the graph was initialized
 */
declare function getStore(config?: LangGraphRunnableConfig): BaseStore | undefined;
/**
 * A helper utility function that returns the {@link LangGraphRunnableConfig#writer} if "custom" stream mode is enabled, otherwise undefined.
 *
 * @returns a reference to the {@link LangGraphRunnableConfig#writer} if "custom" stream mode is enabled, otherwise undefined
 */
declare function getWriter(config?: LangGraphRunnableConfig): ((chunk: unknown) => void) | undefined;
/**
 * A helper utility function that returns the {@link LangGraphRunnableConfig} that was set when the graph was initialized.
 *
 * Note: This only works when running in an environment that supports node:async_hooks and AsyncLocalStorage. If you're running this in a
 * web environment, access the LangGraphRunnableConfig from the node function directly.
 *
 * @returns the {@link LangGraphRunnableConfig} that was set when the graph was initialized
 */
declare function getConfig(): LangGraphRunnableConfig;
/**
 * A helper utility function that returns the input for the currently executing task
 *
 * @returns the input for the currently executing task
 */
declare function getCurrentTaskInput<T = unknown>(config?: LangGraphRunnableConfig): T;
//#endregion
export { getConfig, getCurrentTaskInput, getStore, getWriter };
//# sourceMappingURL=config.d.cts.map