import { RunnableBatchOptions, RunnableConfig } from "./types.cjs";
import { IterableReadableStream } from "../utils/stream.cjs";
import { Runnable } from "./base.cjs";

//#region src/runnables/router.d.ts
type RouterInput = {
  key: string;
  input: any;
};
/**
 * A runnable that routes to a set of runnables based on Input['key'].
 * Returns the output of the selected runnable.
 * @example
 * ```typescript
 * import { RouterRunnable, RunnableLambda } from "@langchain/core/runnables";
 *
 * const router = new RouterRunnable({
 *   runnables: {
 *     toUpperCase: RunnableLambda.from((text: string) => text.toUpperCase()),
 *     reverseText: RunnableLambda.from((text: string) =>
 *       text.split("").reverse().join("")
 *     ),
 *   },
 * });
 *
 * // Invoke the 'reverseText' runnable
 * const result1 = router.invoke({ key: "reverseText", input: "Hello World" });
 *
 * // "dlroW olleH"
 *
 * // Invoke the 'toUpperCase' runnable
 * const result2 = router.invoke({ key: "toUpperCase", input: "Hello World" });
 *
 * // "HELLO WORLD"
 * ```
 */
declare class RouterRunnable<RunInput extends RouterInput, RunnableInput, RunOutput> extends Runnable<RunInput, RunOutput> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  runnables: Record<string, Runnable<RunnableInput, RunOutput>>;
  constructor(fields: {
    runnables: Record<string, Runnable<RunnableInput, RunOutput>>;
  });
  invoke(input: RunInput, options?: Partial<RunnableConfig>): Promise<RunOutput>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
  stream(input: RunInput, options?: Partial<RunnableConfig>): Promise<IterableReadableStream<RunOutput>>;
}
//#endregion
export { RouterInput, RouterRunnable };
//# sourceMappingURL=router.d.cts.map