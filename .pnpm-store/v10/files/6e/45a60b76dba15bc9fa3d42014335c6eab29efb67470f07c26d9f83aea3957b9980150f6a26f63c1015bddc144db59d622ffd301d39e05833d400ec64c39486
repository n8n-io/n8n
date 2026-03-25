import { BaseChannel } from "../channels/base.js";
import { InteropZodToStateDefinition, SchemaMetaRegistry } from "./zod/meta.js";
import { RunnableLike, Runtime } from "../pregel/runnable_types.js";
import { AnnotationRoot, SingleReducer, StateDefinition, StateType, UpdateType } from "./annotation.js";
import { CachePolicy, RetryPolicy } from "../pregel/utils/index.js";
import { Command, CommandInstance, END, INTERRUPT, Interrupt, START } from "../constants.js";
import { AddNodeOptions, Branch, CompiledGraph, Graph, NodeSpec } from "./graph.js";
import { InferInterruptInputType, InferInterruptResumeType } from "../interrupt.js";
import { InferWriterType } from "../writer.js";
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
type StateGraphAddNodeOptions<Nodes extends string = string> = {
  retryPolicy?: RetryPolicy;
  cachePolicy?: CachePolicy | boolean;
  // TODO: Fix generic typing for annotations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input?: AnnotationRoot<any> | InteropZodObject;
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
type ZodStateGraphArgsWithStateSchema<SD extends InteropZodObject, I extends SDZod, O extends SDZod> = {
  state: SD;
  input?: I;
  output?: O;
};
type SDZod = StateDefinition | InteropZodObject;
type ToStateDefinition<T> = T extends InteropZodObject ? InteropZodToStateDefinition<T> : T extends StateDefinition ? T : never;
type NodeAction<S, U, C extends SDZod, InterruptType, WriterType> = RunnableLike<S, U extends object ? U & Record<string, any> : U,
// eslint-disable-line @typescript-eslint/no-explicit-any
Runtime<StateType<ToStateDefinition<C>>, InterruptType, WriterType>>;
type StrictNodeAction<S, U, C extends SDZod, Nodes extends string, InterruptType, WriterType> = RunnableLike<Prettify<S>, U | Command<InferInterruptResumeType<InterruptType>,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
U & Record<string, any>, Nodes>, Runtime<StateType<ToStateDefinition<C>>, InterruptType, WriterType>>;
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
declare class StateGraph<SD extends SDZod | unknown, S = (SD extends SDZod ? StateType<ToStateDefinition<SD>> : SD), U = (SD extends SDZod ? UpdateType<ToStateDefinition<SD>> : Partial<S>), N extends string = typeof START, I extends SDZod = (SD extends SDZod ? ToStateDefinition<SD> : StateDefinition), O extends SDZod = (SD extends SDZod ? ToStateDefinition<SD> : StateDefinition), C extends SDZod = StateDefinition, NodeReturnType = unknown, InterruptType = unknown, WriterType = unknown> extends Graph<N, S, U, StateGraphNodeSpec<S, U>, ToStateDefinition<C>> {
  channels: Record<string, BaseChannel>;
  // TODO: this doesn't dedupe edges as in py, so worth fixing at some point
  waitingEdges: Set<[N[], N]>;
  /** @internal */
  _schemaDefinition: StateDefinition;
  /** @internal */
  _schemaRuntimeDefinition: InteropZodObject | undefined;
  /** @internal */
  _inputDefinition: I;
  /** @internal */
  _inputRuntimeDefinition: InteropZodObject | PartialStateSchema | undefined;
  /** @internal */
  _outputDefinition: O;
  /** @internal */
  _outputRuntimeDefinition: InteropZodObject | undefined;
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
  constructor(state: SD extends StateDefinition ? AnnotationRoot<SD> : never, options?: {
    context?: C | AnnotationRoot<ToStateDefinition<C>>;
    input?: I | AnnotationRoot<ToStateDefinition<I>>;
    output?: O | AnnotationRoot<ToStateDefinition<O>>;
    interrupt?: InterruptType;
    writer?: WriterType;
    nodes?: N[];
  });
  constructor(state: SD extends InteropZodObject ? SD : never, options?: {
    context?: C | AnnotationRoot<ToStateDefinition<C>>;
    input?: I | AnnotationRoot<ToStateDefinition<I>>;
    output?: O | AnnotationRoot<ToStateDefinition<O>>;
    interrupt?: InterruptType;
    writer?: WriterType;
    nodes?: N[];
  });
  constructor(fields: SD extends StateDefinition ? StateGraphArgsWithInputOutputSchemas<SD, ToStateDefinition<O>> : never, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  constructor(fields: SD extends StateDefinition ? AnnotationRoot<SD> | StateGraphArgsWithStateSchema<SD, ToStateDefinition<I>, ToStateDefinition<O>> : never, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  /** @deprecated Use `Annotation.Root` or `zod` for state definition instead. */
  constructor(fields: SD extends StateDefinition ? SD | StateGraphArgs<S> : StateGraphArgs<S>, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  constructor(fields: SD extends InteropZodObject ? SD | ZodStateGraphArgsWithStateSchema<SD, I, O> : never, contextSchema?: C | AnnotationRoot<ToStateDefinition<C>>);
  get allEdges(): Set<[string, string]>;
  _addSchema(stateDefinition: SDZod): void;
  addNode<K extends string, NodeMap extends Record<K, NodeAction<S, U, C, InterruptType, WriterType>>>(nodes: NodeMap): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in keyof NodeMap]: NodeMap[key] extends NodeAction<S, infer U, C, InterruptType, WriterType> ? U : never }>>;
  addNode<K extends string, NodeInput = S, NodeOutput extends U = U>(nodes: [key: K, action: NodeAction<NodeInput, NodeOutput, C, InterruptType, WriterType>, options?: StateGraphAddNodeOptions][]): StateGraph<SD, S, U, N | K, I, O, C, MergeReturnType<NodeReturnType, { [key in K]: NodeOutput }>>;
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
 */
declare class CompiledStateGraph<S, U, N extends string = typeof START, I extends SDZod = StateDefinition, O extends SDZod = StateDefinition, C extends SDZod = StateDefinition, NodeReturnType = unknown, InterruptType = unknown, WriterType = unknown> extends CompiledGraph<N, S, U, StateType<ToStateDefinition<C>>, UpdateType<ToStateDefinition<I>>, StateType<ToStateDefinition<O>>, NodeReturnType, CommandInstance<InferInterruptResumeType<InterruptType>, Prettify<U>, N>, InferWriterType<WriterType>> {
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
  } & ConstructorParameters<typeof CompiledGraph<N, S, U, StateType<ToStateDefinition<C>>, UpdateType<ToStateDefinition<I>>, StateType<ToStateDefinition<O>>, NodeReturnType, CommandInstance<InferInterruptResumeType<InterruptType>, Prettify<U>, N>, InferWriterType<WriterType>>>[0]);
  attachNode(key: typeof START, node?: never): void;
  attachNode(key: N, node: StateGraphNodeSpec<S, U>): void;
  attachEdge(starts: N | N[] | "__start__", end: N | "__end__"): void;
  attachBranch(start: N | typeof START, _: string, branch: Branch<S, N>, options?: {
    withReader?: boolean;
  }): void;
  protected _validateInput(input: UpdateType<ToStateDefinition<I>>): Promise<UpdateType<ToStateDefinition<I>>>;
  isInterrupted(input: unknown): input is {
    [INTERRUPT]: Interrupt<InferInterruptInputType<InterruptType>>[];
  };
  protected _validateContext(config: Partial<Record<string, unknown>>): Promise<Partial<Record<string, unknown>>>;
}
//#endregion
export { CompiledStateGraph, StateGraph, StateGraphArgs };
//# sourceMappingURL=state.d.ts.map