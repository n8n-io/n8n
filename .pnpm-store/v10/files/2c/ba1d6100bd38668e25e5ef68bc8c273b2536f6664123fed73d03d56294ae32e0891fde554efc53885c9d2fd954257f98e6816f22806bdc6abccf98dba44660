import { Command, Interrupt } from "./constants.cjs";

//#region src/errors.d.ts
type BaseLangGraphErrorFields = {
  lc_error_code?: "GRAPH_RECURSION_LIMIT" | "INVALID_CONCURRENT_GRAPH_UPDATE" | "INVALID_GRAPH_NODE_RETURN_VALUE" | "MISSING_CHECKPOINTER" | "MULTIPLE_SUBGRAPHS" | "UNREACHABLE_NODE";
};
/** @category Errors */
declare class BaseLangGraphError extends Error {
  lc_error_code?: string;
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
}
declare class GraphBubbleUp extends BaseLangGraphError {
  get is_bubble_up(): boolean;
}
declare class GraphRecursionError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
declare class GraphValueError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
declare class GraphInterrupt extends GraphBubbleUp {
  interrupts: Interrupt[];
  constructor(interrupts?: Interrupt[], fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
/** Raised by a node to interrupt execution. */
declare class NodeInterrupt extends GraphInterrupt {
  constructor(message: any, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
declare class ParentCommand extends GraphBubbleUp {
  command: Command;
  constructor(command: Command);
  static get unminifiable_name(): string;
}
declare function isParentCommand(e?: unknown): e is ParentCommand;
declare function isGraphBubbleUp(e?: unknown): e is GraphBubbleUp;
declare function isGraphInterrupt(e?: unknown): e is GraphInterrupt;
declare class EmptyInputError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
declare class EmptyChannelError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
declare class InvalidUpdateError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
/**
 * @deprecated This exception type is no longer thrown.
 */
declare class MultipleSubgraphsError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
declare class UnreachableNodeError extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
/**
 * Exception raised when an error occurs in the remote graph.
 */
declare class RemoteException extends BaseLangGraphError {
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  static get unminifiable_name(): string;
}
/**
 * Error thrown when invalid input is provided to a StateGraph.
 *
 * This typically means that the input to the StateGraph constructor or builder
 * did not match the required types. A valid input should be a
 * StateDefinition, an Annotation.Root, or a Zod schema.
 *
 * @example
 * // Example of incorrect usage:
 * try {
 *   new StateGraph({ foo: "bar" }); // Not a valid input
 * } catch (err) {
 *   if (err instanceof StateGraphInputError) {
 *     console.error(err.message);
 *   }
 * }
 */
declare class StateGraphInputError extends BaseLangGraphError {
  /**
   * Create a new StateGraphInputError.
   * @param message - Optional custom error message.
   * @param fields - Optional additional error fields.
   */
  constructor(message?: string, fields?: BaseLangGraphErrorFields);
  /**
   * The unminifiable (static, human-readable) error name for this error class.
   */
  static get unminifiable_name(): string;
}
/**
 * Used for subgraph detection.
 */
declare const getSubgraphsSeenSet: () => any;
//#endregion
export { BaseLangGraphError, BaseLangGraphErrorFields, EmptyChannelError, EmptyInputError, GraphBubbleUp, GraphInterrupt, GraphRecursionError, GraphValueError, InvalidUpdateError, MultipleSubgraphsError, NodeInterrupt, ParentCommand, RemoteException, StateGraphInputError, UnreachableNodeError, getSubgraphsSeenSet, isGraphBubbleUp, isGraphInterrupt, isParentCommand };
//# sourceMappingURL=errors.d.cts.map