import { BaseStore } from "@langchain/langgraph-checkpoint";
import { RunnableConfig, RunnableInterface } from "@langchain/core/runnables";

//#region src/pregel/runnable_types.d.ts
type RunnableFunc$1<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> = (input: RunInput, options: CallOptions) => RunOutput | Promise<RunOutput>;
type RunnableMapLike<RunInput, RunOutput> = { [K in keyof RunOutput]: RunnableLike$1<RunInput, RunOutput[K]> };
type RunnableLike$1<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> = RunnableInterface<RunInput, RunOutput, CallOptions> | RunnableFunc$1<RunInput, RunOutput, CallOptions> | RunnableMapLike<RunInput, RunOutput>;
type IsEqual<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
interface Runtime<ContextType = Record<string, unknown>, InterruptType = unknown, WriterType = unknown> {
  configurable?: ContextType;
  /** User provided context */
  context?: ContextType;
  /** Persistent key-value store */
  store?: BaseStore;
  /** Callback to send custom data chunks via the `custom` stream mode */
  writer: IsEqual<WriterType, unknown> extends true ? (chunk: unknown) => void : WriterType;
  /**
   * Interrupts the execution of a graph node.
   *
   * This function can be used to pause execution of a node, and return the value of the `resume`
   * input when the graph is re-invoked using `Command`.
   * Multiple interrupts can be called within a single node, and each will be handled sequentially.
   *
   * When an interrupt is called:
   * 1. If there's a `resume` value available (from a previous `Command`), it returns that value.
   * 2. Otherwise, it throws a `GraphInterrupt` with the provided value
   * 3. The graph can be resumed by passing a `Command` with a `resume` value
   *
   * Because the `interrupt` function propagates by throwing a special `GraphInterrupt` error,
   * you should avoid using `try/catch` blocks around the `interrupt` function,
   * or if you do, ensure that the `GraphInterrupt` error is thrown again within your `catch` block.
   *
   * @param value - The value to include in the interrupt.
   * @returns The `resume` value provided when the graph is re-invoked with a Command.
   */
  interrupt: IsEqual<InterruptType, unknown> extends true ? (value: unknown) => unknown : InterruptType;
  /** Abort signal to cancel the run. */
  signal: AbortSignal;
}
interface LangGraphRunnableConfig<ContextType extends Record<string, any> = Record<string, any>> extends RunnableConfig<ContextType>, Partial<Runtime<ContextType, unknown, unknown>> {}
//#endregion
export { LangGraphRunnableConfig, RunnableLike$1 as RunnableLike, Runtime };
//# sourceMappingURL=runnable_types.d.ts.map