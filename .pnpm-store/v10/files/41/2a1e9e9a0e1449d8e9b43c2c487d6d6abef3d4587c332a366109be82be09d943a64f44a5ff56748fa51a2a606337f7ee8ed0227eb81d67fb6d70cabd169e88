import { ReducedValue } from "../values/reduced.js";
import { messagesStateReducer } from "../../graph/messages_reducer.js";
import { z } from "zod/v4";
const MessagesValue = new ReducedValue(z.custom().default(() => []), {
	inputSchema: z.custom(),
	reducer: messagesStateReducer,
	jsonSchemaExtra: {
		langgraph_type: "messages",
		description: "A list of chat messages"
	}
});
//#endregion
export { MessagesValue };

//# sourceMappingURL=messages.js.map