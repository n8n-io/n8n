import { BaseMessage, BaseMessageLike, StoredMessage } from "./base.cjs";
import { InvalidToolCall, ToolCall, ToolCallChunk, ToolMessage } from "./tool.cjs";
import { AIMessage, AIMessageChunk } from "./ai.cjs";
import { ChatMessage, ChatMessageChunk } from "./chat.cjs";
import { FunctionMessage, FunctionMessageChunk } from "./function.cjs";
import { HumanMessage, HumanMessageChunk } from "./human.cjs";
import { SystemMessage, SystemMessageChunk } from "./system.cjs";
import { MessageStructure, MessageToolSet } from "./message.cjs";

//#region src/messages/utils.d.ts
type $Expand<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
/**
 * Extracts the explicitly declared keys from a type T.
 *
 * @template T - The type to extract keys from
 * @returns A union of keys that are not string, number, or symbol
 */
type $KnownKeys<T> = { [K in keyof T]: string extends K ? never : number extends K ? never : symbol extends K ? never : K }[keyof T];
/**
 * Detects if T has an index signature.
 *
 * @template T - The type to check for index signatures
 * @returns True if T has an index signature, false otherwise
 */
type $HasIndexSignature<T> = string extends keyof T ? true : number extends keyof T ? true : symbol extends keyof T ? true : false;
/**
 * Detects if T has an index signature and no known keys.
 *
 * @template T - The type to check for index signatures and no known keys
 * @returns True if T has an index signature and no known keys, false otherwise
 */
type $OnlyIndexSignatures<T> = $HasIndexSignature<T> extends true ? [$KnownKeys<T>] extends [never] ? true : false : false;
/**
 * Recursively merges two object types T and U, with U taking precedence over T.
 *
 * This utility type performs a deep merge of two object types:
 * - For keys that exist in both T and U:
 *   - If both values are objects (Record<string, unknown>), recursively merge them
 *   - Otherwise, U's value takes precedence
 * - For keys that exist only in T, use T's value
 * - For keys that exist only in U, use U's value
 *
 * @template T - The first object type to merge
 * @template U - The second object type to merge (takes precedence over T)
 *
 * @example
 * ```ts
 * type ObjectA = {
 *   shared: { a: string; b: number };
 *   onlyInA: boolean;
 * };
 *
 * type ObjectB = {
 *   shared: { b: string; c: Date };
 *   onlyInB: symbol;
 * };
 *
 * type Merged = $MergeObjects<ObjectA, ObjectB>;
 * // Result: {
 * //   shared: { a: string; b: string; c: Date };
 * //   onlyInA: boolean;
 * //   onlyInB: symbol;
 * // }
 * ```
 */
type $MergeObjects<T, U> = $OnlyIndexSignatures<U> extends true ? U : $OnlyIndexSignatures<T> extends true ? U : { [K in keyof T | keyof U]: K extends keyof T ? K extends keyof U ? T[K] extends Record<string, unknown> ? U[K] extends Record<string, unknown> ? $MergeObjects<T[K], U[K]> : U[K] : U[K] : T[K] : K extends keyof U ? U[K] : never };
/**
 * Merges two discriminated unions A and B based on a discriminator key (defaults to "type").
 * For each possible value of the discriminator across both unions:
 * - If B has a member with that discriminator value, use B's member
 * - Otherwise use A's member with that discriminator value
 * This effectively merges the unions while giving B's members precedence over A's members.
 *
 * @template A - First discriminated union type that extends Record<Key, PropertyKey>
 * @template B - Second discriminated union type that extends Record<Key, PropertyKey>
 * @template Key - The discriminator key property, defaults to "type"
 */
type $MergeDiscriminatedUnion<A extends Record<Key, PropertyKey>, B extends Record<Key, PropertyKey>, Key extends PropertyKey = "type"> = { [T in A[Key] | B[Key]]: [Extract<B, Record<Key, T>>] extends [never] ? Extract<A, Record<Key, T>> : [Extract<A, Record<Key, T>>] extends [never] ? Extract<B, Record<Key, T>> : $MergeObjects<Extract<A, Record<Key, T>>, Extract<B, Record<Key, T>>> }[A[Key] | B[Key]];
type Constructor<T> = new (...args: unknown[]) => T;
/**
 * Immediately-invoked function expression.
 *
 * @param fn - The function to execute
 * @returns The result of the function
 */
declare const iife: <T>(fn: () => T) => T;
declare function coerceMessageLikeToMessage(messageLike: BaseMessageLike): BaseMessage;
/**
 * This function is used by memory classes to get a string representation
 * of the chat message history, based on the message content and role.
 *
 * Produces compact output like:
 * ```
 * Human: What's the weather?
 * AI: Let me check...[tool_calls]
 * Tool: 72°F and sunny
 * ```
 *
 * This avoids token inflation from metadata when stringifying message objects directly.
 */
declare function getBufferString(messages: BaseMessage[], humanPrefix?: string, aiPrefix?: string): string;
declare function mapStoredMessageToChatMessage(message: StoredMessage): AIMessage<MessageStructure<MessageToolSet>> | ChatMessage<MessageStructure<MessageToolSet>> | FunctionMessage<MessageStructure<MessageToolSet>> | HumanMessage<MessageStructure<MessageToolSet>> | SystemMessage<MessageStructure<MessageToolSet>> | ToolMessage<MessageStructure<MessageToolSet>>;
/**
 * Transforms an array of `StoredMessage` instances into an array of
 * `BaseMessage` instances. It uses the `mapV1MessageToStoredMessage`
 * function to ensure all messages are in the `StoredMessage` format, then
 * creates new instances of the appropriate `BaseMessage` subclass based
 * on the type of each message. This function is used to prepare stored
 * messages for use in a chat context.
 */
declare function mapStoredMessagesToChatMessages(messages: StoredMessage[]): BaseMessage[];
/**
 * Transforms an array of `BaseMessage` instances into an array of
 * `StoredMessage` instances. It does this by calling the `toDict` method
 * on each `BaseMessage`, which returns a `StoredMessage`. This function
 * is used to prepare chat messages for storage.
 */
declare function mapChatMessagesToStoredMessages(messages: BaseMessage[]): StoredMessage[];
declare function convertToChunk(message: BaseMessage): AIMessageChunk<MessageStructure<MessageToolSet>> | ChatMessageChunk<MessageStructure<MessageToolSet>> | FunctionMessageChunk<MessageStructure<MessageToolSet>> | HumanMessageChunk<MessageStructure<MessageToolSet>> | SystemMessageChunk<MessageStructure<MessageToolSet>>;
/**
 * Collapses an array of tool call chunks into complete tool calls.
 *
 * This function groups tool call chunks by their id and/or index, then attempts to
 * parse and validate the accumulated arguments for each group. Successfully parsed
 * tool calls are returned as valid `ToolCall` objects, while malformed ones are
 * returned as `InvalidToolCall` objects.
 *
 * @param chunks - An array of `ToolCallChunk` objects to collapse
 * @returns An object containing:
 *   - `tool_call_chunks`: The original input chunks
 *   - `tool_calls`: An array of successfully parsed and validated tool calls
 *   - `invalid_tool_calls`: An array of tool calls that failed parsing or validation
 *
 * @remarks
 * Chunks are grouped using the following matching logic:
 * - If a chunk has both an id and index, it matches chunks with the same id and index
 * - If a chunk has only an id, it matches chunks with the same id
 * - If a chunk has only an index, it matches chunks with the same index
 *
 * For each group, the function:
 * 1. Concatenates all `args` strings from the chunks
 * 2. Attempts to parse the concatenated string as JSON
 * 3. Validates that the result is a non-null object with a valid id
 * 4. Creates either a `ToolCall` (if valid) or `InvalidToolCall` (if invalid)
 */
declare function collapseToolCallChunks(chunks: ToolCallChunk[]): {
  tool_call_chunks: ToolCallChunk[];
  tool_calls: ToolCall[];
  invalid_tool_calls: InvalidToolCall[];
};
//#endregion
export { $Expand, $MergeDiscriminatedUnion, $MergeObjects, Constructor, coerceMessageLikeToMessage, collapseToolCallChunks, convertToChunk, getBufferString, iife, mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, mapStoredMessagesToChatMessages };
//# sourceMappingURL=utils.d.cts.map