import { BinaryOperatorAggregate } from "../channels/binop.cjs";
import { ReducedZodChannel, SchemaMeta } from "./zod/meta.cjs";
import { AnnotationRoot } from "./annotation.cjs";
import { Messages } from "./message.cjs";
import * as _langchain_core_utils_types0 from "@langchain/core/utils/types";
import * as _langchain_core_messages1 from "@langchain/core/messages";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod/v3";

//#region src/graph/messages_annotation.d.ts

/**
 * Prebuilt state annotation that combines returned messages.
 * Can handle standard messages and special modifiers like {@link RemoveMessage}
 * instances.
 *
 * Specifically, importing and using the prebuilt MessagesAnnotation like this:
 *
 * @example
 * ```ts
 * import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
 *
 * const graph = new StateGraph(MessagesAnnotation)
 *   .addNode(...)
 *   ...
 * ```
 *
 * Is equivalent to initializing your state manually like this:
 *
 * @example
 * ```ts
 * import { BaseMessage } from "@langchain/core/messages";
 * import { Annotation, StateGraph, messagesStateReducer } from "@langchain/langgraph";
 *
 * export const StateAnnotation = Annotation.Root({
 *   messages: Annotation<BaseMessage[]>({
 *     reducer: messagesStateReducer,
 *     default: () => [],
 *   }),
 * });
 *
 * const graph = new StateGraph(StateAnnotation)
 *   .addNode(...)
 *   ...
 * ```
 */
declare const MessagesAnnotation: AnnotationRoot<{
  messages: BinaryOperatorAggregate<BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[], Messages>;
}>;
/**
 * Prebuilt schema meta for Zod state definition.
 *
 * @example
 * ```ts
 * import { z } from "zod/v4-mini";
 * import { MessagesZodState, StateGraph } from "@langchain/langgraph";
 *
 * const AgentState = z.object({
 *   messages: z.custom<BaseMessage[]>().register(registry, MessagesZodMeta),
 * });
 * ```
 */
declare const MessagesZodMeta: SchemaMeta<BaseMessage[], Messages>;
/**
 * Prebuilt state object that uses Zod to combine returned messages.
 * This utility is synonymous with the `MessagesAnnotation` annotation,
 * but uses Zod as the way to express messages state.
 *
 * You can use import and use this prebuilt schema like this:
 *
 * @example
 * ```ts
 * import { MessagesZodState, StateGraph } from "@langchain/langgraph";
 *
 * const graph = new StateGraph(MessagesZodState)
 *   .addNode(...)
 *   ...
 * ```
 *
 * Which is equivalent to initializing the schema object manually like this:
 *
 * @example
 * ```ts
 * import { z } from "zod";
 * import type { BaseMessage, BaseMessageLike } from "@langchain/core/messages";
 * import { StateGraph, messagesStateReducer } from "@langchain/langgraph";
 * import "@langchain/langgraph/zod";
 *
 * const AgentState = z.object({
 *   messages: z
 *     .custom<BaseMessage[]>()
 *     .default(() => [])
 *     .langgraph.reducer(
 *        messagesStateReducer,
 *        z.custom<BaseMessageLike | BaseMessageLike[]>()
 *     ),
 * });
 * const graph = new StateGraph(AgentState)
 *   .addNode(...)
 *   ...
 * ```
 */
declare const MessagesZodState: z.ZodObject<{
  messages: ReducedZodChannel<z.ZodType<BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[], z.ZodTypeDef, BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[]>, _langchain_core_utils_types0.InteropZodType<Messages>>;
}, "strip", z.ZodTypeAny, {
  messages: BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[];
}, {
  messages: BaseMessage<_langchain_core_messages1.MessageStructure, _langchain_core_messages1.MessageType>[];
}>;
//#endregion
export { MessagesAnnotation, MessagesZodMeta, MessagesZodState };
//# sourceMappingURL=messages_annotation.d.cts.map