import { GmailBaseTool } from "./base.js";
import { GET_THREAD_DESCRIPTION } from "./descriptions.js";
import { z } from "zod/v3";

//#region src/tools/gmail/get_thread.ts
const getThreadSchema = z.object({ threadId: z.string() });
var GmailGetThread = class extends GmailBaseTool {
	name = "gmail_get_thread";
	schema = getThreadSchema;
	description = GET_THREAD_DESCRIPTION;
	constructor(fields) {
		super(fields);
	}
	async _call(arg) {
		const { threadId } = arg;
		const gmail = await this.getGmailClient();
		const { data } = await gmail.users.threads.get({
			userId: "me",
			format: "full",
			id: threadId
		});
		if (!data) throw new Error("No data returned from Gmail");
		const { messages } = data;
		if (!messages) throw new Error("No messages returned from Gmail");
		return `Result for the prompt ${threadId} \n${JSON.stringify(messages.map((message) => {
			const { payload } = message;
			if (!payload) throw new Error("No payload returned from Gmail");
			const { headers } = payload;
			if (!headers) throw new Error("No headers returned from Gmail");
			const { subject, sender, body } = this.parseHeaderAndBody(payload);
			if (!subject) throw new Error("No subject returned from Gmail");
			if (!body) throw new Error("No body returned from Gmail");
			if (!sender) throw new Error("No from returned from Gmail");
			const to = headers.find((header) => header.name === "To");
			if (!to) throw new Error("No to returned from Gmail");
			const date = headers.find((header) => header.name === "Date");
			if (!date) throw new Error("No date returned from Gmail");
			const messageIdHeader = headers.find((header) => header.name === "Message-ID");
			if (!messageIdHeader) throw new Error("No message id returned from Gmail");
			return {
				subject: subject.value,
				body,
				from: sender.value,
				to: to.value,
				date: date.value,
				messageId: messageIdHeader.value
			};
		}))}`;
	}
};

//#endregion
export { GmailGetThread };
//# sourceMappingURL=get_thread.js.map