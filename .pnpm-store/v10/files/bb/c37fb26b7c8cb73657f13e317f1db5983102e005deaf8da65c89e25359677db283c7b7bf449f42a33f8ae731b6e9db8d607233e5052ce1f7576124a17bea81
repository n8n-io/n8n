import { Serializable } from "../load/serializable.cjs";
import { ToolCall } from "../messages/tool.cjs";
import { InferInteropZodOutput, InteropZodType } from "../utils/types/zod.cjs";
import { CallbackManagerForChainRun } from "../callbacks/manager.cjs";
import { RunnableBatchOptions, RunnableConfig, RunnableInterface } from "./types.cjs";
import { Run } from "../tracers/base.cjs";
import { IterableReadableStream } from "../utils/stream.cjs";
import { EventStreamCallbackHandlerInput, StreamEvent } from "../tracers/event_stream.cjs";
import { LogStreamCallbackHandler, LogStreamCallbackHandlerInput, RunLogPatch } from "../tracers/log_stream.cjs";
import { Graph } from "./graph.cjs";
import { TraceableFunction } from "langsmith/singletons/traceable";

//#region src/runnables/base.d.ts
type RunnableFunc<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> = (input: RunInput, options: CallOptions | Record<string, any> | (Record<string, any> & CallOptions)) => RunOutput | Promise<RunOutput>;
type RunnableMapLike<RunInput, RunOutput> = { [K in keyof RunOutput]: RunnableLike<RunInput, RunOutput[K]> };
type RunnableLike<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> = RunnableInterface<RunInput, RunOutput, CallOptions> | RunnableFunc<RunInput, RunOutput, CallOptions> | RunnableMapLike<RunInput, RunOutput>;
type RunnableRetryFailedAttemptHandler = (error: any, input: any) => any;
/**
 * A Runnable is a generic unit of work that can be invoked, batched, streamed, and/or
 * transformed.
 */
declare abstract class Runnable<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> extends Serializable implements RunnableInterface<RunInput, RunOutput, CallOptions> {
  protected lc_runnable: boolean;
  name?: string;
  getName(suffix?: string): string;
  abstract invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  /**
   * Add retry logic to an existing runnable.
   * @param fields.stopAfterAttempt The number of attempts to retry.
   * @param fields.onFailedAttempt A function that is called when a retry fails.
   * @returns A new RunnableRetry that, when invoked, will retry according to the parameters.
   */
  withRetry(fields?: {
    stopAfterAttempt?: number;
    onFailedAttempt?: RunnableRetryFailedAttemptHandler;
  }): RunnableRetry<RunInput, RunOutput, CallOptions>;
  /**
   * Bind config to a Runnable, returning a new Runnable.
   * @param config New configuration parameters to attach to the new runnable.
   * @returns A new RunnableBinding with a config matching what's passed.
   */
  withConfig(config: Partial<CallOptions>): Runnable<RunInput, RunOutput, CallOptions>;
  /**
   * Create a new runnable from the current one that will try invoking
   * other passed fallback runnables if the initial invocation fails.
   * @param fields.fallbacks Other runnables to call if the runnable errors.
   * @returns A new RunnableWithFallbacks.
   */
  withFallbacks(fields: {
    fallbacks: Runnable<RunInput, RunOutput>[];
  } | Runnable<RunInput, RunOutput>[]): RunnableWithFallbacks<RunInput, RunOutput>;
  protected _getOptionsList<O extends CallOptions & {
    runType?: string;
  }>(options: Partial<O> | Partial<O>[], length?: number): Partial<O>[];
  /**
   * Default implementation of batch, which calls invoke N times.
   * Subclasses should override this method if they can batch more efficiently.
   * @param inputs Array of inputs to each batch call.
   * @param options Either a single call options object to apply to each batch call or an array for each call.
   * @param batchOptions.returnExceptions Whether to return errors rather than throwing on the first one
   * @returns An array of RunOutputs, or mixed RunOutputs and errors if batchOptions.returnExceptions is set
   */
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
  /**
   * Default streaming implementation.
   * Subclasses should override this method if they support streaming output.
   * @param input
   * @param options
   */
  _streamIterator(input: RunInput, options?: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  /**
   * Stream output in chunks.
   * @param input
   * @param options
   * @returns A readable stream that is also an iterable.
   */
  stream(input: RunInput, options?: Partial<CallOptions>): Promise<IterableReadableStream<RunOutput>>;
  protected _separateRunnableConfigFromCallOptions(options?: Partial<CallOptions>): [RunnableConfig, Omit<Partial<CallOptions>, keyof RunnableConfig>];
  protected _callWithConfig<T extends RunInput>(func: ((input: T) => Promise<RunOutput>) | ((input: T, config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun) => Promise<RunOutput>), input: T, options?: Partial<CallOptions> & {
    runType?: string;
  }): Promise<RunOutput>;
  /**
   * Internal method that handles batching and configuration for a runnable
   * It takes a function, input values, and optional configuration, and
   * returns a promise that resolves to the output values.
   * @param func The function to be executed for each input value.
   * @param input The input values to be processed.
   * @param config Optional configuration for the function execution.
   * @returns A promise that resolves to the output values.
   */
  _batchWithConfig<T extends RunInput>(func: (inputs: T[], options?: Partial<CallOptions>[], runManagers?: (CallbackManagerForChainRun | undefined)[], batchOptions?: RunnableBatchOptions) => Promise<(RunOutput | Error)[]>, inputs: T[], options?: Partial<CallOptions & {
    runType?: string;
  }> | Partial<CallOptions & {
    runType?: string;
  }>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
  /** @internal */
  _concatOutputChunks<O>(first: O, second: O): O;
  /**
   * Helper method to transform an Iterator of Input values into an Iterator of
   * Output values, with callbacks.
   * Use this to implement `stream()` or `transform()` in Runnable subclasses.
   */
  protected _transformStreamWithConfig<I extends RunInput, O extends RunOutput>(inputGenerator: AsyncGenerator<I>, transformer: (generator: AsyncGenerator<I>, runManager?: CallbackManagerForChainRun, options?: Partial<CallOptions>) => AsyncGenerator<O>, options?: Partial<CallOptions> & {
    runType?: string;
  }): AsyncGenerator<O>;
  getGraph(_?: RunnableConfig): Graph;
  /**
   * Create a new runnable sequence that runs each individual runnable in series,
   * piping the output of one runnable into another runnable or runnable-like.
   * @param coerceable A runnable, function, or object whose values are functions or runnables.
   * @returns A new runnable sequence.
   */
  pipe<NewRunOutput>(coerceable: RunnableLike<RunOutput, NewRunOutput>): Runnable<RunInput, Exclude<NewRunOutput, Error>>;
  /**
   * Pick keys from the dict output of this runnable. Returns a new runnable.
   */
  pick(keys: string | string[]): Runnable;
  /**
   * Assigns new fields to the dict output of this runnable. Returns a new runnable.
   */
  assign(mapping: RunnableMapLike<Record<string, unknown>, Record<string, unknown>>): Runnable;
  /**
   * Default implementation of transform, which buffers input and then calls stream.
   * Subclasses should override this method if they can start producing output while
   * input is still being generated.
   * @param generator
   * @param options
   */
  transform(generator: AsyncGenerator<RunInput>, options: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  /**
   * Stream all output from a runnable, as reported to the callback system.
   * This includes all inner runs of LLMs, Retrievers, Tools, etc.
   * Output is streamed as Log objects, which include a list of
   * jsonpatch ops that describe how the state of the run has changed in each
   * step, and the final state of the run.
   * The jsonpatch ops can be applied in order to construct state.
   * @param input
   * @param options
   * @param streamOptions
   */
  streamLog(input: RunInput, options?: Partial<CallOptions>, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): AsyncGenerator<RunLogPatch>;
  protected _streamLog(input: RunInput, logStreamCallbackHandler: LogStreamCallbackHandler, config: Partial<CallOptions>): AsyncGenerator<RunLogPatch>;
  /**
   * Generate a stream of events emitted by the internal steps of the runnable.
   *
   * Use to create an iterator over StreamEvents that provide real-time information
   * about the progress of the runnable, including StreamEvents from intermediate
   * results.
   *
   * A StreamEvent is a dictionary with the following schema:
   *
   * - `event`: string - Event names are of the format: on_[runnable_type]_(start|stream|end).
   * - `name`: string - The name of the runnable that generated the event.
   * - `run_id`: string - Randomly generated ID associated with the given execution of
   *   the runnable that emitted the event. A child runnable that gets invoked as part of the execution of a
   *   parent runnable is assigned its own unique ID.
   * - `tags`: string[] - The tags of the runnable that generated the event.
   * - `metadata`: Record<string, any> - The metadata of the runnable that generated the event.
   * - `data`: Record<string, any>
   *
   * Below is a table that illustrates some events that might be emitted by various
   * chains. Metadata fields have been omitted from the table for brevity.
   * Chain definitions have been included after the table.
   *
   * **ATTENTION** This reference table is for the V2 version of the schema.
   *
   * ```md
   * +----------------------+-----------------------------+------------------------------------------+
   * | event                | input                       | output/chunk                             |
   * +======================+=============================+==========================================+
   * | on_chat_model_start  | {"messages": BaseMessage[]} |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_chat_model_stream |                             | AIMessageChunk("hello")                  |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_chat_model_end    | {"messages": BaseMessage[]} | AIMessageChunk("hello world")            |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_llm_start         | {'input': 'hello'}          |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_llm_stream        |                             | 'Hello'                                  |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_llm_end           | 'Hello human!'              |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_chain_start       |                             |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_chain_stream      |                             | "hello world!"                           |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_chain_end         | [Document(...)]             | "hello world!, goodbye world!"           |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_tool_start        | {"x": 1, "y": "2"}          |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_tool_end          |                             | {"x": 1, "y": "2"}                       |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_retriever_start   | {"query": "hello"}          |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_retriever_end     | {"query": "hello"}          | [Document(...), ..]                      |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_prompt_start      | {"question": "hello"}       |                                          |
   * +----------------------+-----------------------------+------------------------------------------+
   * | on_prompt_end        | {"question": "hello"}       | ChatPromptValue(messages: BaseMessage[]) |
   * +----------------------+-----------------------------+------------------------------------------+
   * ```
   *
   * The "on_chain_*" events are the default for Runnables that don't fit one of the above categories.
   *
   * In addition to the standard events above, users can also dispatch custom events.
   *
   * Custom events will be only be surfaced with in the `v2` version of the API!
   *
   * A custom event has following format:
   *
   * ```md
   * +-----------+------+------------------------------------------------------------+
   * | Attribute | Type | Description                                                |
   * +===========+======+============================================================+
   * | name      | str  | A user defined name for the event.                         |
   * +-----------+------+------------------------------------------------------------+
   * | data      | Any  | The data associated with the event. This can be anything.  |
   * +-----------+------+------------------------------------------------------------+
   * ```
   *
   * Here's an example:
   *
   * ```ts
   * import { RunnableLambda } from "@langchain/core/runnables";
   * import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
   * // Use this import for web environments that don't support "async_hooks"
   * // and manually pass config to child runs.
   * // import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch/web";
   *
   * const slowThing = RunnableLambda.from(async (someInput: string) => {
   *   // Placeholder for some slow operation
   *   await new Promise((resolve) => setTimeout(resolve, 100));
   *   await dispatchCustomEvent("progress_event", {
   *    message: "Finished step 1 of 2",
   *  });
   *  await new Promise((resolve) => setTimeout(resolve, 100));
   *  return "Done";
   * });
   *
   * const eventStream = await slowThing.streamEvents("hello world", {
   *   version: "v2",
   * });
   *
   * for await (const event of eventStream) {
   *  if (event.event === "on_custom_event") {
   *    console.log(event);
   *  }
   * }
   * ```
   */
  streamEvents(input: RunInput, options: Partial<CallOptions> & {
    version: "v1" | "v2";
  }, streamOptions?: Omit<EventStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<StreamEvent>;
  streamEvents(input: RunInput, options: Partial<CallOptions> & {
    version: "v1" | "v2";
    encoding: "text/event-stream";
  }, streamOptions?: Omit<EventStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<Uint8Array>;
  private _streamEventsV2;
  private _streamEventsV1;
  static isRunnable(thing: any): thing is Runnable;
  /**
   * Bind lifecycle listeners to a Runnable, returning a new Runnable.
   * The Run object contains information about the run, including its id,
   * type, input, output, error, startTime, endTime, and any tags or metadata
   * added to the run.
   *
   * @param {Object} params - The object containing the callback functions.
   * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
   * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
   * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
   */
  withListeners({
    onStart,
    onEnd,
    onError
  }: {
    onStart?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    onEnd?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    onError?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
  }): Runnable<RunInput, RunOutput, CallOptions>;
  /**
   * Convert a runnable to a tool. Return a new instance of `RunnableToolLike`
   * which contains the runnable, name, description and schema.
   *
   * @template {T extends RunInput = RunInput} RunInput - The input type of the runnable. Should be the same as the `RunInput` type of the runnable.
   *
   * @param fields
   * @param {string | undefined} [fields.name] The name of the tool. If not provided, it will default to the name of the runnable.
   * @param {string | undefined} [fields.description] The description of the tool. Falls back to the description on the Zod schema if not provided, or undefined if neither are provided.
   * @param {z.ZodType<T>} [fields.schema] The Zod schema for the input of the tool. Infers the Zod type from the input type of the runnable.
   * @returns {RunnableToolLike<z.ZodType<T>, RunOutput>} An instance of `RunnableToolLike` which is a runnable that can be used as a tool.
   */
  asTool<T extends RunInput = RunInput>(fields: {
    name?: string;
    description?: string;
    schema: InteropZodType<T>;
  }): RunnableToolLike<InteropZodType<T | ToolCall>, RunOutput>;
}
type RunnableBindingArgs<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> = {
  bound: Runnable<RunInput, RunOutput, CallOptions>; /** @deprecated Use {@link config} instead. */
  kwargs?: Partial<CallOptions>;
  config: RunnableConfig;
  configFactories?: Array<(config: RunnableConfig) => RunnableConfig | Promise<RunnableConfig>>;
};
/**
 * Wraps a runnable and applies partial config upon invocation.
 *
 * @example
 * ```typescript
 * import {
 *   type RunnableConfig,
 *   RunnableLambda,
 * } from "@langchain/core/runnables";
 *
 * const enhanceProfile = (
 *   profile: Record<string, any>,
 *   config?: RunnableConfig
 * ) => {
 *   if (config?.configurable?.role) {
 *     return { ...profile, role: config.configurable.role };
 *   }
 *   return profile;
 * };
 *
 * const runnable = RunnableLambda.from(enhanceProfile);
 *
 * // Bind configuration to the runnable to set the user's role dynamically
 * const adminRunnable = runnable.withConfig({ configurable: { role: "Admin" } });
 * const userRunnable = runnable.withConfig({ configurable: { role: "User" } });
 *
 * const result1 = await adminRunnable.invoke({
 *   name: "Alice",
 *   email: "alice@example.com"
 * });
 *
 * // { name: "Alice", email: "alice@example.com", role: "Admin" }
 *
 * const result2 = await userRunnable.invoke({
 *   name: "Bob",
 *   email: "bob@example.com"
 * });
 *
 * // { name: "Bob", email: "bob@example.com", role: "User" }
 * ```
 */
declare class RunnableBinding<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> extends Runnable<RunInput, RunOutput, CallOptions> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  bound: Runnable<RunInput, RunOutput, CallOptions>;
  config: RunnableConfig;
  kwargs?: Partial<CallOptions>;
  configFactories?: Array<(config: RunnableConfig) => RunnableConfig | Promise<RunnableConfig>>;
  constructor(fields: RunnableBindingArgs<RunInput, RunOutput, CallOptions>);
  getName(suffix?: string | undefined): string;
  _mergeConfig(...options: (Partial<CallOptions> | RunnableConfig | undefined)[]): Promise<Partial<CallOptions>>;
  withConfig(config: Partial<CallOptions>): Runnable<RunInput, RunOutput, CallOptions>;
  withRetry(fields?: {
    stopAfterAttempt?: number;
    onFailedAttempt?: RunnableRetryFailedAttemptHandler;
  }): RunnableRetry<RunInput, RunOutput, CallOptions>;
  invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
  /** @internal */
  _concatOutputChunks<O>(first: O, second: O): O;
  _streamIterator(input: RunInput, options?: Partial<CallOptions> | undefined): AsyncGenerator<Awaited<RunOutput>, void, any>;
  stream(input: RunInput, options?: Partial<CallOptions> | undefined): Promise<IterableReadableStream<RunOutput>>;
  transform(generator: AsyncGenerator<RunInput>, options?: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  streamEvents(input: RunInput, options: Partial<CallOptions> & {
    version: "v1" | "v2";
  }, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<StreamEvent>;
  streamEvents(input: RunInput, options: Partial<CallOptions> & {
    version: "v1" | "v2";
    encoding: "text/event-stream";
  }, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<Uint8Array>;
  static isRunnableBinding(thing: any): thing is RunnableBinding<any, any, any>;
  /**
   * Bind lifecycle listeners to a Runnable, returning a new Runnable.
   * The Run object contains information about the run, including its id,
   * type, input, output, error, startTime, endTime, and any tags or metadata
   * added to the run.
   *
   * @param {Object} params - The object containing the callback functions.
   * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
   * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
   * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
   */
  withListeners({
    onStart,
    onEnd,
    onError
  }: {
    onStart?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    onEnd?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    onError?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
  }): Runnable<RunInput, RunOutput, CallOptions>;
}
/**
 * A runnable that delegates calls to another runnable
 * with each element of the input sequence.
 * @example
 * ```typescript
 * import { RunnableEach, RunnableLambda } from "@langchain/core/runnables";
 *
 * const toUpperCase = (input: string): string => input.toUpperCase();
 * const addGreeting = (input: string): string => `Hello, ${input}!`;
 *
 * const upperCaseLambda = RunnableLambda.from(toUpperCase);
 * const greetingLambda = RunnableLambda.from(addGreeting);
 *
 * const chain = new RunnableEach({
 *   bound: upperCaseLambda.pipe(greetingLambda),
 * });
 *
 * const result = await chain.invoke(["alice", "bob", "carol"])
 *
 * // ["Hello, ALICE!", "Hello, BOB!", "Hello, CAROL!"]
 * ```
 */
declare class RunnableEach<RunInputItem, RunOutputItem, CallOptions extends RunnableConfig> extends Runnable<RunInputItem[], RunOutputItem[], CallOptions> {
  static lc_name(): string;
  lc_serializable: boolean;
  lc_namespace: string[];
  bound: Runnable<RunInputItem, RunOutputItem, CallOptions>;
  constructor(fields: {
    bound: Runnable<RunInputItem, RunOutputItem, CallOptions>;
  });
  /**
   * Invokes the runnable with the specified input and configuration.
   * @param input The input to invoke the runnable with.
   * @param config The configuration to invoke the runnable with.
   * @returns A promise that resolves to the output of the runnable.
   */
  invoke(inputs: RunInputItem[], config?: Partial<CallOptions>): Promise<RunOutputItem[]>;
  /**
   * A helper method that is used to invoke the runnable with the specified input and configuration.
   * @param input The input to invoke the runnable with.
   * @param config The configuration to invoke the runnable with.
   * @returns A promise that resolves to the output of the runnable.
   */
  protected _invoke(inputs: RunInputItem[], config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun): Promise<RunOutputItem[]>;
  /**
   * Bind lifecycle listeners to a Runnable, returning a new Runnable.
   * The Run object contains information about the run, including its id,
   * type, input, output, error, startTime, endTime, and any tags or metadata
   * added to the run.
   *
   * @param {Object} params - The object containing the callback functions.
   * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
   * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
   * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
   */
  withListeners({
    onStart,
    onEnd,
    onError
  }: {
    onStart?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    onEnd?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    onError?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
  }): Runnable<any, any, CallOptions>;
}
/**
 * Base class for runnables that can be retried a
 * specified number of times.
 * @example
 * ```typescript
 * import {
 *   RunnableLambda,
 *   RunnableRetry,
 * } from "@langchain/core/runnables";
 *
 * // Simulate an API call that fails
 * const simulateApiCall = (input: string): string => {
 *   console.log(`Attempting API call with input: ${input}`);
 *   throw new Error("API call failed due to network issue");
 * };
 *
 * const apiCallLambda = RunnableLambda.from(simulateApiCall);
 *
 * // Apply retry logic using the .withRetry() method
 * const apiCallWithRetry = apiCallLambda.withRetry({ stopAfterAttempt: 3 });
 *
 * // Alternatively, create a RunnableRetry instance manually
 * const manualRetry = new RunnableRetry({
 *   bound: apiCallLambda,
 *   maxAttemptNumber: 3,
 *   config: {},
 * });
 *
 * // Example invocation using the .withRetry() method
 * const res = await apiCallWithRetry
 *   .invoke("Request 1")
 *   .catch((error) => {
 *     console.error("Failed after multiple retries:", error.message);
 *   });
 *
 * // Example invocation using the manual retry instance
 * const res2 = await manualRetry
 *   .invoke("Request 2")
 *   .catch((error) => {
 *     console.error("Failed after multiple retries:", error.message);
 *   });
 * ```
 */
declare class RunnableRetry<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> extends RunnableBinding<RunInput, RunOutput, CallOptions> {
  static lc_name(): string;
  lc_namespace: string[];
  protected maxAttemptNumber: number;
  onFailedAttempt: RunnableRetryFailedAttemptHandler;
  constructor(fields: RunnableBindingArgs<RunInput, RunOutput, CallOptions> & {
    maxAttemptNumber?: number;
    onFailedAttempt?: RunnableRetryFailedAttemptHandler;
  });
  _patchConfigForRetry(attempt: number, config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun): Partial<CallOptions>;
  protected _invoke(input: RunInput, config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun): Promise<RunOutput>;
  /**
   * Method that invokes the runnable with the specified input, run manager,
   * and config. It handles the retry logic by catching any errors and
   * recursively invoking itself with the updated config for the next retry
   * attempt.
   * @param input The input for the runnable.
   * @param runManager The run manager for the runnable.
   * @param config The config for the runnable.
   * @returns A promise that resolves to the output of the runnable.
   */
  invoke(input: RunInput, config?: Partial<CallOptions>): Promise<RunOutput>;
  _batch<ReturnExceptions extends boolean = false>(inputs: RunInput[], configs?: RunnableConfig[], runManagers?: (CallbackManagerForChainRun | undefined)[], batchOptions?: RunnableBatchOptions): Promise<ReturnExceptions extends false ? RunOutput[] : (RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
}
type RunnableSequenceFields<RunInput, RunOutput> = {
  first: Runnable<RunInput>;
  middle?: Runnable[];
  last: Runnable<any, RunOutput>;
  name?: string;
  omitSequenceTags?: boolean;
};
/**
 * A sequence of runnables, where the output of each is the input of the next.
 * @example
 * ```typescript
 * const promptTemplate = PromptTemplate.fromTemplate(
 *   "Tell me a joke about {topic}",
 * );
 * const chain = RunnableSequence.from([promptTemplate, new ChatOpenAI({ model: "gpt-4o-mini" })]);
 * const result = await chain.invoke({ topic: "bears" });
 * ```
 */
declare class RunnableSequence<RunInput = any, RunOutput = any> extends Runnable<RunInput, RunOutput> {
  static lc_name(): string;
  protected first: Runnable<RunInput>;
  protected middle: Runnable[];
  protected last: Runnable<any, RunOutput>;
  omitSequenceTags: boolean;
  lc_serializable: boolean;
  lc_namespace: string[];
  constructor(fields: RunnableSequenceFields<RunInput, RunOutput>);
  get steps(): Runnable<any, any, RunnableConfig<Record<string, any>>>[];
  invoke(input: RunInput, options?: RunnableConfig): Promise<RunOutput>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
  /** @internal */
  _concatOutputChunks<O>(first: O, second: O): O;
  _streamIterator(input: RunInput, options?: RunnableConfig): AsyncGenerator<RunOutput>;
  getGraph(config?: RunnableConfig): Graph;
  pipe<NewRunOutput>(coerceable: RunnableLike<RunOutput, NewRunOutput>): RunnableSequence<RunInput, Exclude<NewRunOutput, Error>>;
  static isRunnableSequence(thing: any): thing is RunnableSequence;
  static from<RunInput = any, RunOutput = any>([first, ...runnables]: [RunnableLike<RunInput>, ...RunnableLike[], RunnableLike<any, RunOutput>], nameOrFields?: string | Omit<RunnableSequenceFields<RunInput, RunOutput>, "first" | "middle" | "last">): RunnableSequence<RunInput, Exclude<RunOutput, Error>>;
}
/**
 * A runnable that runs a mapping of runnables in parallel,
 * and returns a mapping of their outputs.
 * @example
 * ```typescript
 * const mapChain = RunnableMap.from({
 *   joke: PromptTemplate.fromTemplate("Tell me a joke about {topic}").pipe(
 *     new ChatAnthropic({}),
 *   ),
 *   poem: PromptTemplate.fromTemplate("write a 2-line poem about {topic}").pipe(
 *     new ChatAnthropic({}),
 *   ),
 * });
 * const result = await mapChain.invoke({ topic: "bear" });
 * ```
 */
declare class RunnableMap<RunInput = any, RunOutput extends Record<string, any> = Record<string, any>> extends Runnable<RunInput, RunOutput> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  protected steps: Record<string, Runnable<RunInput>>;
  getStepsKeys(): string[];
  constructor(fields: {
    steps: RunnableMapLike<RunInput, RunOutput>;
  });
  static from<RunInput, RunOutput extends Record<string, any> = Record<string, any>>(steps: RunnableMapLike<RunInput, RunOutput>): RunnableMap<RunInput, RunOutput>;
  invoke(input: RunInput, options?: Partial<RunnableConfig>): Promise<RunOutput>;
  _transform(generator: AsyncGenerator<RunInput>, runManager?: CallbackManagerForChainRun, options?: Partial<RunnableConfig>): AsyncGenerator<RunOutput>;
  transform(generator: AsyncGenerator<RunInput>, options?: Partial<RunnableConfig>): AsyncGenerator<RunOutput>;
  stream(input: RunInput, options?: Partial<RunnableConfig>): Promise<IterableReadableStream<RunOutput>>;
}
/**
 * A runnable that wraps an arbitrary function that takes a single argument.
 * @example
 * ```typescript
 * import { RunnableLambda } from "@langchain/core/runnables";
 *
 * const add = (input: { x: number; y: number }) => input.x + input.y;
 *
 * const multiply = (input: { value: number; multiplier: number }) =>
 *   input.value * input.multiplier;
 *
 * // Create runnables for the functions
 * const addLambda = RunnableLambda.from(add);
 * const multiplyLambda = RunnableLambda.from(multiply);
 *
 * // Chain the lambdas for a mathematical operation
 * const chainedLambda = addLambda.pipe((result) =>
 *   multiplyLambda.invoke({ value: result, multiplier: 2 })
 * );
 *
 * // Example invocation of the chainedLambda
 * const result = await chainedLambda.invoke({ x: 2, y: 3 });
 *
 * // Will log "10" (since (2 + 3) * 2 = 10)
 * ```
 */
declare class RunnableLambda<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> extends Runnable<RunInput, RunOutput, CallOptions> {
  static lc_name(): string;
  lc_namespace: string[];
  protected func: RunnableFunc<RunInput, RunOutput | Runnable<RunInput, RunOutput, CallOptions>, CallOptions>;
  constructor(fields: {
    func: RunnableFunc<RunInput, RunOutput | Runnable<RunInput, RunOutput, CallOptions>, CallOptions> | TraceableFunction<RunnableFunc<RunInput, RunOutput | Runnable<RunInput, RunOutput, CallOptions>, CallOptions>>;
  });
  static from<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig>(func: RunnableFunc<RunInput, RunOutput | Runnable<RunInput, RunOutput, CallOptions>, CallOptions>): RunnableLambda<RunInput, RunOutput, CallOptions>;
  static from<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig>(func: TraceableFunction<RunnableFunc<RunInput, RunOutput | Runnable<RunInput, RunOutput, CallOptions>, CallOptions>>): RunnableLambda<RunInput, RunOutput, CallOptions>;
  _invoke(input: RunInput, config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun): Promise<RunOutput>;
  invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  _transform(generator: AsyncGenerator<RunInput>, runManager?: CallbackManagerForChainRun, config?: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  transform(generator: AsyncGenerator<RunInput>, options?: Partial<CallOptions>): AsyncGenerator<RunOutput>;
  stream(input: RunInput, options?: Partial<CallOptions>): Promise<IterableReadableStream<RunOutput>>;
}
/**
 * A runnable that runs a mapping of runnables in parallel,
 * and returns a mapping of their outputs.
 * @example
 * ```typescript
 * import {
 *   RunnableLambda,
 *   RunnableParallel,
 * } from "@langchain/core/runnables";
 *
 * const addYears = (age: number): number => age + 5;
 * const yearsToFifty = (age: number): number => 50 - age;
 * const yearsToHundred = (age: number): number => 100 - age;
 *
 * const addYearsLambda = RunnableLambda.from(addYears);
 * const milestoneFiftyLambda = RunnableLambda.from(yearsToFifty);
 * const milestoneHundredLambda = RunnableLambda.from(yearsToHundred);
 *
 * // Pipe will coerce objects into RunnableParallel by default, but we
 * // explicitly instantiate one here to demonstrate
 * const sequence = addYearsLambda.pipe(
 *   RunnableParallel.from({
 *     years_to_fifty: milestoneFiftyLambda,
 *     years_to_hundred: milestoneHundredLambda,
 *   })
 * );
 *
 * // Invoke the sequence with a single age input
 * const res = await sequence.invoke(25);
 *
 * // { years_to_fifty: 20, years_to_hundred: 70 }
 * ```
 */
declare class RunnableParallel<RunInput> extends RunnableMap<RunInput> {}
/**
 * A Runnable that can fallback to other Runnables if it fails.
 * External APIs (e.g., APIs for a language model) may at times experience
 * degraded performance or even downtime.
 *
 * In these cases, it can be useful to have a fallback Runnable that can be
 * used in place of the original Runnable (e.g., fallback to another LLM provider).
 *
 * Fallbacks can be defined at the level of a single Runnable, or at the level
 * of a chain of Runnables. Fallbacks are tried in order until one succeeds or
 * all fail.
 *
 * While you can instantiate a `RunnableWithFallbacks` directly, it is usually
 * more convenient to use the `withFallbacks` method on an existing Runnable.
 *
 * When streaming, fallbacks will only be called on failures during the initial
 * stream creation. Errors that occur after a stream starts will not fallback
 * to the next Runnable.
 *
 * @example
 * ```typescript
 * import {
 *   RunnableLambda,
 *   RunnableWithFallbacks,
 * } from "@langchain/core/runnables";
 *
 * const primaryOperation = (input: string): string => {
 *   if (input !== "safe") {
 *     throw new Error("Primary operation failed due to unsafe input");
 *   }
 *   return `Processed: ${input}`;
 * };
 *
 * // Define a fallback operation that processes the input differently
 * const fallbackOperation = (input: string): string =>
 *   `Fallback processed: ${input}`;
 *
 * const primaryRunnable = RunnableLambda.from(primaryOperation);
 * const fallbackRunnable = RunnableLambda.from(fallbackOperation);
 *
 * // Apply the fallback logic using the .withFallbacks() method
 * const runnableWithFallback = primaryRunnable.withFallbacks([fallbackRunnable]);
 *
 * // Alternatively, create a RunnableWithFallbacks instance manually
 * const manualFallbackChain = new RunnableWithFallbacks({
 *   runnable: primaryRunnable,
 *   fallbacks: [fallbackRunnable],
 * });
 *
 * // Example invocation using .withFallbacks()
 * const res = await runnableWithFallback
 *   .invoke("unsafe input")
 *   .catch((error) => {
 *     console.error("Failed after all attempts:", error.message);
 *   });
 *
 * // "Fallback processed: unsafe input"
 *
 * // Example invocation using manual instantiation
 * const res = await manualFallbackChain
 *   .invoke("safe")
 *   .catch((error) => {
 *     console.error("Failed after all attempts:", error.message);
 *   });
 *
 * // "Processed: safe"
 * ```
 */
declare class RunnableWithFallbacks<RunInput, RunOutput> extends Runnable<RunInput, RunOutput> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  runnable: Runnable<RunInput, RunOutput>;
  fallbacks: Runnable<RunInput, RunOutput>[];
  constructor(fields: {
    runnable: Runnable<RunInput, RunOutput>;
    fallbacks: Runnable<RunInput, RunOutput>[];
  });
  runnables(): Generator<Runnable<RunInput, RunOutput, RunnableConfig<Record<string, any>>>, void, unknown>;
  invoke(input: RunInput, options?: Partial<RunnableConfig>): Promise<RunOutput>;
  _streamIterator(input: RunInput, options?: Partial<RunnableConfig> | undefined): AsyncGenerator<RunOutput>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions?: false;
  }): Promise<RunOutput[]>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
    returnExceptions: true;
  }): Promise<(RunOutput | Error)[]>;
  batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
}
declare function _coerceToRunnable<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig>(coerceable: RunnableLike<RunInput, RunOutput, CallOptions>): Runnable<RunInput, Exclude<RunOutput, Error>, CallOptions>;
interface RunnableAssignFields<RunInput> {
  mapper: RunnableMap<RunInput>;
}
/**
 * A runnable that assigns key-value pairs to inputs of type `Record<string, unknown>`.
 * @example
 * ```typescript
 * import {
 *   RunnableAssign,
 *   RunnableLambda,
 *   RunnableParallel,
 * } from "@langchain/core/runnables";
 *
 * const calculateAge = (x: { birthYear: number }): { age: number } => {
 *   const currentYear = new Date().getFullYear();
 *   return { age: currentYear - x.birthYear };
 * };
 *
 * const createGreeting = (x: { name: string }): { greeting: string } => {
 *   return { greeting: `Hello, ${x.name}!` };
 * };
 *
 * const mapper = RunnableParallel.from({
 *   age_step: RunnableLambda.from(calculateAge),
 *   greeting_step: RunnableLambda.from(createGreeting),
 * });
 *
 * const runnableAssign = new RunnableAssign({ mapper });
 *
 * const res = await runnableAssign.invoke({ name: "Alice", birthYear: 1990 });
 *
 * // { name: "Alice", birthYear: 1990, age_step: { age: 34 }, greeting_step: { greeting: "Hello, Alice!" } }
 * ```
 */
declare class RunnableAssign<RunInput extends Record<string, any> = Record<string, any>, RunOutput extends Record<string, any> = Record<string, any>, CallOptions extends RunnableConfig = RunnableConfig> extends Runnable<RunInput, RunOutput> implements RunnableAssignFields<RunInput> {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  mapper: RunnableMap<RunInput>;
  constructor(fields: RunnableMap<RunInput> | RunnableAssignFields<RunInput>);
  invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  _transform(generator: AsyncGenerator<RunInput>, runManager?: CallbackManagerForChainRun, options?: Partial<RunnableConfig>): AsyncGenerator<RunOutput>;
  transform(generator: AsyncGenerator<RunInput>, options?: Partial<RunnableConfig>): AsyncGenerator<RunOutput>;
  stream(input: RunInput, options?: Partial<RunnableConfig>): Promise<IterableReadableStream<RunOutput>>;
}
interface RunnablePickFields {
  keys: string | string[];
}
/**
 * A runnable that assigns key-value pairs to inputs of type `Record<string, unknown>`.
 * Useful for streaming, can be automatically created and chained by calling `runnable.pick();`.
 * @example
 * ```typescript
 * import { RunnablePick } from "@langchain/core/runnables";
 *
 * const inputData = {
 *   name: "John",
 *   age: 30,
 *   city: "New York",
 *   country: "USA",
 *   email: "john.doe@example.com",
 *   phone: "+1234567890",
 * };
 *
 * const basicInfoRunnable = new RunnablePick(["name", "city"]);
 *
 * // Example invocation
 * const res = await basicInfoRunnable.invoke(inputData);
 *
 * // { name: 'John', city: 'New York' }
 * ```
 */
declare class RunnablePick<RunInput extends Record<string, any> = Record<string, any>, RunOutput extends Record<string, any> | any = Record<string, any> | any, CallOptions extends RunnableConfig = RunnableConfig> extends Runnable<RunInput, RunOutput> implements RunnablePickFields {
  static lc_name(): string;
  lc_namespace: string[];
  lc_serializable: boolean;
  keys: string | string[];
  constructor(fields: string | string[] | RunnablePickFields);
  _pick(input: RunInput): Promise<RunOutput>;
  invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
  _transform(generator: AsyncGenerator<RunInput>): AsyncGenerator<RunOutput>;
  transform(generator: AsyncGenerator<RunInput>, options?: Partial<RunnableConfig>): AsyncGenerator<RunOutput>;
  stream(input: RunInput, options?: Partial<RunnableConfig>): Promise<IterableReadableStream<RunOutput>>;
}
interface RunnableToolLikeArgs<RunInput extends InteropZodType = InteropZodType, RunOutput = unknown> extends Omit<RunnableBindingArgs<InferInteropZodOutput<RunInput>, RunOutput>, "config"> {
  name: string;
  description?: string;
  schema: RunInput;
  config?: RunnableConfig;
}
declare class RunnableToolLike<RunInput extends InteropZodType = InteropZodType, RunOutput = unknown> extends RunnableBinding<InferInteropZodOutput<RunInput>, RunOutput> {
  name: string;
  description?: string;
  schema: RunInput;
  constructor(fields: RunnableToolLikeArgs<RunInput, RunOutput>);
  static lc_name(): string;
}
//#endregion
export { Runnable, RunnableAssign, RunnableBinding, RunnableBindingArgs, RunnableEach, RunnableFunc, RunnableLambda, RunnableLike, RunnableMap, RunnableMapLike, RunnableParallel, RunnablePick, RunnableRetry, RunnableRetryFailedAttemptHandler, RunnableSequence, RunnableToolLike, RunnableToolLikeArgs, RunnableWithFallbacks, _coerceToRunnable };
//# sourceMappingURL=base.d.cts.map