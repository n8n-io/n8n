const require_base = require('./base.cjs');
const require_descriptions = require('./descriptions.cjs');
const require_run_delete_events = require('./commands/run-delete-events.cjs');

//#region src/tools/google_calendar/delete.ts
/**
* @example
* ```typescript
* const googleCalendarDeleteTool = new GoogleCalendarDeleteTool({
*   credentials: {
*     clientEmail: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
*     privateKey: process.env.GOOGLE_CALENDAR_PRIVATE_KEY,
*     calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
*   },
*   scopes: [
*     "https://www.googleapis.com/auth/calendar",
*     "https://www.googleapis.com/auth/calendar.events",
*   ],
*   model: new ChatOpenAI({ model: "gpt-4o-mini" }),
* });
* const deleteInput = `Delete the meeting with John at 3pm`;
* const deleteResult = await googleCalendarDeleteTool.invoke({
*   input: deleteInput,
* });
* console.log("Delete Result", deleteResult);
* ```
*/
var GoogleCalendarDeleteTool = class extends require_base.GoogleCalendarBase {
	name = "google_calendar_delete";
	description = require_descriptions.DELETE_TOOL_DESCRIPTION;
	constructor(fields) {
		super(fields);
	}
	async _call(query, runManager) {
		const calendar = await this.getCalendarClient();
		const model = this.getModel();
		return require_run_delete_events.runDeleteEvent(query, {
			calendar,
			model,
			calendarId: this.calendarId
		}, runManager);
	}
};

//#endregion
exports.GoogleCalendarDeleteTool = GoogleCalendarDeleteTool;
//# sourceMappingURL=delete.cjs.map