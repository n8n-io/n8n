import { getEnvironmentVariable } from "@langchain/core/utils/env";
import { Tool } from "@langchain/core/tools";
import { google } from "googleapis";

//#region src/tools/google_calendar/base.ts
var GoogleCalendarBase = class extends Tool {
	name = "Google Calendar";
	description = "A tool to lookup Google Calendar events and create events in Google Calendar";
	calendarId;
	llm;
	params;
	calendar;
	constructor({ credentials, scopes, model } = {
		credentials: {
			clientEmail: getEnvironmentVariable("GOOGLE_CALENDAR_CLIENT_EMAIL"),
			privateKey: getEnvironmentVariable("GOOGLE_CALENDAR_PRIVATE_KEY"),
			keyfile: getEnvironmentVariable("GOOGLE_CALENDAR_KEYFILE"),
			subject: getEnvironmentVariable("GOOGLE_CALENDAR_SUBJECT"),
			calendarId: getEnvironmentVariable("GOOGLE_CALENDAR_CALENDAR_ID") || "primary"
		},
		scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"]
	}) {
		super(...arguments);
		if (!model) throw new Error("Missing llm instance to interact with Google Calendar");
		if (!credentials) throw new Error("Missing credentials to authenticate to Google Calendar");
		if (!credentials.accessToken) {
			if (!credentials.clientEmail) throw new Error("Missing GOOGLE_CALENDAR_CLIENT_EMAIL to interact with Google Calendar");
			if (!credentials.privateKey && !credentials.keyfile) throw new Error("Missing GOOGLE_CALENDAR_PRIVATE_KEY or GOOGLE_CALENDAR_KEYFILE or accessToken to interact with Google Calendar");
		}
		if (!credentials.calendarId) throw new Error("Missing GOOGLE_CALENDAR_CALENDAR_ID to interact with Google Calendar");
		this.params = {
			credentials,
			scopes
		};
		this.calendarId = credentials.calendarId;
		this.llm = model;
	}
	getModel() {
		return this.llm;
	}
	async getCalendarClient() {
		const { credentials, scopes } = this.params;
		if (credentials?.accessToken) {
			const auth$1 = new google.auth.OAuth2();
			const accessToken = typeof credentials.accessToken === "function" ? await credentials.accessToken() : credentials.accessToken;
			auth$1.setCredentials({ access_token: accessToken });
			return google.calendar({
				version: "v3",
				auth: auth$1
			});
		}
		if (this.calendar) return this.calendar;
		const auth = new google.auth.JWT(credentials?.clientEmail, credentials?.keyfile, credentials?.privateKey, scopes, credentials?.subject);
		this.calendar = google.calendar({
			version: "v3",
			auth
		});
		return this.calendar;
	}
	async _call(input) {
		return input;
	}
};

//#endregion
export { GoogleCalendarBase };
//# sourceMappingURL=base.js.map