import { Command, Interrupt } from "./constants.cjs";

//#region src/errors.d.ts
// When editing, make sure to update the index found here:
// https://langchain-ai.github.io/langgraphjs/troubleshooting/errors/
type BaseLangGraphErrorFields = {
  lc_error_code?: "GRAPH_RECURSION_LIMIT" | "INVALID_CONCURRENT_GRAPH_UPDATE" | "INVALID_GRAPH_NODE_RETURN_VALUE" | "MISSING_CHECKPOINTER" | "MULTIPLE_SUBGRAPHS" | "UNREACHABLE_NODE";
};
// TODO: Merge with base LangChain error class when we drop support for core@0.2.0
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Used for subgraph detection.
 */
declare const getSubgraphsSeenSet: () => any;
//#endregion
export { BaseLangGraphError, BaseLangGraphErrorFields, EmptyChannelError, EmptyInputError, GraphBubbleUp, GraphInterrupt, GraphRecursionError, GraphValueError, InvalidUpdateError, MultipleSubgraphsError, NodeInterrupt, ParentCommand, RemoteException, UnreachableNodeError, getSubgraphsSeenSet, isGraphBubbleUp, isGraphInterrupt, isParentCommand };
//# sourceMappingURL=errors.d.cts.map