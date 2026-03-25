const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_base = require('./base.cjs');
const require_descriptions = require('./descriptions.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/tools/gmail/create_draft.ts
const createDraftSchema = zod_v3.z.object({
	message: zod_v3.z.string(),
	to: zod_v3.z.array(zod_v3.z.string()),
	subject: zod_v3.z.string(),
	cc: zod_v3.z.array(zod_v3.z.string()).optional(),
	bcc: zod_v3.z.array(zod_v3.z.string()).optional()
});
var GmailCreateDraft = class extends require_base.GmailBaseTool {
	name = "create_gmail_draft";
	schema = createDraftSchema;
	description = require_descriptions.CREATE_DRAFT_DESCRIPTION;
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
exports.GmailCreateDraft = GmailCreateDraft;
//# sourceMappingURL=create_draft.cjs.map