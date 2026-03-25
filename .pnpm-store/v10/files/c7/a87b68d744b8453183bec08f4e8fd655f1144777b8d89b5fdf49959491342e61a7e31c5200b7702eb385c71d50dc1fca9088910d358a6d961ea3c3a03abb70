import { GmailBaseTool } from "./base.js";
import { CREATE_DRAFT_DESCRIPTION } from "./descriptions.js";
import { z } from "zod/v3";

//#region src/tools/gmail/create_draft.ts
const createDraftSchema = z.object({
	message: z.string(),
	to: z.array(z.string()),
	subject: z.string(),
	cc: z.array(z.string()).optional(),
	bcc: z.array(z.string()).optional()
});
var GmailCreateDraft = class extends GmailBaseTool {
	name = "create_gmail_draft";
	schema = createDraftSchema;
	description = CREATE_DRAFT_DESCRIPTION;
	constructor(fields) {
		super(fields);
	}
	prepareDraftMessage(message, to, subject, cc, bcc) {
		const draftMessage = { message: { raw: "" } };
		const email = [
			`To: ${to.join(", ")}`,
			`Subject: ${subject}`,
			cc ? `Cc: ${cc.join(", ")}` : "",
			bcc ? `Bcc: ${bcc.join(", ")}` : "",
			"",
			message
		].join("\n");
		draftMessage.message.raw = Buffer.from(email).toString("base64url");
		return draftMessage;
	}
	async _call(arg) {
		const { message, to, subject, cc, bcc } = arg;
		const create_message = this.prepareDraftMessage(message, to, subject, cc, bcc);
		const gmail = await this.getGmailClient();
		const response = await gmail.users.drafts.create({
			userId: "me",
			requestBody: create_message
		});
		return `Draft created. Draft Id: ${response.data.id}`;
	}
};

//#endregion
export { GmailCreateDraft };
//# sourceMappingURL=create_draft.js.map