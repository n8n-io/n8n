import { BaseChannel } from "../channels/base.js";
import { Command, CommandInstance, END, INTERRUPT, Interrupt, START } from "../constants.js";
import { SchemaMetaRegistry } from "./zod/meta.js";
import { RunnableLike, Runtime } from "../pregel/runnable_types.js";
import { AnnotationRoot, SingleReducer, StateDefinition, StateType } from "./annotation.js";
import { CachePolicy, RetryPolicy } from "../pregel/utils/index.js";
import { AddNodeOptions, Branch, CompiledGraph, Graph, NodeSpec } from "./graph.js";
import { InferInterruptInputType, InferInterruptResumeType } from "../interrupt.js";
import { InferWriterType } from "../writer.js";
import { AnyStateSchema } from "../state/schema.js";
import { ContextSchemaInit, ExtractStateType, ExtractUpdateType, StateDefinitionInit, StateGraphInit, StateGraphOptions, ToStateDefinition } from "./types.js";
import { All, BaseCache, BaseCheckpointSaver, BaseStore } from "@langchain/langgraph-checkpoint";
import { InteropZodObject } from "@langchain/core/utils/types";

//#region src/graph/state.d.ts
type ChannelReducers<Channels extends object> = { [K in keyof Channels]: SingleReducer<Channels[K], any> };
interface StateGraphArgs<Channels extends object | unknown> {
  channels: Channels extends object ? Channels extends unknown[] ? ChannelReducers<{
    __root__: Channels;
  }> : ChannelReducers<Channels> : ChannelReducers<{
    __root__: Channels;
  }>;
}
type StateGraphNodeSpec<RunInput, RunOutput> = NodeSpec<RunInput, RunOutput> & {
  input?: StateDefinition;
  retryPolicy?: RetryPolicy;
  cachePolicy?: CachePolicy;
};
/**
 * Options for StateGraph.addNode() method.
 *
 * @template Nodes - Node name constraints
 * @template InputSchema - Per-node input schema type (inferred from options.input)
 */
type StateGraphAddNodeOptions<Nodes extends string = string, InputSchema extends StateDefinitionInit | undefined = StateDefinitionInit | undefined> = {
  retryPolicy?: RetryPolicy;
  cachePolicy?: CachePolicy | boolean;
  input?: InputSchema;
} & AddNodeOptions<Nodes>;
type StateGraphArgsWithStateSchema<SD extends StateDefinition, I extends StateDefinition, O extends StateDefinition> = {
  stateSchema: AnnotationRoot<SD>;
  input?: AnnotationRoot<I>;
  output?: AnnotationRoot<O>;
};
type StateGraphArgsWithInputOutputSchemas<SD extends StateDefinition, O extends StateDefinition = SD> = {
  input: AnnotationRoot<SD>;
  output: AnnotationRoot<O>;
};
type ExtractStateDefinition<T> = T extends AnyStateSchema ? T : T extends StateDefinitionInit ? ToStateDefinition<T> : StateDefinition;
type NodeAction<S, U, C extends StateDefinitionInit, InterruptType, WriterType> = RunnableLike<S, U extends object ? U & Record<string, any> : U, Runtime<StateType<ToStateDefinition<C>>, InterruptType, WriterType>>;
type StrictNodeAction<S, U, C extends StateDefinitionInit, Nodes extends string, InterruptType, WriterType> = RunnableLike<Prettify<S>, U | Command<InferInterruptResumeType<InterruptType>, U & Record<string, any>, Nodes>, Runtime<StateType<ToStateDefinition<C>>, InterruptType, WriterType>>;
declare const PartialStateSchema: unique symbol;
type PartialStateSchema = typeof PartialStateSchema;
type MergeReturnType<Prev, Curr> = Prev & Curr extends infer T ? { [K in keyof T]: T[K] } & unknown : never;
type Prettify<T> = { [K in keyof T]: T[K] } & {};
/**
 * A graph whose nodes communicate by reading and writing to a shared state.
 * Each node takes a defined `State` as input and returns a `Partial<State>`.
 *
 * Each state key can optionally be annotated with a reducer function that
 * will be used to aggregate the values of that key received from multiple nodes.
 * The signature of a reducer function is (left: Value, right: UpdateValue) => Value.
 *
 * See {@link Annotation} for more on defining state.
 *
 * After adding nodes and edges to your graph, you must call `.compile()` on it before
 * you can use it.
 *
 * @typeParam SD - The state definition used to construct the graph. Can be an
 *   {@link AnnotationRoot}, {@link StateSchema}, or Zod object schema. This is the
 *   primary generic from which `S` and `U` are derived.
 *
 * @typeParam S - The full state type representing the complete shape of your graph's
 *   state after all reducers have been applied. Automatically inferred from `SD`.
 *
 * @typeParam U - The update type representing what nodes can return to modify state.
 *   Typically a partial of the state type. Automatically inferred from `SD`.
 *
 * @typeParam N - Union of all node names in the graph (e.g., `"agent" | "tool"`).
 *   Accumulated as you call `.addNode()`. Used for type-safe routing.
 *
 * @typeParam I - The input schema definition. Set via the `input` option in the
 *   constructor to restrict what data the graph accepts when invoked.
 *
 * @typeParam O - The output schema definition. Set via the `output` option in the
 *   constructor to restrict what data the graph returns after execution.
 *
 * @typeParam C - The config/context schema definition. Set via the `context` option
 *   to define additional configuration passed at runtime.
 *
 * @typeParam NodeReturnType - Constrains what types nodes in this graph can return.
 *
 * @typeParam InterruptType - The type for {@link interrupt} resume values. Set via
 *   the `interrupt` option for typed human-in-the-loop patterns.
 *
 * @typeParam WriterType - The type for custom stream writers. Set via the `writer`
 *   option to enable typed custom streaming from within nodes.
 *
 * @example
 * ```ts
 * import {
 *   type BaseMessage,
 *   AIMessage,
 *   HumanMessage,
 * } from "@langchain/core/messages";
 * import { StateGraph, Annotation } from "@langchain/langgraph";
 *
 * // Define a state with a single key named "messages" that will
 * // combine a returned BaseMessage or arrays of BaseMessages
 * const StateAnnotation = Annotation.Root({
 *   sentiment: Annotation<string>,
 *   messages: Annotation<BaseMessage[]>({
 *     reducer: (left: BaseMessage[], right: BaseMessage | BaseMessage[]) => {
 *       if (Array.isArray(right)) {
 *         return left.concat(right);
 *       }
 *       return left.concat([right]);
 *     },
 *     default: () => [],
 *   }),
 * });
 *
 * const graphBuilder = new StateGraph(StateAnnotation);
 *
 * // A node in the graph that returns an object with a "messages" key
 * // will update the state by combining the existing value with the returned one.
 * const myNode = (state: typeof StateAnnotation.State) => {
 *   return {
 *     messages: [new AIMessage("Some new response")],
 *     sentiment: "positive",
 *   };
 * };
 *
 * const graph = graphBuilder
 *   .addNode("myNode", myNode)
 *   .addEdge("__start__", "myNode")
 *   .addEdge("myNode", "__end__")
 *   .compile();
 *
 * await graph.invoke({ messages: [new HumanMessage("how are you?")] });
 *
 * // {
 * //   messages: [HumanMessage("how are you?"), AIMessage("Some new response")],
 * //   sentiment: "positive",
 * // }
 * ```
 */
declare class StateGraph<SD extends StateDefinitionInit | unknown, S = ExtractStateType<SD>, U = ExtractUpdateType<SD, S>, N extends string = typeof START, I extends StateDefinitionInit = ExtractStateDefinition<SD>, O extends StateDefinitionInit = ExtractStateDefinition<SD>, C extends StateDefinitionInit = StateDefinition, NodeReturnType = unknown, InterruptType = unknown, WriterType = unknown> extends Graph<N, S, U, StateGraphNodeSpec<S, U>, ToStateDefinition<C>> {
  channels: Record<string, BaseChannel>;
  waitingEdges: Set<[N[], N]>;
  /** @internal */
  _schemaDefinition: StateDefinition;
  /** @internal */
  _schemaRuntimeDefinition: InteropZodObject | AnyStateSchema | undefined;
  /** @internal */
  _inputDefinition: I;
  /** @internal */
  _inputRuntimeDefinition: InteropZodObject | AnyStateSchema | PartialStateSchema | undefined;
  /** @internal */
  _outputDefinition: O;
  /** @internal */
  _outputRuntimeDefinition: InteropZodObject | AnyStateSchema | undefined;
  /**
   * Map schemas to managed values
   * @internal
   */
  _schemaDefinitions: Map<any, any>;
  /** @internal */
  _metaRegistry: SchemaMetaRegistry;
  /** @internal Used only for typing. */
  _configSchema: ToStateDefinition<C> | undefined;
  /** @internal */
  _configRuntimeSchema: InteropZodObject | undefined;
  /** @internal */
  _interrupt: InterruptType;
  /** @internal */
  _writer: WriterType;
  Node: StrictNodeAction<S, U, C, N, InterruptType, WriterType>;
  /**
   * Create a new StateGraph for building stateful, multi-step workflows.
   *
   * Accepts state definitions via `Annotation.Root`, `StateSchema`, or Zod schemas.
   *
   * @example Direct schema
   * ```ts
   * const StateAnnotation = Annotation.Root({
   *   messages: Annotation<string[]>({ reducer: (a, b) => [...a, ...b] }),
   * });
   * const graph = new StateGraph(StateAnnotation);
   * ```
   *
   * @example Direct schema with input/output filtering
   * ```ts
   * const graph = new StateGraph(StateAnnotation, {
   *   input: InputSchema,
   *   output: OutputSchema,
   * });
   * ```
   *
   * @example Object pattern with state, input, output
   * ```ts
   * const graph = new StateGraph({
   *   state: FullStateSchema,
   *   input: InputSchema,
   *   output: OutputSchema,
   * });
   * ```
   *
   * @example Input/output only (state inferred from input)
   * ```ts
   * const graph = new StateGraph({
   *   input: InputAnnotation,
   *   output: OutputAnnotation,
   * });
   * ```
   */
  constructor(state: SD extends StateDefinitionInit ? SD : never, options?: C | AnnotationRoot<ToStateDefinition<C>> | StateGraphOptions<I, O, C, N, InterruptType, WriterType>);
  constructor(fields: SD extends StateDefinition ? StateGraphArgsWithInputOutputSchemas<SD, ToStateDefinition<O>> : never, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  constructor(fields: SD extends StateDefinition ? AnnotationRoot<SD> | StateGraphArgsWithStateSchema<SD, ToStateDefinition<I>, ToStateDefinition<O>> : never, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  constructor(init: Omit<StateGraphInit<SD extends StateDefinitionInit ? SD : StateDefinitionInit, SD extends StateDefinitionInit ? SD : StateDefinitionInit, O, C extends ContextSchemaInit ? C : undefined, N, InterruptType, WriterType>, "state" | "stateSchema" | "input"> & {
    input: SD extends StateDefinitionInit ? SD : never;
    state?: never;
    stateSchema?: never;
  }, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  constructor(init: StateGraphInit<SD extends StateDefinitionInit ? SD : StateDefinitionInit, I, O, C extends ContextSchemaInit ? C : undefined, N, InterruptType, WriterType>);
  /** @deprecated Use `Annotation.Root`, `StateSchema`, or Zod schemas instead. */
  constructor(fields: StateGraphArgs<S>, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  /**
   * Normalize all constructor input patterns to a unified StateGraphInit object.
   * @internal
   */
  private _normalizeToStateGraphInit;
  /**
   * Convert any supported schema type to a StateDefinition (channel map).
   * @internal
   */
  private _getChannelsFromSchema;
  get allEdges(): Set<[string, string]>;
  _addSchema(stateDefinition: StateDefinitionInit): void;
  addNode<K extends string, NodeMap extends Record<K, NodeAction<S, U, C, InterruptType, WriterType>>>(nodes: NodeMap): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in keyof NodeMap]: NodeMap[key] extends NodeAction<S, infer U, C, InterruptType, WriterType> ? U : never }>>;
  addNode<K extends string, NodeInput = S, NodeOutput extends U = U>(nodes: [key: K, action: NodeAction<NodeInput, NodeOutput, C, InterruptType, WriterType>, options?: StateGraphAddNodeOptions][]): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in K]: NodeOutput }>>;
  addNode<K extends string, InputSchema extends StateDefinitionInit, NodeOutput extends U = U>(key: K, action: NodeAction<ExtractStateType<InputSchema>, NodeOutput, C, InterruptType, WriterType>, options: StateGraphAddNodeOptions<N | K, InputSchema>): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in K]: NodeOutput }>>;
  addNode<K extends string, InputSchema extends StateDefinitionInit, NodeOutput extends U = U>(key: K, action: NodeAction<ExtractStateType<InputSchema>, NodeOutput, C, InterruptType, WriterType>, options: StateGraphAddNodeOptions<N | K, InputSchema>): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in K]: NodeOutput }>>;
  addNode<K extends string, NodeInput = S, NodeOutput extends U = U>(key: K, action: NodeAction<NodeInput, NodeOutput, C, InterruptType, WriterType>, options?: StateGraphAddNodeOptions): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in K]: NodeOutput }>>;
  addNode<K extends string, NodeInput = S>(key: K, action: NodeAction<NodeInput, U, C, InterruptType, WriterType>, options?: StateGraphAddNodeOptions): StateGraph<SD, S, U, N | K, I, O, C, NodeReturnType>;
  addEdge(startKey: typeof START | N | N[], endKey: N | typeof END): this;
  addSequence<K extends string, NodeInput = S, NodeOutput extends U = U>(nodes: [key: K, action: NodeAction<NodeInput, NodeOutput, C, InterruptType, WriterType>, options?: StateGraphAddNodeOptions][]): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in K]: NodeOutput }>>;
  addSequence<K extends string, NodeMap extends Record<K, NodeAction<S, U, C, InterruptType, WriterType>>>(nodes: NodeMap): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in keyof NodeMap]: NodeMap[key] extends NodeAction<S, infer U, C, InterruptType, WriterType> ? U : never }>>;
  compile({
    checkpointer,
    store,
    cache,
    interruptBefore,
    interruptAfter,
    name,
    description
  }?: {
    checkpointer?: BaseCheckpointSaver | boolean;
    store?: BaseStore;
    cache?: BaseCache;
    interruptBefore?: N[] | All;
    interruptAfter?: N[] | All;
    name?: string;
    description?: string;
  }): CompiledStateGraph<Prettify<S>, Prettify<U>, N, I, O, C, NodeReturnType, InterruptType, WriterType>;
}
/**
 * Final result from building and compiling a {@link StateGraph}.
 * Should not be instantiated directly, only using the StateGraph `.compile()`
 * instance method.
 *
 * @typeParam S - The full state type representing the complete shape of your graph's
 *   state after all reducers have been applied. This is the type you receive when
 *   reading state in nodes or after invoking the graph.
 *
 * @typeParam U - The update type representing what nodes can return to modify state.
 *   Typically a partial of the state type, allowing nodes to update only specific fields.
 *   Can also include {@link Command} objects for advanced control flow.
 *
 * @typeParam N - Union of all node names in the graph (e.g., `"agent" | "tool"`).
 *   Used for type-safe routing with {@link Command.goto} and edge definitions.
 *
 * @typeParam I - The input schema definition. Determines what shape of data the graph
 *   accepts when invoked. Defaults to the main state schema if not explicitly set.
 *
 * @typeParam O - The output schema definition. Determines what shape of data the graph
 *   returns after execution. Defaults to the main state schema if not explicitly set.
 *
 * @typeParam C - The config/context schema definition. Defines additional configuration
 *   that can be passed to the graph at runtime via {@link LangGraphRunnableConfig}.
 *
 * @typeParam NodeReturnType - Constrains what types nodes in this graph can return.
 *   Useful for enforcing consistent return patterns across all nodes.
 *
 * @typeParam InterruptType - The type of values that can be passed when resuming from
 *   an {@link interrupt}. Used with human-in-the-loop patterns.
 *
 * @typeParam WriterType - The type for custom stream writers. Used with the `writer`
 *   option to enable typed custom streaming from within nodes.
 */
declare class CompiledStateGraph<S, U, N extends string = typeof START, I extends StateDefinitionInit = StateDefinition, O extends StateDefinitionInit = StateDefinition, C extends StateDefinitionInit = StateDefinition, NodeReturnType = unknown, InterruptType = unknown, WriterType = unknown> extends CompiledGraph<N, S, U, ExtractStateType<C>, ExtractUpdateType<I, ExtractStateType<I>>, ExtractStateType<O>, NodeReturnType, CommandInstance<InferInterruptResumeType<InterruptType>, Prettify<U>, N>, InferWriterType<WriterType>> {
  builder: StateGraph<unknown, S, U, N, I, O, C, NodeReturnType>;
  /**
   * The description of the compiled graph.
   * This is used by the supervisor agent to describe the handoff to the agent.
   */
  description?: string;
  /** @internal */
  _metaRegistry: SchemaMetaRegistry;
  constructor({
    description,
    ...rest
  }: {
    description?: string;
  } & ConstructorParameters<typeof CompiledGraph<N, S, U, ExtractStateType<C>, ExtractUpdateType<I, ExtractStateType<I>>, ExtractStateType<O>, NodeReturnType, CommandInstance<InferInterruptResumeType<InterruptType>, Prettify<U>, N>, InferWriterType<WriterType>>>[0]);
  attachNode(key: typeof START, node?: never): void;
  attachNode(key: N, node: StateGraphNodeSpec<S, U>): void;
  attachEdge(starts: N | N[] | "__start__", end: N | "__end__"): void;
  attachBranch(start: N | typeof START, _: string, branch: Branch<S, N>, options?: {
    withReader?: boolean;
  }): void;
  protected _validateInput(input: ExtractUpdateType<I, ExtractStateType<I>>): Promise<ExtractUpdateType<I, ExtractStateType<I>>>;
  isInterrupted(input: unknown): input is {
    [INTERRUPT]: Interrupt<InferInterruptInputType<InterruptType>>[];
  };
  protected _validateContext(config: Partial<Record<string, unknown>>): Promise<Partial<Record<string, unknown>>>;
}
//#endregion
export { CompiledStateGraph, StateGraph, StateGraphArgs };
//# sourceMappingURL=state.d.ts.map