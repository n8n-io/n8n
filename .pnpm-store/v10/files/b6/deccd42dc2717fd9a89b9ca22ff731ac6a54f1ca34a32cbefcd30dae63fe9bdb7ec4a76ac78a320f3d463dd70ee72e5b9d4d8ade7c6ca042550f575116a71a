import { ReducedValue } from "../values/reduced.js";
import { messagesStateReducer } from "../../graph/messages_reducer.js";
import { z } from "zod/v4";

//#region src/state/prebuilt/messages.ts
const messagesValueSchema = z.custom().default(() => []);
const messagesInputSchema = z.custom();
const MessagesValue = new ReducedValue(messagesValueSchema, {
	inputSchema: messagesInputSchema,
	reducer: messagesStateReducer,
	jsonSchemaExtra: {
		langgraph_type: "messages",
		description: "A list of chat messages"
	}
});

//#endregion
export { MessagesValue };
//# sourceMappingURL=messages.js.map