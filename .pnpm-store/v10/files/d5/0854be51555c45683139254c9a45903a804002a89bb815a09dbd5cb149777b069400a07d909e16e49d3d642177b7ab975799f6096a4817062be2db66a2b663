import { SerializableInterface } from "../load/serializable.js";
import { InteropZodType } from "../utils/types/zod.js";
import { BaseCallbackConfig } from "../callbacks/manager.js";
import { IterableReadableStreamInterface } from "../types/_internal.js";

//#region src/runnables/types.d.ts
type RunnableBatchOptions = {
  /** @deprecated Pass in via the standard runnable config object instead */maxConcurrency?: number;
  returnExceptions?: boolean;
};
type RunnableIOSchema = {
  name?: string;
  schema: InteropZodType;
};
/**
 * Base interface implemented by all runnables.
 * Used for cross-compatibility between different versions of LangChain core.
 *
 * Should not change on patch releases.
 */
interface RunnableInterface<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> extends SerializableInterface {
  lc_serializable: boolean;
  invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
  stream(input: RunInput, options?: Partial<CallOptions>): Promise<IterableReadableStreamInterface<RunOutput>>;
  transform(generator: AsyncGenerator<RunInput>, options: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  getName(suffix?: string): string;
}
interface Edge {
  source: string;
  target: string;
  data?: string;
  conditional?: boolean;
}
interface Node {
  id: string;
  name: string;
  data: RunnableIOSchema | RunnableInterface;
  metadata?: Record<string, any>;
}
interface RunnableConfig<ConfigurableFieldType extends Record<string, any> = Record<string, any>> extends BaseCallbackConfig {
  /**
   * Runtime values for attributes previously made configurable on this Runnable,
   * or sub-Runnables.
   */
  configurable?: ConfigurableFieldType;
  /**
   * Maximum number of times a call can recurse. If not provided, defaults to 25.
   */
  recursionLimit?: number;
  /** Maximum number of parallel calls to make. */
  maxConcurrency?: number;
  /**
   * Timeout for this call in milliseconds.
   */
  timeout?: number;
  /**
   * Abort signal for this call.
   * If provided, the call will be aborted when the signal is aborted.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
   */
  signal?: AbortSignal;
}
//#endregion
export { Edge, Node, RunnableBatchOptions, RunnableConfig, RunnableIOSchema, RunnableInterface };
//# sourceMappingURL=types.d.ts.map