const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const require_descriptions = require('./descriptions.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/tools/gmail/send_message.ts
const sendMessageSchema = zod_v3.z.object({
	message: zod_v3.z.string(),
	to: zod_v3.z.array(zod_v3.z.string()),
	subject: zod_v3.z.string(),
	cc: zod_v3.z.array(zod_v3.z.string()).optional(),
	bcc: zod_v3.z.array(zod_v3.z.string()).optional()
});
var GmailSendMessage = class extends require_base.GmailBaseTool {
	name = "gmail_send_message";
	schema = sendMessageSchema;
	description = require_descriptions.GET_MESSAGE_DESCRIPTION;
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
exports.GmailSendMessage = GmailSendMessage;
//# sourceMappingURL=send_message.cjs.map