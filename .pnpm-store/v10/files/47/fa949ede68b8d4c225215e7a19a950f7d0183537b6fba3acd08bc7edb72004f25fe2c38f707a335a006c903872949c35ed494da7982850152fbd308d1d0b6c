import { ThreadState } from "../schema.js";
import { Message } from "../types.messages.js";
import * as _langchain_core_messages0 from "@langchain/core/messages";
import { BaseMessage, BaseMessageChunk } from "@langchain/core/messages";

//#region src/ui/messages.d.ts
/**
 * Replaces the `messages` property in a state type with `BaseMessage[]`.
 * Used by framework SDKs to reflect that `ensureHistoryMessageInstances`
 * converts plain message objects to class instances at runtime.
 */
type StateWithBaseMessages<S> = S extends Record<string, unknown> ? "messages" extends keyof S ? Omit<S, "messages"> & {
  messages: BaseMessage[];
} : S : S;
/**
 * Maps a `ThreadState<StateType>[]` so that the `messages` field inside
 * `values` is typed as `BaseMessage[]` instead of `Message[]`.
 */
type HistoryWithBaseMessages<T> = T extends ThreadState<infer S>[] ? ThreadState<StateWithBaseMessages<S>>[] : T;
declare class MessageTupleManager {
  chunks: Record<string, {
    chunk?: BaseMessageChunk | BaseMessage;
    metadata?: Record<string, unknown>;
    index?: number;
  }>;
  constructor();
  add(serialized: Message, metadata: Record<string, unknown> | undefined): string | null;
  clear(): void;
  get(id: string | null | undefined, defaultIndex?: number): {
    chunk?: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType> | BaseMessageChunk<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType> | undefined;
    metadata?: Record<string, unknown> | undefined;
    index?: number | undefined;
  } | null;
}
declare const toMessageDict: (chunk: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>) => Message;
/**
 * Identity converter that keeps @langchain/core class instances.
 * Used by framework SDKs to expose BaseMessage instances instead of plain dicts.
 */
declare const toMessageClass: (chunk: BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>) => BaseMessage<_langchain_core_messages0.MessageStructure<_langchain_core_messages0.MessageToolSet>, _langchain_core_messages0.MessageType>;
/**
 * Ensures all messages in an array are BaseMessage class instances.
 * Messages that are already class instances pass through unchanged.
 * Plain message objects (e.g. from API values/history) are converted
 * via {@link tryCoerceMessageLikeToMessage}.
 */
declare function ensureMessageInstances(messages: (Message | BaseMessage)[]): (BaseMessage | BaseMessageChunk)[];
/**
 * Converts plain message objects within each history state's values
 * to proper BaseMessage class instances. Returns a new array with
 * shallow-copied states whose messages have been coerced.
 */
declare function ensureHistoryMessageInstances<StateType extends Record<string, unknown>>(history: ThreadState<StateType>[], messagesKey?: string): ThreadState<StateType>[];
//#endregion
export { HistoryWithBaseMessages, MessageTupleManager, ensureHistoryMessageInstances, ensureMessageInstances, toMessageClass, toMessageDict };
//# sourceMappingURL=messages.d.ts.map