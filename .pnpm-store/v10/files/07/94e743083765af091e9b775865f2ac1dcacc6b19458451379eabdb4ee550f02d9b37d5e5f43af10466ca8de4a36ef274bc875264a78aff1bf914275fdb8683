const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_annotation = require('./annotation.cjs');
const require_meta = require('./zod/meta.cjs');
const require_message = require('./message.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/graph/messages_annotation.ts
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
const MessagesAnnotation = require_annotation.Annotation.Root({ messages: require_annotation.Annotation({
	reducer: require_message.messagesStateReducer,
	default: () => []
}) });
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
const MessagesZodMeta = {
	reducer: { fn: require_message.messagesStateReducer },
	jsonSchemaExtra: { langgraph_type: "messages" },
	default: () => []
};
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
const MessagesZodState = zod_v3.z.object({ messages: require_meta.withLangGraph(zod_v3.z.custom(), MessagesZodMeta) });

//#endregion
exports.MessagesAnnotation = MessagesAnnotation;
exports.MessagesZodMeta = MessagesZodMeta;
exports.MessagesZodState = MessagesZodState;
//# sourceMappingURL=messages_annotation.cjs.map