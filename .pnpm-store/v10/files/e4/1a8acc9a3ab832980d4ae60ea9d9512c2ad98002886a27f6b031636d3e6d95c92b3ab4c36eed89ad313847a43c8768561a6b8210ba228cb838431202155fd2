import { BaseMessage } from "./base.js";
import { ToolMessage, ToolMessageChunk } from "./tool.js";
import { AIMessage, AIMessageChunk } from "./ai.js";
import { ChatMessage, ChatMessageChunk } from "./chat.js";
import { FunctionMessage, FunctionMessageChunk } from "./function.js";
import { HumanMessage, HumanMessageChunk } from "./human.js";
import { SystemMessage, SystemMessageChunk } from "./system.js";
import { MessageType } from "./message.js";
import { Runnable } from "../runnables/base.js";
import { BaseDocumentTransformer } from "../documents/transformers.js";
import { BaseLanguageModel } from "../language_models/base.js";
import { RemoveMessage } from "./modifier.js";

//#region src/messages/transformers.d.ts
type MessageUnion = typeof HumanMessage | typeof AIMessage | typeof SystemMessage | typeof ChatMessage | typeof FunctionMessage | typeof ToolMessage | typeof RemoveMessage;
type MessageChunkUnion = typeof HumanMessageChunk | typeof AIMessageChunk | typeof SystemMessageChunk | typeof FunctionMessageChunk | typeof ToolMessageChunk | typeof ChatMessageChunk | typeof RemoveMessage;
type MessageTypeOrClass = MessageType | MessageUnion | MessageChunkUnion;
interface FilterMessagesFields {
  /**
   * @param {string[] | undefined} includeNames Message names to include.
   */
  includeNames?: string[];
  /**
   * @param {string[] | undefined} excludeNames Messages names to exclude.
   */
  excludeNames?: string[];
  /**
   * @param {(MessageType | BaseMessage)[] | undefined} includeTypes Message types to include. Can be specified as string names (e.g.
   *     "system", "human", "ai", ...) or as BaseMessage classes (e.g.
   *     SystemMessage, HumanMessage, AIMessage, ...).
   */
  includeTypes?: MessageTypeOrClass[];
  /**
   * @param {(MessageType | BaseMessage)[] | undefined} excludeTypes Message types to exclude. Can be specified as string names (e.g.
   *     "system", "human", "ai", ...) or as BaseMessage classes (e.g.
   *     SystemMessage, HumanMessage, AIMessage, ...).
   */
  excludeTypes?: MessageTypeOrClass[];
  /**
   * @param {string[] | undefined} includeIds Message IDs to include.
   */
  includeIds?: string[];
  /**
   * @param {string[] | undefined} excludeIds Message IDs to exclude.
   */
  excludeIds?: string[];
}
/**
 * Filter messages based on name, type or id.
 *
 * @param {BaseMessage[] | FilterMessagesFields} messagesOrOptions - Either an array of BaseMessage objects to filter or the filtering options. If an array is provided, the `options` parameter should also be supplied. If filtering options are provided, a RunnableLambda is returned.
 * @param {FilterMessagesFields} [options] - Optional filtering options. Should only be provided if `messagesOrOptions` is an array of BaseMessage objects.
 * @returns A list of Messages that meets at least one of the include conditions and none
 *     of the exclude conditions, or a RunnableLambda which does the same. If no include conditions are specified then
 *     anything that is not explicitly excluded will be included.
 * @throws {Error} If two incompatible arguments are provided.
 *
 * @example
 * ```typescript
 * import { filterMessages, AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
 *
 * const messages = [
 *   new SystemMessage("you're a good assistant."),
 *   new HumanMessage({ content: "what's your name", id: "foo", name: "example_user" }),
 *   new AIMessage({ content: "steve-o", id: "bar", name: "example_assistant" }),
 *   new HumanMessage({ content: "what's your favorite color", id: "baz" }),
 *   new AIMessage({ content: "silicon blue" , id: "blah" }),
 * ];
 *
 * filterMessages(messages, {
 *   includeNames: ["example_user", "example_assistant"],
 *   includeTypes: ["system"],
 *   excludeIds: ["bar"],
 * });
 * ```
 *
 * The above example would return:
 * ```typescript
 * [
 *   new SystemMessage("you're a good assistant."),
 *   new HumanMessage({ content: "what's your name", id: "foo", name: "example_user" }),
 * ]
 * ```
 */
declare function filterMessages(options?: FilterMessagesFields): Runnable<BaseMessage[], BaseMessage[]>;
declare function filterMessages(messages: BaseMessage[], options?: FilterMessagesFields): BaseMessage[];
/**
 * Merge consecutive Messages of the same type.
 *
 * **NOTE**: ToolMessages are not merged, as each has a distinct tool call id that
 * can't be merged.
 *
 * @param {BaseMessage[] | undefined} messages Sequence of Message-like objects to merge. Optional. If not provided, a RunnableLambda is returned.
 * @returns List of BaseMessages with consecutive runs of message types merged into single
 *     messages, or a RunnableLambda which returns a list of BaseMessages If two messages being merged both have string contents, the merged
 *     content is a concatenation of the two strings with a new-line separator. If at
 *     least one of the messages has a list of content blocks, the merged content is a
 *     list of content blocks.
 *
 * @example
 * ```typescript
 * import { mergeMessageRuns, AIMessage, HumanMessage, SystemMessage, ToolCall } from "@langchain/core/messages";
 *
 * const messages = [
 *   new SystemMessage("you're a good assistant."),
 *   new HumanMessage({ content: "what's your favorite color", id: "foo" }),
 *   new HumanMessage({ content: "wait your favorite food", id: "bar" }),
 *   new AIMessage({
 *     content: "my favorite colo",
 *     tool_calls: [{ name: "blah_tool", args: { x: 2 }, id: "123" }],
 *     id: "baz",
 *   }),
 *   new AIMessage({
 *     content: [{ type: "text", text: "my favorite dish is lasagna" }],
 *     tool_calls: [{ name: "blah_tool", args: { x: -10 }, id: "456" }],
 *     id: "blur",
 *   }),
 * ];
 *
 * mergeMessageRuns(messages);
 * ```
 *
 * The above example would return:
 * ```typescript
 * [
 *   new SystemMessage("you're a good assistant."),
 *   new HumanMessage({
 *     content: "what's your favorite colorwait your favorite food",
 *     id: "foo",
 *   }),
 *   new AIMessage({
 *     content: [
 *       { type: "text", text: "my favorite colo" },
 *       { type: "text", text: "my favorite dish is lasagna" },
 *     ],
 *     tool_calls: [
 *       { name: "blah_tool", args: { x: 2 }, id: "123" },
 *       { name: "blah_tool", args: { x: -10 }, id: "456" },
 *     ],
 *     id: "baz",
 *   }),
 * ]
 * ```
 */
declare function mergeMessageRuns(): Runnable<BaseMessage[], BaseMessage[]>;
declare function mergeMessageRuns(messages: BaseMessage[]): BaseMessage[];
interface _TextSplitterInterface extends BaseDocumentTransformer {
  splitText(text: string): Promise<string[]>;
}
interface TrimMessagesFields {
  /**
   * @param {number} maxTokens Max token count of trimmed messages.
   */
  maxTokens: number;
  /**
   * @param {((messages: BaseMessage[]) => number) | ((messages: BaseMessage[]) => Promise<number>) | BaseLanguageModel} tokenCounter
   * Function or LLM for counting tokens in an array of `BaseMessage`s.
   * If a `BaseLanguageModel` is passed in then `BaseLanguageModel.getNumTokens()` will be used.
   */
  tokenCounter: ((messages: BaseMessage[]) => number) | ((messages: BaseMessage[]) => Promise<number>) | BaseLanguageModel;
  /**
   * @param {"first" | "last"} [strategy="last"] Strategy for trimming.
   * - "first": Keep the first <= n_count tokens of the messages.
   * - "last": Keep the last <= n_count tokens of the messages.
   * @default "last"
   */
  strategy?: "first" | "last";
  /**
   * @param {boolean} [allowPartial=false] Whether to split a message if only part of the message can be included.
   * If `strategy: "last"` then the last partial contents of a message are included.
   * If `strategy: "first"` then the first partial contents of a message are included.
   * @default false
   */
  allowPartial?: boolean;
  /**
   * @param {MessageTypeOrClass | MessageTypeOrClass[]} [endOn] The message type to end on.
   * If specified then every message after the last occurrence of this type is ignored.
   * If `strategy === "last"` then this is done before we attempt to get the last `maxTokens`.
   * If `strategy === "first"` then this is done after we get the first `maxTokens`.
   * Can be specified as string names (e.g. "system", "human", "ai", ...) or as `BaseMessage` classes
   * (e.g. `SystemMessage`, `HumanMessage`, `AIMessage`, ...). Can be a single type or an array of types.
   */
  endOn?: MessageTypeOrClass | MessageTypeOrClass[];
  /**
   * @param {MessageTypeOrClass | MessageTypeOrClass[]} [startOn] The message type to start on.
   * Should only be specified if `strategy: "last"`. If specified then every message before the first occurrence
   * of this type is ignored. This is done after we trim the initial messages to the last `maxTokens`.
   * Does not apply to a `SystemMessage` at index 0 if `includeSystem: true`.
   * Can be specified as string names (e.g. "system", "human", "ai", ...) or as `BaseMessage` classes
   * (e.g. `SystemMessage`, `HumanMessage`, `AIMessage`, ...). Can be a single type or an array of types.
   */
  startOn?: MessageTypeOrClass | MessageTypeOrClass[];
  /**
   * @param {boolean} [includeSystem=false] Whether to keep the `SystemMessage` if there is one at index 0.
   * Should only be specified if `strategy: "last"`.
   * @default false
   */
  includeSystem?: boolean;
  /**
   * @param {((text: string) => string[]) | BaseDocumentTransformer} [textSplitter] Function or `BaseDocumentTransformer` for
   * splitting the string contents of a message. Only used if `allowPartial: true`.
   * If `strategy: "last"` then the last split tokens from a partial message will be included.
   * If `strategy: "first"` then the first split tokens from a partial message will be included.
   * Token splitter assumes that separators are kept, so that split contents can be directly concatenated
   * to recreate the original text. Defaults to splitting on newlines.
   */
  textSplitter?: ((text: string) => string[]) | ((text: string) => Promise<string[]>) | _TextSplitterInterface;
}
/**
 * Trim messages to be below a token count.
 *
 * @param {BaseMessage[]} messages Array of `BaseMessage` instances to trim.
 * @param {TrimMessagesFields} options Trimming options.
 * @returns An array of trimmed `BaseMessage`s or a `Runnable` that takes a sequence of `BaseMessage`-like objects and returns
 *     an array of trimmed `BaseMessage`s.
 * @throws {Error} If two incompatible arguments are specified or an unrecognized `strategy` is specified.
 *
 * @example
 * ```typescript
 * import { trimMessages, AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
 *
 * const messages = [
 *   new SystemMessage("This is a 4 token text. The full message is 10 tokens."),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "first",
 *   }),
 *   new AIMessage({
 *     content: [
 *       { type: "text", text: "This is the FIRST 4 token block." },
 *       { type: "text", text: "This is the SECOND 4 token block." },
 *     ],
 *     id: "second",
 *   }),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "third",
 *   }),
 *   new AIMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "fourth",
 *   }),
 * ];
 *
 * function dummyTokenCounter(messages: BaseMessage[]): number {
 *   // treat each message like it adds 3 default tokens at the beginning
 *   // of the message and at the end of the message. 3 + 4 + 3 = 10 tokens
 *   // per message.
 *
 *   const defaultContentLen = 4;
 *   const defaultMsgPrefixLen = 3;
 *   const defaultMsgSuffixLen = 3;
 *
 *   let count = 0;
 *   for (const msg of messages) {
 *     if (typeof msg.content === "string") {
 *       count += defaultMsgPrefixLen + defaultContentLen + defaultMsgSuffixLen;
 *     }
 *     if (Array.isArray(msg.content)) {
 *       count +=
 *         defaultMsgPrefixLen +
 *         msg.content.length * defaultContentLen +
 *         defaultMsgSuffixLen;
 *     }
 *   }
 *   return count;
 * }
 * ```
 *
 * First 30 tokens, not allowing partial messages:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 30,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "first",
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "first",
 *   }),
 * ]
 * ```
 *
 * First 30 tokens, allowing partial messages:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 30,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "first",
 *   allowPartial: true,
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "first",
 *   }),
 *   new AIMessage({
 *     content: [{ type: "text", text: "This is the FIRST 4 token block." }],
 *     id: "second",
 *   }),
 * ]
 * ```
 *
 * First 30 tokens, allowing partial messages, have to end on HumanMessage:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 30,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "first",
 *   allowPartial: true,
 *   endOn: "human",
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "first",
 *   }),
 * ]
 * ```
 *
 * Last 30 tokens, including system message, not allowing partial messages:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 30,
 *   includeSystem: true,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "last",
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "third",
 *   }),
 *   new AIMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "fourth",
 *   }),
 * ]
 * ```
 *
 * Last 40 tokens, including system message, allowing partial messages:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 40,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "last",
 *   allowPartial: true,
 *   includeSystem: true,
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new AIMessage({
 *     content: [{ type: "text", text: "This is the FIRST 4 token block." }],
 *     id: "second",
 *   }),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "third",
 *   }),
 *   new AIMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "fourth",
 *   }),
 * ]
 * ```
 *
 * Last 30 tokens, including system message, allowing partial messages, end on HumanMessage:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 30,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "last",
 *   endOn: "human",
 *   includeSystem: true,
 *   allowPartial: true,
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new AIMessage({
 *     content: [{ type: "text", text: "This is the FIRST 4 token block." }],
 *     id: "second",
 *   }),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "third",
 *   }),
 * ]
 * ```
 *
 * Last 40 tokens, including system message, allowing partial messages, start on HumanMessage:
 * ```typescript
 * await trimMessages(messages, {
 *   maxTokens: 40,
 *   tokenCounter: dummyTokenCounter,
 *   strategy: "last",
 *   includeSystem: true,
 *   allowPartial: true,
 *   startOn: "human",
 * });
 * ```
 *
 * Output:
 * ```typescript
 * [
 *   new SystemMessage(
 *     "This is a 4 token text. The full message is 10 tokens."
 *   ),
 *   new HumanMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "third",
 *   }),
 *   new AIMessage({
 *     content: "This is a 4 token text. The full message is 10 tokens.",
 *     id: "fourth",
 *   }),
 * ]
 * ```
 */
declare function trimMessages(options: TrimMessagesFields): Runnable<BaseMessage[], BaseMessage[]>;
declare function trimMessages(messages: BaseMessage[], options: TrimMessagesFields): Promise<BaseMessage[]>;
/**
 * The default text splitter function that splits text by newlines.
 *
 * @param {string} text
 * @returns A promise that resolves to an array of strings split by newlines.
 */
declare function defaultTextSplitter(text: string): Promise<string[]>;
//#endregion
export { FilterMessagesFields, MessageChunkUnion, MessageTypeOrClass, MessageUnion, TrimMessagesFields, defaultTextSplitter, filterMessages, mergeMessageRuns, trimMessages };
//# sourceMappingURL=transformers.d.ts.map