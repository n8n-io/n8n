const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const googleapis = require_rolldown_runtime.__toESM(require("googleapis"));

//#region src/tools/google_calendar/base.ts
var GoogleCalendarBase = class extends __langchain_core_tools.Tool {
	name = "Google Calendar";
	description = "A tool to lookup Google Calendar events and create events in Google Calendar";
	calendarId;
	llm;
	params;
	calendar;
	constructor({ credentials, scopes, model } = {
		credentials: {
			clientEmail: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_CALENDAR_CLIENT_EMAIL"),
			privateKey: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_CALENDAR_PRIVATE_KEY"),
			keyfile: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_CALENDAR_KEYFILE"),
			subject: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_CALENDAR_SUBJECT"),
			calendarId: (0, __langchain_core_utils_env.getEnvironmentVariable)("GOOGLE_CALENDAR_CALENDAR_ID") || "primary"
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
			const auth$1 = new googleapis.google.auth.OAuth2();
			const accessToken = typeof credentials.accessToken === "function" ? await credentials.accessToken() : credentials.accessToken;
			auth$1.setCredentials({ access_token: accessToken });
			return googleapis.google.calendar({
				version: "v3",
				auth: auth$1
			});
		}
		if (this.calendar) return this.calendar;
		const auth = new googleapis.google.auth.JWT(credentials?.clientEmail, credentials?.keyfile, credentials?.privateKey, scopes, credentials?.subject);
		this.calendar = googleapis.google.calendar({
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
exports.GoogleCalendarBase = GoogleCalendarBase;
//# sourceMappingURL=base.cjs.map