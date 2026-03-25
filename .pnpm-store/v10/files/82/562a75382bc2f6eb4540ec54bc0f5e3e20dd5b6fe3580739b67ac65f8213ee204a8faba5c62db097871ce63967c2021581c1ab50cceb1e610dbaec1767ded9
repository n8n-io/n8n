import { BaseChannel } from "../channels/base.js";
import { BinaryOperator, BinaryOperatorAggregate } from "../channels/binop.js";
import { LastValue } from "../channels/last_value.js";
import { RunnableLike } from "../pregel/runnable_types.js";

//#region src/graph/annotation.d.ts
type SingleReducer<ValueType, UpdateType = ValueType> = {
  reducer: BinaryOperator<ValueType, UpdateType>;
  default?: () => ValueType;
} | {
  /**
   * @deprecated Use `reducer` instead
   */
  value: BinaryOperator<ValueType, UpdateType>;
  default?: () => ValueType;
} | null;
interface StateDefinition {
  [key: string]: BaseChannel | (() => BaseChannel);
}
type ExtractValueType<C> = C extends BaseChannel ? C["ValueType"] : C extends (() => BaseChannel) ? ReturnType<C>["ValueType"] : never;
type ExtractUpdateType<C> = C extends BaseChannel ? C["UpdateType"] : C extends (() => BaseChannel) ? ReturnType<C>["UpdateType"] : never;
type StateType<SD extends StateDefinition> = { [key in keyof SD]: ExtractValueType<SD[key]> };
type UpdateType<SD extends StateDefinition> = { [key in keyof SD]?: ExtractUpdateType<SD[key]> };
type NodeType<SD extends StateDefinition> = RunnableLike<StateType<SD>, UpdateType<SD> | Partial<StateType<SD>>>;
/** @ignore */
interface AnnotationFunction {
  <ValueType>(): LastValue<ValueType>;
  <ValueType, UpdateType = ValueType>(annotation: SingleReducer<ValueType, UpdateType>): BinaryOperatorAggregate<ValueType, UpdateType>;
  Root: <S extends StateDefinition>(sd: S) => AnnotationRoot<S>;
}
/**
 * Should not be instantiated directly. See {@link Annotation}.
 */
declare class AnnotationRoot<SD extends StateDefinition> {
  lc_graph_name: string;
  State: StateType<SD>;
  Update: UpdateType<SD>;
  Node: NodeType<SD>;
  spec: SD;
  constructor(s: SD);
}
/**
 * Helper that instantiates channels within a StateGraph state.
 *
 * Can be used as a field in an {@link Annotation.Root} wrapper in one of two ways:
 * 1. **Directly**: Creates a channel that stores the most recent value returned from a node.
 * 2. **With a reducer**: Creates a channel that applies the reducer on a node's return value.
 *
 * @example
 * ```ts
 * import { StateGraph, Annotation } from "@langchain/langgraph";
 *
 * // Define a state with a single string key named "currentOutput"
 * const SimpleAnnotation = Annotation.Root({
 *   currentOutput: Annotation<string>,
 * });
 *
 * const graphBuilder = new StateGraph(SimpleAnnotation);
 *
 * // A node in the graph that returns an object with a "currentOutput" key
 * // replaces the value in the state. You can get the state type as shown below:
 * const myNode = (state: typeof SimpleAnnotation.State) => {
 *   return {
 *     currentOutput: "some_new_value",
 *   };
 * }
 *
 * const graph = graphBuilder
 *   .addNode("myNode", myNode)
 *   ...
 *   .compile();
 * ```
 *
 * @example
 * ```ts
 * import { type BaseMessage, AIMessage } from "@langchain/core/messages";
 * import { StateGraph, Annotation } from "@langchain/langgraph";
 *
 * // Define a state with a single key named "messages" that will
 * // combine a returned BaseMessage or arrays of BaseMessages
 * const AnnotationWithReducer = Annotation.Root({
 *   messages: Annotation<BaseMessage[]>({
 *     // Different types are allowed for updates
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
 * const graphBuilder = new StateGraph(AnnotationWithReducer);
 *
 * // A node in the graph that returns an object with a "messages" key
 * // will update the state by combining the existing value with the returned one.
 * const myNode = (state: typeof AnnotationWithReducer.State) => {
 *   return {
 *     messages: [new AIMessage("Some new response")],
 *   };
 * };
 *
 * const graph = graphBuilder
 *   .addNode("myNode", myNode)
 *   ...
 *   .compile();
 * ```
 * @namespace
 * @property Root
 * Helper function that instantiates a StateGraph state. See {@link Annotation} for usage.
 */
declare const Annotation: AnnotationFunction;
//#endregion
export { Annotation, AnnotationRoot, NodeType, SingleReducer, StateDefinition, StateType, UpdateType };
//# sourceMappingURL=annotation.d.ts.map