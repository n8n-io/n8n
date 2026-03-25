const require_reduced = require('../values/reduced.cjs');
const require_messages_reducer = require('../../graph/messages_reducer.cjs');
let zod_v4 = require("zod/v4");

//#region src/state/prebuilt/messages.ts
const messagesValueSchema = zod_v4.z.custom().default(() => []);
const messagesInputSchema = zod_v4.z.custom();
const MessagesValue = new require_reduced.ReducedValue(messagesValueSchema, {
	inputSchema: messagesInputSchema,
	reducer: require_messages_reducer.messagesStateReducer,
	jsonSchemaExtra: {
		langgraph_type: "messages",
		description: "A list of chat messages"
	}
});

//#endregion
exports.MessagesValue = MessagesValue;
//# sourceMappingURL=messages.cjs.map