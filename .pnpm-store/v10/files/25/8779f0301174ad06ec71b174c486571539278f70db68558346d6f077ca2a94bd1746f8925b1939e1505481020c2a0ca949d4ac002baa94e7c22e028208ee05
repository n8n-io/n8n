import { CallbackManager } from "../callbacks/manager.js";
import { RunnableConfig } from "./types.js";

//#region src/runnables/config.d.ts
declare function getCallbackManagerForConfig(config?: RunnableConfig): Promise<CallbackManager | undefined>;
declare function mergeConfigs<CallOptions extends RunnableConfig>(...configs: (CallOptions | RunnableConfig | undefined | null)[]): Partial<CallOptions>;
/**
 * Ensure that a passed config is an object with all required keys present.
 */
declare function ensureConfig<CallOptions extends RunnableConfig>(config?: CallOptions): CallOptions;
/**
 * Helper function that patches runnable configs with updated properties.
 */
declare function patchConfig<CallOptions extends RunnableConfig>(config?: Partial<CallOptions>, {
  callbacks,
  maxConcurrency,
  recursionLimit,
  runName,
  configurable,
  runId
}?: RunnableConfig): Partial<CallOptions>;
declare function pickRunnableConfigKeys<CallOptions extends Record<string, any>>(config?: CallOptions): Partial<RunnableConfig> | undefined;
//#endregion
export { ensureConfig, getCallbackManagerForConfig, mergeConfigs, patchConfig, pickRunnableConfigKeys };
//# sourceMappingURL=config.d.ts.map