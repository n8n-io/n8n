import { CommandInstance, END, Send } from "../constants.js";
import { InteropZodToStateDefinition } from "./zod/meta.js";
import { LangGraphRunnableConfig } from "../pregel/runnable_types.js";
import { AnnotationRoot, StateDefinition, StateType, UpdateType } from "./annotation.js";
import { AnyStateSchema, StateSchema, StateSchemaFieldsToStateDefinition } from "../state/schema.js";
import { InteropZodObject } from "@langchain/core/utils/types";
import { StandardSchemaV1 } from "@standard-schema/spec";

//#region src/graph/types.d.ts
/**
 * Convert any supported schema type to a StateDefinition.
 *
 * @internal
 */
type ToStateDefinition<T> = T extends StateSchema<infer TInit> ? StateSchemaFieldsToStateDefinition<TInit> : T extends AnnotationRoot<infer SD> ? SD : T extends InteropZodObject ? InteropZodToStateDefinition<T> : T extends StateDefinition ? T : never;
/**
 * Type for schema types that can be used to initialize state.
 * Supports all valid schema types: StateDefinition, Zod objects, StateSchema, and AnnotationRoot.
 *
 * @internal
 */
type StateDefinitionInit = StateDefinition | InteropZodObject | AnyStateSchema | AnnotationRoot<any>;
/**
 * Valid types for context schema.
 * Context doesn't have channels/reducers, so StateSchema is NOT supported.
 * Supports StandardSchemaV1 (Zod, Valibot, etc.) and AnnotationRoot (backward compat).
 *
 * @internal
 */
type ContextSchemaInit = StandardSchemaV1 | AnnotationRoot<StateDefinition>;
/**
 * Initialization options for StateGraph.
 * Accepts any combination of schema types for state/input/output.
 *
 * Supports both `state` and `stateSchema` as aliases for backward compatibility.
 * If only `input` is provided (no state/stateSchema), `input` is used as the state schema.
 *
 * @template SD - State definition type
 * @template I - Input definition type (defaults to undefined)
 * @template O - Output definition type (defaults to undefined)
 * @template C - Context schema type (defaults to undefined)
 * @template N - Node name union type (defaults to string)
 * @template InterruptType - Interrupt type (defaults to unknown)
 * @template WriterType - Writer type (defaults to unknown)
 */
type StateGraphInit<SD extends StateDefinitionInit = StateDefinitionInit, I extends StateDefinitionInit | undefined = undefined, O extends StateDefinitionInit | undefined = undefined, C extends StateDefinitionInit | undefined = undefined, N extends string = string, InterruptType = unknown, WriterType = unknown> = {
  /** Primary key for state schema */state?: SD;
  /**
   * @deprecated Use `state` instead. Will be removed in a future version.
   */
  stateSchema?: SD;
  input?: I;
  output?: O; /** Context schema for runtime configuration validation. Does not support StateSchema. */
  context?: C;
  interrupt?: InterruptType;
  writer?: WriterType;
  nodes?: N[];
};
/**
 * Options for the second argument when passing a direct schema.
 * Excludes `state` and `stateSchema` since those come from the first arg.
 *
 * @internal
 */
type StateGraphOptions<I extends StateDefinitionInit | undefined = undefined, O extends StateDefinitionInit | undefined = undefined, C extends StateDefinitionInit | undefined = undefined, N extends string = string, InterruptType = unknown, WriterType = unknown> = Omit<StateGraphInit<StateDefinitionInit, I, O, C, N, InterruptType, WriterType>, "state" | "stateSchema">;
/**
 * Extract the State type from any supported schema type.
 *
 * Supports:
 * - StateSchema
 * - AnnotationRoot
 * - StateDefinition (internal channel definitions)
 * - InteropZodObject (Zod v3/v4 object schemas)
 *
 * @template Schema - The schema type to extract state from
 * @template Fallback - Type to return if schema doesn't match (default: never)
 */
type ExtractStateType<Schema, Fallback = Schema> = Schema extends AnnotationRoot<infer SD> ? StateType<SD> : StateType<ToStateDefinition<Schema>> extends infer S ? [S] extends [never] ? Fallback : S : Fallback;
/**
 * Extract the Update type from any supported schema type.
 *
 * The Update type represents what a node can return to update the state.
 * All fields are optional since nodes only need to return the fields they modify.
 *
 * Supports:
 * - StateSchema
 * - AnnotationRoot
 * - StateDefinition (internal channel definitions)
 * - InteropZodObject (Zod v3/v4 object schemas)
 *
 * @template Schema - The schema type to extract update type from
 * @template FallbackBase - Base type for fallback (will be partialized), defaults to Schema
 */
type ExtractUpdateType<Schema, FallbackBase = Schema> = Schema extends AnnotationRoot<infer SD> ? UpdateType<SD> : UpdateType<ToStateDefinition<Schema>> extends infer U ? [U] extends [never] ? Partial<FallbackBase> : U : Partial<FallbackBase>;
/**
 * Extract the input type from a type bag, using ExtractStateType on the InputSchema.
 * Falls back to Default if InputSchema is not provided.
 * @internal
 */
type ExtractBagInput<Bag, Default> = Bag extends {
  InputSchema: infer I;
} ? ExtractStateType<I> : Default;
/**
 * Extract the output type from a type bag, using ExtractUpdateType on the OutputSchema.
 * Falls back to Default if OutputSchema is not provided.
 * @internal
 */
type ExtractBagOutput<Bag, Default> = Bag extends {
  OutputSchema: infer O;
} ? ExtractUpdateType<O> : Default;
/**
 * Extract the context type from a type bag, using ExtractStateType on the ContextSchema.
 * Falls back to Default if ContextSchema is not provided.
 * Ensures result extends Record<string, unknown> for LangGraphRunnableConfig compatibility.
 * @internal
 */
type ExtractBagContext<Bag, Default extends Record<string, unknown>> = Bag extends {
  ContextSchema: infer C;
} ? ExtractStateType<C> extends infer Ctx ? Ctx extends Record<string, unknown> ? Ctx : Default : Default : Default;
/**
 * Extract the Nodes type from a type bag.
 * Falls back to Default if Nodes is not provided.
 * @internal
 */
type ExtractBagNodes<Bag, Default extends string> = Bag extends {
  Nodes: infer N extends string;
} ? N : Default;
/**
 * Type bag for GraphNode that accepts schema types.
 * All fields are optional - unspecified fields use defaults.
 *
 * This enables separate input/output schemas for nodes, which is useful when
 * a node receives a subset of state fields and returns different fields.
 *
 * @example
 * ```typescript
 * const node: GraphNode<{
 *   InputSchema: typeof NodeInputSchema;
 *   OutputSchema: typeof NodeOutputSchema;
 *   ContextSchema: typeof ContextSchema;
 *   Nodes: "agent" | "tool";
 * }> = (state, runtime) => {
 *   return { answer: `Response to: ${state.query}` };
 * };
 * ```
 */
interface GraphNodeTypes<InputSchema = unknown, OutputSchema = unknown, ContextSchema = unknown, Nodes extends string = string> {
  /** Schema for node input state (uses ExtractStateType) */
  InputSchema?: InputSchema;
  /** Schema for node output/update (uses ExtractUpdateType) */
  OutputSchema?: OutputSchema;
  /** Schema for runtime context (uses ExtractStateType) */
  ContextSchema?: ContextSchema;
  /** Union of valid node names for Command.goto */
  Nodes?: Nodes;
}
/**
 * Detect if T is a type bag (has InputSchema or OutputSchema) or a direct schema.
 * @internal
 */
type IsGraphNodeTypeBag<T> = T extends {
  InputSchema: unknown;
} ? true : T extends {
  OutputSchema: unknown;
} ? true : false;
/**
 * Return value type for GraphNode functions.
 * Nodes can return an update object, a Command, or a Promise of either.
 *
 * @template Update - The update type (what fields can be returned)
 * @template Nodes - Union of valid node names for Command.goto
 */
type GraphNodeReturnValue<Update, Nodes extends string = string> = Update | CommandInstance<unknown, Update, Nodes> | Promise<Update | CommandInstance<unknown, Update, Nodes>>;
/**
 * Strongly-typed utility for authoring graph nodes outside of the StateGraph builder,
 * supporting inference for both state (from Schema) and config context (from Context type).
 *
 * This type enables you to define graph node functions with full type safety—both
 * for the evolving state and for additional context that may be passed in at runtime.
 * Typing the context parameter allows for better code organization and precise editor support.
 *
 * Works with StateSchema, AnnotationRoot, and Zod object schemas for state, and
 * with a user-defined object shape for context.
 *
 * **Supports two patterns:**
 *
 * 1. **Single schema usage** - Single schema for both input and output:
 *    `GraphNode<Schema, Context, Nodes>`
 *
 * 2. **Type bag pattern** - Separate schemas for input, output, context:
 *    `GraphNode<{ InputSchema; OutputSchema; ContextSchema; Nodes }>`
 *
 * @template Schema - The state schema type (StateSchema, AnnotationRoot, InteropZodObject) OR a type bag
 * @template Context - The type of the context passed into this node (default: Record<string, unknown>)
 * @template Nodes - An optional union of valid node names for Command.goto, used for type-safe routing (default: string)
 *
 * @example Single schema usage
 * ```typescript
 * import { StateSchema, GraphNode } from "@langchain/langgraph";
 * import { z } from "zod/v4";
 *
 * const AgentState = new StateSchema({
 *   messages: MessagesValue,
 *   step: z.number().default(0),
 * });
 *
 * // Context shape for custom node logic (optional)
 * type MyContext = { userId: string };
 *
 * // Node receiving state and config
 * const processNode: GraphNode<typeof AgentState, MyContext> = (state, config) => {
 *   const userId = config.configurable?.userId; // type-safe context access
 *   return { step: state.step + 1 };
 * };
 *
 * // Node with type-safe graph routing
 * const routerNode: GraphNode<typeof AgentState, MyContext, "agent" | "tool"> = (state, config) => {
 *   if (state.needsTool) {
 *     return new Command({ goto: "tool", update: { step: state.step + 1 } });
 *   }
 *   return new Command({ goto: "agent" });
 * };
 *
 * // Use in graph
 * const graph = new StateGraph(AgentState)
 *   .addNode("process", processNode)
 *   .addNode("router", routerNode)
 *   .compile();
 * ```
 *
 * @example Type bag pattern - separate input/output schemas
 * ```typescript
 * const InputSchema = new StateSchema({
 *   messages: z.array(z.string()),
 *   query: z.string(),
 * });
 *
 * const OutputSchema = new StateSchema({
 *   answer: z.string(),
 * });
 *
 * const ContextSchema = z.object({ userId: z.string() });
 *
 * const node: GraphNode<{
 *   InputSchema: typeof InputSchema;
 *   OutputSchema: typeof OutputSchema;
 *   ContextSchema: typeof ContextSchema;
 *   Nodes: "agent" | "tool";
 * }> = (state, config) => {
 *   // state is { messages: string[]; query: string }
 *   // config.configurable is { userId: string } | undefined
 *   return { answer: `Response to: ${state.query}` };
 * };
 * ```
 */
type GraphNode<Schema, Context extends Record<string, any> = Record<string, any>, Nodes extends string = string> = IsGraphNodeTypeBag<Schema> extends true ? (state: ExtractBagInput<Schema, unknown>, config: LangGraphRunnableConfig<ExtractBagContext<Schema, Record<string, unknown>>>) => GraphNodeReturnValue<ExtractBagOutput<Schema, Partial<ExtractBagInput<Schema, unknown>>>, ExtractBagNodes<Schema, string>> : (state: ExtractStateType<Schema>, config: LangGraphRunnableConfig<Context>) => GraphNodeReturnValue<ExtractUpdateType<Schema>, Nodes>;
/**
 * Type bag for ConditionalEdgeRouter that accepts schema types.
 * Unlike GraphNodeTypes, conditional edges don't have separate input/output -
 * they just read state and return routing decisions.
 *
 * @example
 * ```typescript
 * const router: ConditionalEdgeRouter<{
 *   Schema: typeof StateSchema;
 *   ContextSchema: typeof ContextSchema;
 *   Nodes: "agent" | "tool";
 * }> = (state, config) => {
 *   return state.done ? END : "agent";
 * };
 * ```
 */
interface ConditionalEdgeRouterTypes<InputSchema = unknown, ContextSchema = unknown, Nodes extends string = string> {
  /** Schema for router state (uses ExtractStateType) */
  InputSchema?: InputSchema;
  /** Schema for runtime context (uses ExtractStateType) */
  ContextSchema?: ContextSchema;
  /** Union of valid node names that can be routed to */
  Nodes?: Nodes;
}
/**
 * Detect if T is a ConditionalEdgeRouterTypes bag.
 * @internal
 */
type IsConditionalEdgeRouterTypeBag<T> = T extends {
  InputSchema: unknown;
} ? true : T extends {
  ContextSchema: unknown;
} ? true : false;
/**
 * Return type for conditional edge routing functions.
 */
type ConditionalEdgeRouterReturnValue<Nodes extends string, State> = Nodes | typeof END | Send<Nodes, State> | Array<Nodes | Send<Nodes, State>>;
/**
 * Type for conditional edge routing functions.
 *
 * Use this to type functions passed to `addConditionalEdges` for
 * full type safety on state, runtime context, and return values.
 *
 * **Supports two patterns:**
 *
 * 1. **Single schema pattern** - Single schema:
 *    `ConditionalEdgeRouter<Schema, Context, Nodes>`
 *
 * 2. **Type bag pattern** - Separate schemas for state, context:
 *    `ConditionalEdgeRouter<{ Schema; ContextSchema; Nodes }>`
 *
 * @template Schema - The state schema type OR a type bag
 * @template Context - The runtime context type available to node logic
 * @template Nodes - Union of valid node names that can be routed to
 *
 * @example Single schema pattern
 * ```typescript
 * type MyContext = { userId: string };
 * const router: ConditionalEdgeRouter<typeof AgentState, MyContext, "agent" | "tool"> =
 *   (state, config) => {
 *     const userId = config.context?.userId;
 *     if (state.done) return END;
 *     return state.needsTool ? "tool" : "agent";
 *   };
 *
 * graph.addConditionalEdges("router", router, ["agent", "tool"]);
 * ```
 *
 * @example Type bag pattern
 * ```typescript
 * const router: ConditionalEdgeRouter<{
 *   Schema: typeof StateSchema;
 *   ContextSchema: typeof ContextSchema;
 *   Nodes: "agent" | "tool";
 * }> = (state, config) => {
 *   if (state.done) return END;
 *   return "agent";
 * };
 * ```
 */
type ConditionalEdgeRouter<Schema, Context extends Record<string, any> = Record<string, any>, Nodes extends string = string> = IsConditionalEdgeRouterTypeBag<Schema> extends true ? (state: ExtractBagInput<Schema, unknown>, config: LangGraphRunnableConfig<ExtractBagContext<Schema, Record<string, unknown>>>) => ConditionalEdgeRouterReturnValue<ExtractBagNodes<Schema, string>, ExtractBagInput<Schema, unknown>> | Promise<ConditionalEdgeRouterReturnValue<ExtractBagNodes<Schema, string>, ExtractBagInput<Schema, unknown>>> : (state: ExtractStateType<Schema>, config: LangGraphRunnableConfig<Context>) => ConditionalEdgeRouterReturnValue<Nodes, ExtractStateType<Schema>> | Promise<ConditionalEdgeRouterReturnValue<Nodes, ExtractStateType<Schema>>>;
//#endregion
export { ConditionalEdgeRouter, ConditionalEdgeRouterTypes, ContextSchemaInit, ExtractStateType, ExtractUpdateType, GraphNode, GraphNodeReturnValue, GraphNodeTypes, StateDefinitionInit, StateGraphInit, StateGraphOptions, ToStateDefinition };
//# sourceMappingURL=types.d.ts.map