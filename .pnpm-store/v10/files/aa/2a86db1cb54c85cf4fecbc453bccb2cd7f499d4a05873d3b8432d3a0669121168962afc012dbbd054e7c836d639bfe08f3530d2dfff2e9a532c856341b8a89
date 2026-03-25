import { CREATE_EVENT_PROMPT } from "../prompts/create-event-prompt.js";
import { getTimezoneOffsetInHours } from "../utils/get-timezone-offset-in-hours.js";
import { z } from "zod/v3";
import { PromptTemplate } from "@langchain/core/prompts";

//#region src/tools/google_calendar/commands/run-create-events.ts
const eventSchema = z.object({
	event_summary: z.string(),
	event_start_time: z.string(),
	event_end_time: z.string(),
	event_location: z.string().optional(),
	event_description: z.string().optional(),
	user_timezone: z.string()
});
const createEvent = async ({ eventSummary, eventStartTime, eventEndTime, userTimezone, eventLocation = "", eventDescription = "" }, calendarId, calendar) => {
	const event = {
		summary: eventSummary,
		location: eventLocation,
		description: eventDescription,
		start: {
			dateTime: eventStartTime,
			timeZone: userTimezone
		},
		end: {
			dateTime: eventEndTime,
			timeZone: userTimezone
		}
	};
	try {
		const createdEvent = await calendar.events.insert({
			calendarId,
			requestBody: event
		});
		return createdEvent;
	} catch (error) {
		return { error: `An error occurred: ${error}` };
	}
};
const runCreateEvent = async (query, { calendarId, calendar, model }, runManager) => {
	const prompt = new PromptTemplate({
		template: CREATE_EVENT_PROMPT,
		inputVariables: [
			"date",
			"query",
			"u_timezone",
			"dayName"
		]
	});
	if (!model?.withStructuredOutput) throw new Error("Model does not support structured output");
	const createEventChain = prompt.pipe(model.withStructuredOutput(eventSchema));
	const date = (/* @__PURE__ */ new Date()).toISOString();
	const u_timezone = getTimezoneOffsetInHours();
	const dayName = (/* @__PURE__ */ new Date()).toLocaleString("en-us", { weekday: "long" });
	const output = await createEventChain.invoke({
		query,
		date,
		u_timezone,
		dayName
	}, runManager?.getChild());
	const [eventSummary, eventStartTime, eventEndTime, eventLocation, eventDescription, userTimezone] = Object.values(output);
	const event = await createEvent({
		eventSummary,
		eventStartTime,
		eventEndTime,
		userTimezone,
		eventLocation,
		eventDescription
	}, calendarId, calendar);
	if (!event.error) return `Event created successfully, details: event ${event.data.htmlLink}`;
	return `An error occurred creating the event: ${event.error}`;
};

//#endregion
export { runCreateEvent };
//# sourceMappingURL=run-create-events.js.map