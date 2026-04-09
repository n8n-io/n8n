import { DefaultToolCall, ToolCallWithResult } from "../types.messages.js";
import { AcceptBaseMessages, MessageMetadata, SubagentStreamInterface } from "./types.js";
import { HistoryWithBaseMessages } from "./messages.js";
import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";

//#region src/ui/class-messages.d.ts
/**
 * Remaps an SDK {@link ToolCallWithResult} so that the `toolMessage` and
 * `aiMessage` fields use `@langchain/core` class instances
 * (`CoreToolMessage` / `CoreAIMessage`) instead of plain SDK message
 * objects.
 *
 * Framework SDKs convert messages to class instances at runtime via
 * `ensureMessageInstances`; this type reflects that conversion at the
 * type level.
 */
type ClassToolCallWithResult<T> = T extends ToolCallWithResult<infer TC, unknown, unknown> ? ToolCallWithResult<TC, ToolMessage, AIMessage> : T;
/**
 * Subagent stream interface with `messages` typed as `BaseMessage[]`
 * instead of `Message[]`.
 *
 * Framework SDKs use class message instances end-to-end; this type is
 * the subagent counterpart of {@link WithClassMessages}.
 */
type ClassSubagentStreamInterface<StateType = Record<string, unknown>, ToolCall = DefaultToolCall, SubagentName extends string = string> = Omit<SubagentStreamInterface<StateType, ToolCall, SubagentName>, "messages"> & {
  messages: BaseMessage[];
};
/**
 * Maps a stream interface to use `@langchain/core` {@link BaseMessage}
 * class instances instead of plain SDK {@link Message} objects.
 *
 * Specifically:
 * - `messages` becomes `BaseMessage[]`
 * - `getMessagesMetadata` accepts a `BaseMessage`
 * - `toolCalls` uses {@link ClassToolCallWithResult}
 * - `getToolCalls` accepts `CoreAIMessage` and returns class-based
 *   tool call results
 * - `submit` accepts `BaseMessage` via {@link AcceptBaseMessages}
 * - `history` is remapped via {@link HistoryWithBaseMessages}
 * - Subagent properties use {@link ClassSubagentStreamInterface}
 *
 * React, Angular, and Svelte use this type directly. Vue applies
 * additional `Ref`/`ComputedRef` wrapping on top of the shared helper
 * types.
 */
type WithClassMessages<T> = Omit<T, "messages" | "history" | "getMessagesMetadata" | "toolCalls" | "getToolCalls" | "submit" | "subagents" | "activeSubagents" | "getSubagent" | "getSubagentsByType" | "getSubagentsByMessage"> & {
  messages: BaseMessage[];
  getMessagesMetadata: (message: BaseMessage, index?: number) => MessageMetadata<Record<string, unknown>> | undefined;
} & ("history" extends keyof T ? {
  history: HistoryWithBaseMessages<T["history"]>;
} : unknown) & ("submit" extends keyof T ? {
  submit: T extends {
    submit: (values: infer V, options?: infer O) => infer Ret;
  } ? (values: AcceptBaseMessages<Exclude<V, null | undefined>> | null | undefined, options?: O) => Ret : never;
} : unknown) & ("toolCalls" extends keyof T ? {
  toolCalls: T extends {
    toolCalls: (infer TC)[];
  } ? ClassToolCallWithResult<TC>[] : never;
} : unknown) & ("getToolCalls" extends keyof T ? {
  getToolCalls: T extends {
    getToolCalls: (message: infer _M) => (infer TC)[];
  } ? (message: AIMessage) => ClassToolCallWithResult<TC>[] : never;
} : unknown) & ("subagents" extends keyof T ? {
  subagents: T extends {
    subagents: Map<string, SubagentStreamInterface<infer S, infer TC, infer N>>;
  } ? Map<string, ClassSubagentStreamInterface<S, TC, N>> : never;
  activeSubagents: T extends {
    activeSubagents: SubagentStreamInterface<infer S, infer TC, infer N>[];
  } ? ClassSubagentStreamInterface<S, TC, N>[] : never;
  getSubagent: T extends {
    getSubagent: (id: string) => SubagentStreamInterface<infer S, infer TC, infer N> | undefined;
  } ? (toolCallId: string) => ClassSubagentStreamInterface<S, TC, N> | undefined : never;
  getSubagentsByType: T extends {
    getSubagentsByType: (type: string) => SubagentStreamInterface<infer S, infer TC, infer N>[];
  } ? (type: string) => ClassSubagentStreamInterface<S, TC, N>[] : never;
  getSubagentsByMessage: T extends {
    getSubagentsByMessage: (id: string) => SubagentStreamInterface<infer S, infer TC, infer N>[];
  } ? (messageId: string) => ClassSubagentStreamInterface<S, TC, N>[] : never;
} : unknown);
//#endregion
export { ClassSubagentStreamInterface, ClassToolCallWithResult, WithClassMessages };
//# sourceMappingURL=class-messages.d.ts.map