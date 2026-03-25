import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { StructuredTool } from "@langchain/core/tools";
import { google } from "googleapis";

//#region src/tools/gmail/base.ts
var GmailBaseTool = class extends StructuredTool {
	name = "Gmail";
	description = "A tool to send and view emails through Gmail";
	params;
	gmail;
	constructor({ credentials, scopes } = {
		credentials: {
			clientEmail: getEnvironmentVariable("GMAIL_CLIENT_EMAIL"),
			privateKey: getEnvironmentVariable("GMAIL_PRIVATE_KEY"),
			keyfile: getEnvironmentVariable("GMAIL_KEYFILE"),
			subject: getEnvironmentVariable("GMAIL_SUBJECT")
		},
		scopes: ["https://mail.google.com/"]
	}) {
		super(...arguments);
		if (!credentials) throw new Error("Missing credentials to authenticate to Gmail");
		if (!credentials.accessToken) {
			if (!credentials.clientEmail) throw new Error("Missing GMAIL_CLIENT_EMAIL to interact with Gmail");
			if (!credentials.privateKey && !credentials.keyfile) throw new Error("Missing GMAIL_PRIVATE_KEY or GMAIL_KEYFILE or accessToken to interact with Gmail");
		}
		this.params = {
			credentials,
			scopes
		};
	}
	async getGmailClient() {
		const { credentials, scopes } = this.params;
		if (credentials?.accessToken) {
			const auth$1 = new google.auth.OAuth2();
			const accessToken = typeof credentials.accessToken === "function" ? await credentials.accessToken() : credentials.accessToken;
			auth$1.setCredentials({ access_token: accessToken });
			return google.gmail({
				version: "v1",
				auth: auth$1
			});
		}
		if (this.gmail) return this.gmail;
		const auth = new google.auth.JWT(credentials?.clientEmail, credentials?.keyfile, credentials?.privateKey, scopes, credentials?.subject);
		this.gmail = google.gmail({
			version: "v1",
			auth
		});
		return this.gmail;
	}
	parseHeaderAndBody(payload) {
		if (!payload) return { body: "" };
		const headers = payload.headers || [];
		const subject = headers.find((header) => header.name === "Subject");
		const sender = headers.find((header) => header.name === "From");
		let body = "";
		if (payload.parts) body = payload.parts.map((part) => part.mimeType === "text/plain" ? this.decodeBody(part.body?.data ?? "") : "").join("");
		else if (payload.body?.data) body = this.decodeBody(payload.body.data);
		return {
			subject,
			sender,
			body
		};
	}
	decodeBody(body) {
		if (body) try {
			return atob(body.replace(/-/g, "+").replace(/_/g, "/"));
		} catch {
			return body;
		}
		return "";
	}
};

//#endregion
export { GmailBaseTool };
//# sourceMappingURL=base.js.map