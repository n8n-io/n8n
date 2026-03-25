const require_base = require('./base.cjs');
const require_descriptions = require('./descriptions.cjs');
const require_run_view_events = require('./commands/run-view-events.cjs');

//#region src/tools/google_calendar/view.ts
/**
* @example
* ```typescript
* const googleCalendarViewTool = new GoogleCalendarViewTool({
*   credentials: {
*     clientEmail: process.env.GOOGLE_CALENDAR_CLIENT_EMAIL,
*     privateKey: process.env.GOOGLE_CALENDAR_PRIVATE_KEY,
*     calendarId: process.env.GOOGLE_CALENDAR_CALENDAR_ID,
*   },
*   scopes: [
*     "https:
*     "https:
*   ],
*   model: new ChatOpenAI({ model: "gpt-4o-mini" }),
* });
* const viewInput = `What meetings do I have this week?`;
* const viewResult = await googleCalendarViewTool.invoke({ input: viewInput });
* console.log("View Result", viewResult);
* ```
*/
var GoogleCalendarViewTool = class extends require_base.GoogleCalendarBase {
	name = "google_calendar_view";
	description = require_descriptions.VIEW_TOOL_DESCRIPTION;
	constructor(fields) {
		super(fields);
	}
	async _call(query, runManager) {
		const calendar = await this.getCalendarClient();
		const model = this.getModel();
		return require_run_view_events.runViewEvents(query, {
			calendar,
			model,
			calendarId: this.calendarId
		}, runManager);
	}
};

//#endregion
exports.GoogleCalendarViewTool = GoogleCalendarViewTool;
//# sourceMappingURL=view.cjs.map