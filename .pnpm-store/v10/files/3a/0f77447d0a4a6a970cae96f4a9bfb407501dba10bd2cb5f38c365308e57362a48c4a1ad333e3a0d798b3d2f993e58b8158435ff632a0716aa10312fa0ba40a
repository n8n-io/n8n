import { ResponseFormatUndefined } from "./responses.js";
import { InvokeConfiguration, StreamConfiguration } from "./runtime.js";
import { AgentMiddleware, AnyAnnotationRoot, InferContextInput, InferMiddlewareContextInputs, InferMiddlewareInputStates, InferMiddlewareStates, InferSchemaValue, ToAnnotationRoot } from "./middleware/types.js";
import { AgentTypeConfig, BuiltInState, CreateAgentParams, ToolsToMessageToolSet, UserInput } from "./types.js";
import { MessageStructure } from "@langchain/core/messages";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { IterableReadableStream } from "@langchain/core/utils/stream";
import { ClientTool, ServerTool } from "@langchain/core/tools";
import { Command, CompiledStateGraph, GetStateOptions, LangGraphRunnableConfig, StateGraph, StreamMode, StreamOutputMap } from "@langchain/langgraph";
import { InteropZodObject } from "@langchain/core/utils/types";
import { BaseCheckpointSaver, BaseStore, CheckpointListOptions } from "@langchain/langgraph-checkpoint";
import { StreamEvent } from "@langchain/core/tracers/log_stream";

//#region src/agents/ReactAgent.d.ts
type MergedAgentState<Types extends AgentTypeConfig> = InferSchemaValue<Types["State"]> & (Types["Response"] extends ResponseFormatUndefined ? Omit<BuiltInState<MessageStructure<ToolsToMessageToolSet<Types["Tools"]>>>, "jumpTo"> : Omit<BuiltInState<MessageStructure<ToolsToMessageToolSet<Types["Tools"]>>>, "jumpTo"> & {
  structuredResponse: Types["Response"];
}) & InferMiddlewareStates<Types["Middleware"]>;
type InvokeStateParameter<Types extends AgentTypeConfig> = (UserInput<Types["State"]> & InferMiddlewareInputStates<Types["Middleware"]>) | Command<any, any, any> | null;
type AgentGraph<Types extends AgentTypeConfig> = CompiledStateGraph<any, any, any, any, MergedAgentState<Types>, ToAnnotationRoot<Types["Context"] extends AnyAnnotationRoot | InteropZodObject ? Types["Context"] : AnyAnnotationRoot>["spec"], unknown>;
/**
 * ReactAgent is a production-ready ReAct (Reasoning + Acting) agent that combines
 * language models with tools and middleware.
 *
 * The agent is parameterized by a single type bag `Types` that encapsulates all
 * type information:
 *
 * @typeParam Types - An {@link AgentTypeConfig} that bundles:
 *   - `Response`: The structured response type
 *   - `State`: The custom state schema type
 *   - `Context`: The context schema type
 *   - `Middleware`: The middleware array type
 *   - `Tools`: The combined tools type from agent and middleware
 *
 * @example
 * ```typescript
 * // Using the type bag pattern
 * type MyTypes = AgentTypeConfig<
 *   { name: string },  // Response
 *   typeof myState,    // State
 *   typeof myContext,  // Context
 *   typeof middleware, // Middleware
 *   typeof tools       // Tools
 * >;
 *
 * const agent: ReactAgent<MyTypes> = createAgent({ ... });
 * ```
 */
declare class ReactAgent<Types extends AgentTypeConfig = AgentTypeConfig<Record<string, any>, undefined, AnyAnnotationRoot, readonly AgentMiddleware[], readonly (ClientTool | ServerTool)[]>> {
  #private;
  options: CreateAgentParams<Types["Response"], Types["State"], Types["Context"]>;
  /**
   * Type marker for extracting the AgentTypeConfig from a ReactAgent instance.
   * This is a phantom property used only for type inference.
   * @internal
   */
  readonly "~agentTypes": Types;
  constructor(options: CreateAgentParams<Types["Response"], Types["State"], Types["Context"]>, defaultConfig?: RunnableConfig);
  /**
   * Get the compiled {@link https://docs.langchain.com/oss/javascript/langgraph/use-graph-api | StateGraph}.
   */
  get graph(): AgentGraph<Types>;
  get checkpointer(): BaseCheckpointSaver | boolean | undefined;
  set checkpointer(value: BaseCheckpointSaver | boolean | undefined);
  get store(): BaseStore | undefined;
  set store(value: BaseStore | undefined);
  /**
   * Creates a new ReactAgent with the given config merged into the existing config.
   * Follows the same pattern as LangGraph's Pregel.withConfig().
   *
   * The merged config is applied as a default that gets merged with any config
   * passed at invocation time (invoke/stream). Invocation-time config takes precedence.
   *
   * @param config - Configuration to merge with existing config
   * @returns A new ReactAgent instance with the merged configuration
   *
   * @example
   * ```typescript
   * const agent = createAgent({ model: "gpt-4o", tools: [...] });
   *
   * // Set a default recursion limit
   * const configuredAgent = agent.withConfig({ recursionLimit: 1000 });
   *
   * // Chain multiple configs
   * const debugAgent = agent
   *   .withConfig({ recursionLimit: 1000 })
   *   .withConfig({ tags: ["debug"] });
   * ```
   */
  withConfig(config: Omit<RunnableConfig, "store" | "writer" | "interrupt">): ReactAgent<Types>;
  /**
   * Executes the agent with the given state and returns the final state after all processing.
   *
   * This method runs the agent's entire workflow synchronously, including:
   * - Processing the input messages through any configured middleware
   * - Calling the language model to generate responses
   * - Executing any tool calls made by the model
   * - Running all middleware hooks (beforeModel, afterModel, etc.)
   *
   * @param state - The initial state for the agent execution. Can be:
   *   - An object containing `messages` array and any middleware-specific state properties
   *   - A Command object for more advanced control flow
   *
   * @param config - Optional runtime configuration including:
   * @param config.context - The context for the agent execution.
   * @param config.configurable - LangGraph configuration options like `thread_id`, `run_id`, etc.
   * @param config.store - The store for the agent execution for persisting state, see more in {@link https://docs.langchain.com/oss/javascript/langgraph/memory#memory-storage | Memory storage}.
   * @param config.signal - An optional {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal | `AbortSignal`} for the agent execution.
   * @param config.recursionLimit - The recursion limit for the agent execution.
   *
   * @returns A Promise that resolves to the final agent state after execution completes.
   *          The returned state includes:
   *          - a `messages` property containing an array with all messages (input, AI responses, tool calls/results)
   *          - a `structuredResponse` property containing the structured response (if configured)
   *          - all state values defined in the middleware
   *
   * @example
   * ```typescript
   * const agent = new ReactAgent({
   *   llm: myModel,
   *   tools: [calculator, webSearch],
   *   responseFormat: z.object({
   *     weather: z.string(),
   *   }),
   * });
   *
   * const result = await agent.invoke({
   *   messages: [{ role: "human", content: "What's the weather in Paris?" }]
   * });
   *
   * console.log(result.structuredResponse.weather); // outputs: "It's sunny and 75°F."
   * ```
   */
  invoke(state: InvokeStateParameter<Types>, config?: InvokeConfiguration<InferContextInput<Types["Context"] extends AnyAnnotationRoot | InteropZodObject ? Types["Context"] : AnyAnnotationRoot> & InferMiddlewareContextInputs<Types["Middleware"]>>): Promise<MergedAgentState<Types>>;
  /**
   * Executes the agent with streaming, returning an async iterable of state updates as they occur.
   *
   * This method runs the agent's workflow similar to `invoke`, but instead of waiting for
   * completion, it streams high-level state updates in real-time. This allows you to:
   * - Display intermediate results to users as they're generated
   * - Monitor the agent's progress through each step
   * - React to state changes as nodes complete
   *
   * For more granular event-level streaming (like individual LLM tokens), use `streamEvents` instead.
   *
   * @param state - The initial state for the agent execution. Can be:
   *   - An object containing `messages` array and any middleware-specific state properties
   *   - A Command object for more advanced control flow
   *
   * @param config - Optional runtime configuration including:
   * @param config.context - The context for the agent execution.
   * @param config.configurable - LangGraph configuration options like `thread_id`, `run_id`, etc.
   * @param config.store - The store for the agent execution for persisting state, see more in {@link https://docs.langchain.com/oss/javascript/langgraph/memory#memory-storage | Memory storage}.
   * @param config.signal - An optional {@link https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal | `AbortSignal`} for the agent execution.
   * @param config.streamMode - The streaming mode for the agent execution, see more in {@link https://docs.langchain.com/oss/javascript/langgraph/streaming#supported-stream-modes | Supported stream modes}.
   * @param config.recursionLimit - The recursion limit for the agent execution.
   *
   * @returns A Promise that resolves to an IterableReadableStream of state updates.
   *          Each update contains the current state after a node completes.
   *
   * @example
   * ```typescript
   * const agent = new ReactAgent({
   *   llm: myModel,
   *   tools: [calculator, webSearch]
   * });
   *
   * const stream = await agent.stream({
   *   messages: [{ role: "human", content: "What's 2+2 and the weather in NYC?" }]
   * });
   *
   * for await (const chunk of stream) {
   *   console.log(chunk); // State update from each node
   * }
   * ```
   */
  stream<TStreamMode extends StreamMode | StreamMode[] | undefined, TSubgraphs extends boolean, TEncoding extends "text/event-stream" | undefined>(state: InvokeStateParameter<Types>, config?: StreamConfiguration<InferContextInput<Types["Context"] extends AnyAnnotationRoot | InteropZodObject ? Types["Context"] : AnyAnnotationRoot> & InferMiddlewareContextInputs<Types["Middleware"]>, TStreamMode, TSubgraphs, TEncoding>): Promise<IterableReadableStream<StreamOutputMap<TStreamMode, TSubgraphs, MergedAgentState<Types>, MergedAgentState<Types>, string, unknown, unknown, TEncoding>>>;
  /**
   * Visualize the graph as a PNG image.
   * @param params - Parameters for the drawMermaidPng method.
   * @param params.withStyles - Whether to include styles in the graph.
   * @param params.curveStyle - The style of the graph's curves.
   * @param params.nodeColors - The colors of the graph's nodes.
   * @param params.wrapLabelNWords - The maximum number of words to wrap in a node's label.
   * @param params.backgroundColor - The background color of the graph.
   * @returns PNG image as a buffer
   */
  drawMermaidPng(params?: {
    withStyles?: boolean;
    curveStyle?: string;
    nodeColors?: Record<string, string>;
    wrapLabelNWords?: number;
    backgroundColor?: string;
  }): Promise<Uint8Array<ArrayBuffer>>;
  /**
   * Draw the graph as a Mermaid string.
   * @param params - Parameters for the drawMermaid method.
   * @param params.withStyles - Whether to include styles in the graph.
   * @param params.curveStyle - The style of the graph's curves.
   * @param params.nodeColors - The colors of the graph's nodes.
   * @param params.wrapLabelNWords - The maximum number of words to wrap in a node's label.
   * @param params.backgroundColor - The background color of the graph.
   * @returns Mermaid string
   */
  drawMermaid(params?: {
    withStyles?: boolean;
    curveStyle?: string;
    nodeColors?: Record<string, string>;
    wrapLabelNWords?: number;
    backgroundColor?: string;
  }): Promise<string>;
  /**
   * The following are internal methods to enable support for LangGraph Platform.
   * They are not part of the createAgent public API.
   *
   * Note: we intentionally return as `never` to avoid type errors due to type inference.
   */
  /**
   * @internal
   */
  streamEvents(state: InvokeStateParameter<Types>, config?: StreamConfiguration<InferContextInput<Types["Context"] extends AnyAnnotationRoot | InteropZodObject ? Types["Context"] : AnyAnnotationRoot> & InferMiddlewareContextInputs<Types["Middleware"]>, StreamMode | StreamMode[] | undefined, boolean, "text/event-stream" | undefined> & {
    version?: "v1" | "v2";
  }, streamOptions?: Parameters<Runnable["streamEvents"]>[2]): IterableReadableStream<StreamEvent>;
  /**
   * @internal
   */
  getGraphAsync(config?: RunnableConfig): never;
  /**
   * @internal
   */
  getState(config: RunnableConfig, options?: GetStateOptions): never;
  /**
   * @internal
   */
  getStateHistory(config: RunnableConfig, options?: CheckpointListOptions): never;
  /**
   * @internal
   */
  getSubgraphs(namespace?: string, recurse?: boolean): never;
  /**
   * @internal
   */
  getSubgraphAsync(namespace?: string, recurse?: boolean): never;
  /**
   * @internal
   */
  updateState(inputConfig: LangGraphRunnableConfig, values: Record<string, unknown> | unknown, asNode?: string): never;
  /**
   * @internal
   */
  get builder(): StateGraph<unknown, any, any, any, any, MergedAgentState<Types>, ToAnnotationRoot<Types["Context"] extends AnyAnnotationRoot | InteropZodObject ? Types["Context"] : AnyAnnotationRoot>["spec"], unknown, unknown, unknown>;
}
//#endregion
export { ReactAgent };
//# sourceMappingURL=ReactAgent.d.ts.map