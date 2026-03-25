const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_delete_event_prompt = require('../prompts/delete-event-prompt.cjs');
const require_get_timezone_offset_in_hours = require('../utils/get-timezone-offset-in-hours.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/tools/google_calendar/commands/run-delete-events.ts
const deleteEventSchema = zod_v3.z.object({
	event_id: zod_v3.z.string().optional(),
	event_summary: zod_v3.z.string().optional(),
	time_min: zod_v3.z.string().optional(),
	time_max: zod_v3.z.string().optional(),
	user_timezone: zod_v3.z.string()
});
const deleteEvent = async (calendarId, eventId, calendar) => {
	try {
		await calendar.events.delete({
			calendarId,
			eventId
		});
		return "Event deleted successfully";
	} catch (error) {
		return `An error occurred: ${error}`;
	}
};
const runDeleteEvent = async (query, { calendarId, calendar, model }, runManager) => {
	const prompt = new __langchain_core_prompts.PromptTemplate({
		template: require_delete_event_prompt.DELETE_EVENT_PROMPT,
		inputVariables: [
			"date",
			"query",
			"u_timezone",
			"dayName"
		]
	});
	if (!model?.withStructuredOutput) throw new Error("Model does not support structured output");
	const deleteEventChain = prompt.pipe(model.withStructuredOutput(deleteEventSchema));
	const date = (/* @__PURE__ */ new Date()).toISOString();
	const u_timezone = require_get_timezone_offset_in_hours.getTimezoneOffsetInHours();
	const dayName = (/* @__PURE__ */ new Date()).toLocaleString("en-us", { weekday: "long" });
	const output = await deleteEventChain.invoke({
		query,
		date,
		u_timezone,
		dayName
	}, runManager?.getChild());
	const { event_id, event_summary, time_min, time_max } = output;
	if (event_id) return deleteEvent(calendarId, event_id, calendar);
	if (event_summary || time_min && time_max) try {
		const response = await calendar.events.list({
			calendarId,
			timeMin: time_min,
			timeMax: time_max,
			q: event_summary,
			singleEvents: true
		});
		const items = response.data.items || [];
		if (items.length === 0) return "No events found matching the description.";
		if (items.length === 1 && items[0].id) return deleteEvent(calendarId, items[0].id, calendar);
		if (items.length > 1) {
			const eventsList = items.map((event) => `- ${event.summary} (${event.start?.dateTime || event.start?.date})`).join("\n");
			return `Multiple events found. Please be more specific:\n${eventsList}`;
		}
	} catch (error) {
		return `An error occurred while searching for the event: ${error}`;
	}
	return "Could not extract event details to delete. Please provide an event ID or a description with time.";
};

//#endregion
exports.runDeleteEvent = runDeleteEvent;
//# sourceMappingURL=run-delete-events.cjs.map