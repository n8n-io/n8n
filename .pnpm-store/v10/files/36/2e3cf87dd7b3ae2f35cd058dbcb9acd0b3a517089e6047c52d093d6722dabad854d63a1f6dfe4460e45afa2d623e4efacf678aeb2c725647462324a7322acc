import { BaseMessage, BaseMessageChunk, BaseMessageFields } from "./base.js";
import { $InferMessageContent, MessageStructure } from "./message.js";

//#region src/messages/tool.d.ts
interface ToolMessageFields<TStructure extends MessageStructure = MessageStructure> extends BaseMessageFields<TStructure, "tool"> {
  /**
   * Artifact of the Tool execution which is not meant to be sent to the model.
   *
   * Should only be specified if it is different from the message content, e.g. if only
   * a subset of the full tool output is being passed as message content but the full
   * output is needed in other parts of the code.
   */
  artifact?: any;
  tool_call_id: string;
  status?: "success" | "error";
  metadata?: Record<string, unknown>;
}
/**
 * Marker parameter for objects that tools can return directly.
 *
 * If a custom BaseTool is invoked with a ToolCall and the output of custom code is
 * not an instance of DirectToolOutput, the output will automatically be coerced to
 * a string and wrapped in a ToolMessage.
 */
interface DirectToolOutput {
  readonly lc_direct_tool_output: true;
}
declare function isDirectToolOutput(x: unknown): x is DirectToolOutput;
/**
 * Represents a tool message in a conversation.
 */
declare class ToolMessage<TStructure extends MessageStructure = MessageStructure> extends BaseMessage<TStructure, "tool"> implements DirectToolOutput {
  static lc_name(): string;
  get lc_aliases(): Record<string, string>;
  lc_direct_tool_output: true;
  readonly type: "tool";
  /**
   * Status of the tool invocation.
   * @version 0.2.19
   */
  status?: "success" | "error";
  tool_call_id: string;
  metadata?: Record<string, unknown>;
  /**
   * Artifact of the Tool execution which is not meant to be sent to the model.
   *
   * Should only be specified if it is different from the message content, e.g. if only
   * a subset of the full tool output is being passed as message content but the full
   * output is needed in other parts of the code.
   */
  artifact?: any;
  constructor(fields: $InferMessageContent<TStructure, "tool"> | ToolMessageFields, tool_call_id: string, name?: string);
  constructor(fields: ToolMessageFields<TStructure>);
  /**
   * Type guard to check if an object is a ToolMessage.
   * Preserves the MessageStructure type parameter when called with a typed BaseMessage.
   * @overload When called with a typed BaseMessage, preserves the TStructure type
   */
  static isInstance<T extends MessageStructure>(message: BaseMessage<T>): message is BaseMessage<T> & ToolMessage<T>;
  /**
   * Type guard to check if an object is a ToolMessage.
   * @overload When called with unknown, returns base ToolMessage type
   */
  static isInstance(message: unknown): message is ToolMessage;
  get _printableFields(): Record<string, unknown>;
}
/**
 * Represents a chunk of a tool message, which can be concatenated
 * with other tool message chunks.
 */
declare class ToolMessageChunk<TStructure extends MessageStructure = MessageStructure> extends BaseMessageChunk<TStructure, "tool"> {
  readonly type: "tool";
  tool_call_id: string;
  /**
   * Status of the tool invocation.
   * @version 0.2.19
   */
  status?: "success" | "error";
  /**
   * Artifact of the Tool execution which is not meant to be sent to the model.
   *
   * Should only be specified if it is different from the message content, e.g. if only
   * a subset of the full tool output is being passed as message content but the full
   * output is needed in other parts of the code.
   */
  artifact?: any;
  constructor(fields: ToolMessageFields<TStructure>);
  static lc_name(): string;
  concat(chunk: ToolMessageChunk<TStructure>): this;
  get _printableFields(): Record<string, unknown>;
}
interface ToolCall<TName extends string = string, TArgs extends Record<string, any> = Record<string, any>> {
  readonly type?: "tool_call";
  /**
   * If provided, an identifier associated with the tool call
   */
  id?: string;
  /**
   * The name of the tool being called
   */
  name: TName;
  /**
   * The arguments to the tool call
   */
  args: TArgs;
}
/**
 * A chunk of a tool call (e.g., as part of a stream).
 * When merging ToolCallChunks (e.g., via AIMessageChunk.__add__),
 * all string attributes are concatenated. Chunks are only merged if their
 * values of `index` are equal and not None.
 *
 * @example
 * ```ts
 * const leftChunks = [
 *   {
 *     name: "foo",
 *     args: '{"a":',
 *     index: 0
 *   }
 * ];
 *
 * const leftAIMessageChunk = new AIMessageChunk({
 *   content: "",
 *   tool_call_chunks: leftChunks
 * });
 *
 * const rightChunks = [
 *   {
 *     name: undefined,
 *     args: '1}',
 *     index: 0
 *   }
 * ];
 *
 * const rightAIMessageChunk = new AIMessageChunk({
 *   content: "",
 *   tool_call_chunks: rightChunks
 * });
 *
 * const result = leftAIMessageChunk.concat(rightAIMessageChunk);
 * // result.tool_call_chunks is equal to:
 * // [
 * //   {
 * //     name: "foo",
 * //     args: '{"a":1}'
 * //     index: 0
 * //   }
 * // ]
 * ```
 */
interface ToolCallChunk<TName extends string = string> {
  readonly type?: "tool_call_chunk";
  /**
   * If provided, a substring of an identifier for the tool call
   */
  id?: string;
  /**
   * If provided, a substring of the name of the tool to be called
   */
  name?: TName;
  /**
   * If provided, a JSON substring of the arguments to the tool call
   */
  args?: string;
  /**
   * If provided, the index of the tool call in a sequence
   */
  index?: number;
}
interface InvalidToolCall<TName extends string = string> {
  readonly type?: "invalid_tool_call";
  /**
   * If provided, an identifier associated with the tool call
   */
  id?: string;
  /**
      /**
     * The name of the tool being called
     */
  name?: TName;
  /**
   * The arguments to the tool call
   */
  args?: string;
  /**
   * An error message associated with the tool call
   */
  error?: string;
  /**
   * Index of block in aggregate response
   */
  index?: string | number;
}
declare function defaultToolCallParser(rawToolCalls: Record<string, any>[]): [ToolCall[], InvalidToolCall[]];
/**
 * @deprecated Use {@link ToolMessage.isInstance} instead
 */
declare function isToolMessage(x: unknown): x is ToolMessage;
/**
 * @deprecated Use {@link ToolMessageChunk.isInstance} instead
 */
declare function isToolMessageChunk(x: BaseMessageChunk): x is ToolMessageChunk;
//#endregion
export { DirectToolOutput, InvalidToolCall, ToolCall, ToolCallChunk, ToolMessage, ToolMessageChunk, ToolMessageFields, defaultToolCallParser, isDirectToolOutput, isToolMessage, isToolMessageChunk };
//# sourceMappingURL=tool.d.ts.map