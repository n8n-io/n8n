import { BaseChannel } from "../channels/base.cjs";
import { LangGraphRunnableConfig } from "./runnable_types.cjs";
import { RetryPolicy } from "./utils/index.cjs";
import { PregelNode } from "./read.cjs";
import { Command, CommandInstance } from "../constants.cjs";
import { Durability, GetStateOptions, MultipleChannelSubscriptionOptions, PregelInputType, PregelInterface, PregelOptions, PregelOutputType, PregelParams, SingleChannelSubscriptionOptions, StateSnapshot, StreamMode, StreamOutputMap } from "./types.cjs";
import { StrRecord } from "./algo.cjs";
import { ChannelWrite } from "./write.cjs";
import { All, BaseCache, BaseCheckpointSaver, BaseStore, CheckpointListOptions, CheckpointTuple } from "@langchain/langgraph-checkpoint";
import { Runnable, RunnableConfig, RunnableFunc } from "@langchain/core/runnables";
import * as _langchain_core_runnables_graph0 from "@langchain/core/runnables/graph";
import { StreamEvent } from "@langchain/core/tracers/log_stream";
import { IterableReadableStream } from "@langchain/core/utils/stream";

//#region src/pregel/index.d.ts
type WriteValue = Runnable | RunnableFunc<unknown, unknown> | unknown;
type StreamEventsOptions = Parameters<Runnable["streamEvents"]>[2];
/**
 * Utility class for working with channels in the Pregel system.
 * Provides static methods for subscribing to channels and writing to them.
 *
 * Channels are the communication pathways between nodes in a Pregel graph.
 * They enable message passing and state updates between different parts of the graph.
 */
declare class Channel {
  /**
   * Creates a PregelNode that subscribes to a single channel.
   * This is used to define how nodes receive input from channels.
   *
   * @example
   * ```typescript
   * // Subscribe to a single channel
   * const node = Channel.subscribeTo("messages");
   *
   * // Subscribe to multiple channels
   * const node = Channel.subscribeTo(["messages", "state"]);
   *
   * // Subscribe with a custom key
   * const node = Channel.subscribeTo("messages", { key: "chat" });
   * ```
   *
   * @param channel Single channel name to subscribe to
   * @param options Subscription options
   * @returns A PregelNode configured to receive from the specified channels
   * @throws {Error} If a key is specified when subscribing to multiple channels
   */
  static subscribeTo(channel: string, options?: SingleChannelSubscriptionOptions): PregelNode;
  /**
   * Creates a PregelNode that subscribes to multiple channels.
   * This is used to define how nodes receive input from channels.
   *
   * @example
   * ```typescript
   * // Subscribe to a single channel
   * const node = Channel.subscribeTo("messages");
   *
   * // Subscribe to multiple channels
   * const node = Channel.subscribeTo(["messages", "state"]);
   *
   * // Subscribe with a custom key
   * const node = Channel.subscribeTo("messages", { key: "chat" });
   * ```
   *
   * @param channels Single channel name to subscribe to
   * @param options Subscription options
   * @returns A PregelNode configured to receive from the specified channels
   * @throws {Error} If a key is specified when subscribing to multiple channels
   */
  static subscribeTo(channels: string[], options?: MultipleChannelSubscriptionOptions): PregelNode;
  /**
   * Creates a ChannelWrite that specifies how to write values to channels.
   * This is used to define how nodes send output to channels.
   *
   * @example
   * ```typescript
   * // Write to multiple channels
   * const write = Channel.writeTo(["output", "state"]);
   *
   * // Write with specific values
   * const write = Channel.writeTo(["output"], {
   *   state: "completed",
   *   result: calculateResult()
   * });
   *
   * // Write with a transformation function
   * const write = Channel.writeTo(["output"], {
   *   result: (x) => processResult(x)
   * });
   * ```
   *
   * @param channels - Array of channel names to write to
   * @param writes - Optional map of channel names to values or transformations
   * @returns A ChannelWrite object that can be used to write to the specified channels
   */
  static writeTo(channels: string[], writes?: Record<string, WriteValue>): ChannelWrite;
}
// This is a workaround to allow Pregel to override `invoke` / `stream` and `withConfig`
// without having to adhere to the types in the `Runnable` class (thanks to `any`).
// Alternatively we could mark those methods with @ts-ignore / @ts-expect-error,
// but these do not get carried over when building via `tsc`.
declare class PartialRunnable<RunInput, RunOutput, CallOptions extends RunnableConfig> extends Runnable<RunInput, RunOutput, CallOptions> {
  lc_namespace: string[];
  invoke(_input: RunInput, _options?: Partial<CallOptions>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any>;
  // Overriden by `Pregel`
  withConfig(_config: CallOptions): typeof this;
  // Overriden by `Pregel`
  stream(input: RunInput, options?: Partial<CallOptions>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<IterableReadableStream<any>>;
}
/**
 * The Pregel class is the core runtime engine of LangGraph, implementing a message-passing graph computation model
 * inspired by [Google's Pregel system](https://research.google/pubs/pregel-a-system-for-large-scale-graph-processing/).
 * It provides the foundation for building reliable, controllable agent workflows that can evolve state over time.
 *
 * Key features:
 * - Message passing between nodes in discrete "supersteps"
 * - Built-in persistence layer through checkpointers
 * - First-class streaming support for values, updates, and events
 * - Human-in-the-loop capabilities via interrupts
 * - Support for parallel node execution within supersteps
 *
 * The Pregel class is not intended to be instantiated directly by consumers. Instead, use the following higher-level APIs:
 * - {@link StateGraph}: The main graph class for building agent workflows
 *   - Compiling a {@link StateGraph} will return a {@link CompiledGraph} instance, which extends `Pregel`
 * - Functional API: A declarative approach using tasks and entrypoints
 *   - A `Pregel` instance is returned by the {@link entrypoint} function
 *
 * @example
 * ```typescript
 * // Using StateGraph API
 * const graph = new StateGraph(annotation)
 *   .addNode("nodeA", myNodeFunction)
 *   .addEdge("nodeA", "nodeB")
 *   .compile();
 *
 * // The compiled graph is a Pregel instance
 * const result = await graph.invoke(input);
 * ```
 *
 * @example
 * ```typescript
 * // Using Functional API
 * import { task, entrypoint } from "@langchain/langgraph";
 * import { MemorySaver } from "@langchain/langgraph-checkpoint";
 *
 * // Define tasks that can be composed
 * const addOne = task("add", async (x: number) => x + 1);
 *
 * // Create a workflow using the entrypoint function
 * const workflow = entrypoint({
 *   name: "workflow",
 *   checkpointer: new MemorySaver()
 * }, async (numbers: number[]) => {
 *   // Tasks can be run in parallel
 *   const results = await Promise.all(numbers.map(n => addOne(n)));
 *   return results;
 * });
 *
 * // The workflow is a Pregel instance
 * const result = await workflow.invoke([1, 2, 3]); // Returns [2, 3, 4]
 * ```
 *
 * @typeParam Nodes - Mapping of node names to their {@link PregelNode} implementations
 * @typeParam Channels - Mapping of channel names to their {@link BaseChannel} or {@link ManagedValueSpec} implementations
 * @typeParam ContextType - Type of context that can be passed to the graph
 * @typeParam InputType - Type of input values accepted by the graph
 * @typeParam OutputType - Type of output values produced by the graph
 */
declare class Pregel<Nodes extends StrRecord<string, PregelNode>, Channels extends StrRecord<string, BaseChannel>,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ContextType extends Record<string, any> = StrRecord<string, any>, InputType = PregelInputType, OutputType = PregelOutputType, StreamUpdatesType = InputType, StreamValuesType = OutputType, NodeReturnType = unknown, CommandType = CommandInstance,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
StreamCustom = any> extends PartialRunnable<InputType | CommandType | null, OutputType, PregelOptions<Nodes, Channels, ContextType>> implements PregelInterface<Nodes, Channels, ContextType> {
  /**
   * Name of the class when serialized
   * @internal
   */
  static lc_name(): string;
  /** @internal Used for type inference */
  "~InputType": InputType;
  /** @internal Used for type inference */
  "~OutputType": OutputType;
  /** @internal LangChain namespace for serialization necessary because Pregel extends Runnable */
  lc_namespace: string[];
  /** @internal Flag indicating this is a Pregel instance - necessary for serialization */
  lg_is_pregel: boolean;
  /** The nodes in the graph, mapping node names to their PregelNode instances */
  nodes: Nodes;
  /** The channels in the graph, mapping channel names to their BaseChannel or ManagedValueSpec instances */
  channels: Channels;
  /**
   * The input channels for the graph. These channels receive the initial input when the graph is invoked.
   * Can be a single channel key or an array of channel keys.
   */
  inputChannels: keyof Channels | Array<keyof Channels>;
  /**
   * The output channels for the graph. These channels contain the final output when the graph completes.
   * Can be a single channel key or an array of channel keys.
   */
  outputChannels: keyof Channels | Array<keyof Channels>;
  /** Whether to automatically validate the graph structure when it is compiled. Defaults to true. */
  autoValidate: boolean;
  /**
   * The streaming modes enabled for this graph. Defaults to ["values"].
   * Supported modes:
   * - "values": Streams the full state after each step
   * - "updates": Streams state updates after each step
   * - "messages": Streams messages from within nodes
   * - "custom": Streams custom events from within nodes
   * - "debug": Streams events related to the execution of the graph - useful for tracing & debugging graph execution
   */
  streamMode: StreamMode[];
  /**
   * Optional channels to stream. If not specified, all channels will be streamed.
   * Can be a single channel key or an array of channel keys.
   */
  streamChannels?: keyof Channels | Array<keyof Channels>;
  /**
   * Optional array of node names or "all" to interrupt after executing these nodes.
   * Used for implementing human-in-the-loop workflows.
   */
  interruptAfter?: Array<keyof Nodes> | All;
  /**
   * Optional array of node names or "all" to interrupt before executing these nodes.
   * Used for implementing human-in-the-loop workflows.
   */
  interruptBefore?: Array<keyof Nodes> | All;
  /** Optional timeout in milliseconds for the execution of each superstep */
  stepTimeout?: number;
  /** Whether to enable debug logging. Defaults to false. */
  debug: boolean;
  /**
   * Optional checkpointer for persisting graph state.
   * When provided, saves a checkpoint of the graph state at every superstep.
   * When false or undefined, checkpointing is disabled, and the graph will not be able to save or restore state.
   */
  checkpointer?: BaseCheckpointSaver | boolean;
  /** Optional retry policy for handling failures in node execution */
  retryPolicy?: RetryPolicy;
  /** The default configuration for graph execution, can be overridden on a per-invocation basis */
  config?: LangGraphRunnableConfig;
  /**
   * Optional long-term memory store for the graph, allows for persistence & retrieval of data across threads
   */
  store?: BaseStore;
  /**
   * Optional cache for the graph, useful for caching tasks.
   */
  cache?: BaseCache;
  /**
   * Optional interrupt helper function.
   * @internal
   */
  private userInterrupt?;
  /**
   * The trigger to node mapping for the graph run.
   * @internal
   */
  private triggerToNodes;
  /**
   * Constructor for Pregel - meant for internal use only.
   *
   * @internal
   */
  constructor(fields: PregelParams<Nodes, Channels>);
  /**
   * Creates a new instance of the Pregel graph with updated configuration.
   * This method follows the immutable pattern - instead of modifying the current instance,
   * it returns a new instance with the merged configuration.
   *
   * @example
   * ```typescript
   * // Create a new instance with debug enabled
   * const debugGraph = graph.withConfig({ debug: true });
   *
   * // Create a new instance with a specific thread ID
   * const threadGraph = graph.withConfig({
   *   configurable: { thread_id: "123" }
   * });
   * ```
   *
   * @param config - The configuration to merge with the current configuration
   * @returns A new Pregel instance with the merged configuration
   */
  withConfig(config: Omit<LangGraphRunnableConfig, "store" | "writer" | "interrupt">): typeof this;
  /**
   * Validates the graph structure to ensure it is well-formed.
   * Checks for:
   * - No orphaned nodes
   * - Valid input/output channel configurations
   * - Valid interrupt configurations
   *
   * @returns this - The Pregel instance for method chaining
   * @throws {GraphValidationError} If the graph structure is invalid
   */
  validate(): this;
  /**
   * Gets a list of all channels that should be streamed.
   * If streamChannels is specified, returns those channels.
   * Otherwise, returns all channels in the graph.
   *
   * @returns Array of channel keys to stream
   */
  get streamChannelsList(): Array<keyof Channels>;
  /**
   * Gets the channels to stream in their original format.
   * If streamChannels is specified, returns it as-is (either single key or array).
   * Otherwise, returns all channels in the graph as an array.
   *
   * @returns Channel keys to stream, either as a single key or array
   */
  get streamChannelsAsIs(): keyof Channels | Array<keyof Channels>;
  /**
   * Gets a drawable representation of the graph structure.
   * This is an async version of getGraph() and is the preferred method to use.
   *
   * @param config - Configuration for generating the graph visualization
   * @returns A representation of the graph that can be visualized
   */
  getGraphAsync(config: RunnableConfig): Promise<_langchain_core_runnables_graph0.Graph>;
  /**
   * Gets all subgraphs within this graph.
   * A subgraph is a Pregel instance that is nested within a node of this graph.
   *
   * @deprecated Use getSubgraphsAsync instead. The async method will become the default in the next minor release.
   * @param namespace - Optional namespace to filter subgraphs
   * @param recurse - Whether to recursively get subgraphs of subgraphs
   * @returns Generator yielding tuples of [name, subgraph]
   */
  getSubgraphs(namespace?: string, recurse?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Generator<[string, Pregel<any, any>]>;
  /**
   * Gets all subgraphs within this graph asynchronously.
   * A subgraph is a Pregel instance that is nested within a node of this graph.
   *
   * @param namespace - Optional namespace to filter subgraphs
   * @param recurse - Whether to recursively get subgraphs of subgraphs
   * @returns AsyncGenerator yielding tuples of [name, subgraph]
   */
  getSubgraphsAsync(namespace?: string, recurse?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): AsyncGenerator<[string, Pregel<any, any>]>;
  /**
   * Prepares a state snapshot from saved checkpoint data.
   * This is an internal method used by getState and getStateHistory.
   *
   * @param config - Configuration for preparing the snapshot
   * @param saved - Optional saved checkpoint data
   * @param subgraphCheckpointer - Optional checkpointer for subgraphs
   * @param applyPendingWrites - Whether to apply pending writes to tasks and then to channels
   * @returns A snapshot of the graph state
   * @internal
   */
  protected _prepareStateSnapshot({
    config,
    saved,
    subgraphCheckpointer,
    applyPendingWrites
  }: {
    config: RunnableConfig;
    saved?: CheckpointTuple;
    subgraphCheckpointer?: BaseCheckpointSaver;
    applyPendingWrites?: boolean;
  }): Promise<StateSnapshot>;
  /**
   * Gets the current state of the graph.
   * Requires a checkpointer to be configured.
   *
   * @param config - Configuration for retrieving the state
   * @param options - Additional options
   * @returns A snapshot of the current graph state
   * @throws {GraphValueError} If no checkpointer is configured
   */
  getState(config: RunnableConfig, options?: GetStateOptions): Promise<StateSnapshot>;
  /**
   * Gets the history of graph states.
   * Requires a checkpointer to be configured.
   * Useful for:
   * - Debugging execution history
   * - Implementing time travel
   * - Analyzing graph behavior
   *
   * @param config - Configuration for retrieving the history
   * @param options - Options for filtering the history
   * @returns An async iterator of state snapshots
   * @throws {Error} If no checkpointer is configured
   */
  getStateHistory(config: RunnableConfig, options?: CheckpointListOptions): AsyncIterableIterator<StateSnapshot>;
  /**
   * Apply updates to the graph state in bulk.
   * Requires a checkpointer to be configured.
   *
   * This method is useful for recreating a thread
   * from a list of updates, especially if a checkpoint
   * is created as a result of multiple tasks.
   *
   * @internal The API might change in the future.
   *
   * @param startConfig - Configuration for the update
   * @param updates - The list of updates to apply to graph state
   * @returns Updated configuration
   * @throws {GraphValueError} If no checkpointer is configured
   * @throws {InvalidUpdateError} If the update cannot be attributed to a node or an update can be only applied in sequence.
   */
  bulkUpdateState(startConfig: LangGraphRunnableConfig, supersteps: Array<{
    updates: Array<{
      values?: Record<string, unknown> | unknown;
      asNode?: keyof Nodes | string;
    }>;
  }>): Promise<RunnableConfig>;
  /**
   * Updates the state of the graph with new values.
   * Requires a checkpointer to be configured.
   *
   * This method can be used for:
   * - Implementing human-in-the-loop workflows
   * - Modifying graph state during breakpoints
   * - Integrating external inputs into the graph
   *
   * @param inputConfig - Configuration for the update
   * @param values - The values to update the state with
   * @param asNode - Optional node name to attribute the update to
   * @returns Updated configuration
   * @throws {GraphValueError} If no checkpointer is configured
   * @throws {InvalidUpdateError} If the update cannot be attributed to a node
   */
  updateState(inputConfig: LangGraphRunnableConfig, values: Record<string, unknown> | unknown, asNode?: keyof Nodes | string): Promise<RunnableConfig>;
  /**
   * Gets the default values for various graph configuration options.
   * This is an internal method used to process and normalize configuration options.
   *
   * @param config - The input configuration options
   * @returns A tuple containing normalized values for:
   * - debug mode
   * - stream modes
   * - input keys
   * - output keys
   * - remaining config
   * - interrupt before nodes
   * - interrupt after nodes
   * - checkpointer
   * - store
   * - whether stream mode is single
   * - node cache
   * - whether checkpoint during is enabled
   * @internal
   */
  _defaults(config: PregelOptions<Nodes, Channels>): [boolean,
  // debug
  StreamMode[],
  // stream mode
  // stream mode
  string | string[],
  // input keys
  // input keys
  string | string[],
  // output keys
  LangGraphRunnableConfig,
  // config without pregel keys
  // config without pregel keys
  All | string[],
  // interrupt before
  // interrupt before
  All | string[],
  // interrupt after
  // interrupt after
  BaseCheckpointSaver | undefined,
  // checkpointer
  // checkpointer
  BaseStore | undefined,
  // store
  boolean,
  // stream mode single
  // stream mode single
  BaseCache | undefined,
  // node cache
  Durability // durability
  ];
  /**
   * Streams the execution of the graph, emitting state updates as they occur.
   * This is the primary method for observing graph execution in real-time.
   *
   * Stream modes:
   * - "values": Emits complete state after each step
   * - "updates": Emits only state changes after each step
   * - "debug": Emits detailed debug information
   * - "messages": Emits messages from within nodes
   * - "custom": Emits custom events from within nodes
   * - "checkpoints": Emits checkpoints from within nodes
   * - "tasks": Emits tasks from within nodes
   *
   * @param input - The input to start graph execution with
   * @param options - Configuration options for streaming
   * @returns An async iterable stream of graph state updates
   */
  stream<TStreamMode extends StreamMode | StreamMode[] | undefined, TSubgraphs extends boolean, TEncoding extends "text/event-stream" | undefined>(input: InputType | CommandType | null, options?: Partial<PregelOptions<Nodes, Channels, ContextType, TStreamMode, TSubgraphs, TEncoding>>): Promise<IterableReadableStream<StreamOutputMap<TStreamMode, TSubgraphs, StreamUpdatesType, StreamValuesType, keyof Nodes, NodeReturnType, StreamCustom, TEncoding>>>;
  /**
   * @inheritdoc
   */
  streamEvents(input: InputType | CommandType | null, options: Partial<PregelOptions<Nodes, Channels, ContextType>> & {
    version: "v1" | "v2";
  }, streamOptions?: StreamEventsOptions): IterableReadableStream<StreamEvent>;
  streamEvents(input: InputType | CommandType | null, options: Partial<PregelOptions<Nodes, Channels, ContextType>> & {
    version: "v1" | "v2";
    encoding: "text/event-stream";
  }, streamOptions?: StreamEventsOptions): IterableReadableStream<Uint8Array>;
  /**
   * Validates the input for the graph.
   * @param input - The input to validate
   * @returns The validated input
   * @internal
   */
  protected _validateInput(input: PregelInputType): Promise<any>;
  /**
   * Validates the context options for the graph.
   * @param context - The context options to validate
   * @returns The validated context options
   * @internal
   */
  protected _validateContext(context: Partial<LangGraphRunnableConfig["context"]>): Promise<LangGraphRunnableConfig["context"]>;
  /**
   * Internal iterator used by stream() to generate state updates.
   * This method handles the core logic of graph execution and streaming.
   *
   * @param input - The input to start graph execution with
   * @param options - Configuration options for streaming
   * @returns AsyncGenerator yielding state updates
   * @internal
   */
  _streamIterator(input: PregelInputType | Command, options?: Partial<PregelOptions<Nodes, Channels>>): AsyncGenerator<PregelOutputType>;
  /**
   * Run the graph with a single input and config.
   * @param input The input to the graph.
   * @param options The configuration to use for the run.
   */
  invoke(input: InputType | CommandType | null, options?: Partial<Omit<PregelOptions<Nodes, Channels, ContextType>, "encoding">>): Promise<OutputType>;
  private _runLoop;
  clearCache(): Promise<void>;
}
//#endregion
export { Channel, Pregel, type PregelInputType, type PregelOptions, type PregelOutputType };
//# sourceMappingURL=index.d.cts.map