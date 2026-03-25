import { GmailBaseTool } from "./base.js";
import { GET_MESSAGE_DESCRIPTION } from "./descriptions.js";
import { z } from "zod/v3";

//#region src/tools/gmail/send_message.ts
const sendMessageSchema = z.object({
	message: z.string(),
	to: z.array(z.string()),
	subject: z.string(),
	cc: z.array(z.string()).optional(),
	bcc: z.array(z.string()).optional()
});
var GmailSendMessage = class extends GmailBaseTool {
	name = "gmail_send_message";
	schema = sendMessageSchema;
	description = GET_MESSAGE_DESCRIPTION;
	constructor(fields) {
		super(fields);
	}
	createEmailMessage({ message, to, subject, cc, bcc }) {
		const emailLines = [];
		const formatEmailList = (emails) => Array.isArray(emails) ? emails.join(",") : emails;
		emailLines.push(`To: ${formatEmailList(to)}`);
		if (cc) emailLines.push(`Cc: ${formatEmailList(cc)}`);
		if (bcc) emailLines.push(`Bcc: ${formatEmailList(bcc)}`);
		emailLines.push(`Subject: ${subject}`);
		emailLines.push("");
		emailLines.push(message);
		const email = emailLines.join("\r\n").trim();
		return Buffer.from(email).toString("base64url");
	}
	async _call({ message, to, subject, cc, bcc }) {
		const rawMessage = this.createEmailMessage({
			message,
			to,
			subject,
			cc,
			bcc
		});
		try {
			const gmail = await this.getGmailClient();
			const response = await gmail.users.messages.send({
				userId: "me",
				requestBody: { raw: rawMessage }
			});
			return `Message sent. Message Id: ${response.data.id}`;
		} catch (error) {
			throw new Error(`An error occurred while sending the message: ${error}`);
		}
	}
};

//#endregion
export { GmailSendMessage };
//# sourceMappingURL=send_message.js.map