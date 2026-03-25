import { VIEW_EVENTS_PROMPT } from "../prompts/view-events-prompt.js";
import { getTimezoneOffsetInHours } from "../utils/get-timezone-offset-in-hours.js";
import { z } from "zod/v3";
import { PromptTemplate } from "@langchain/core/prompts";

//#region src/tools/google_calendar/commands/run-view-events.ts
const eventSchema = z.object({
	time_min: z.string(),
	time_max: z.string(),
	user_timezone: z.string(),
	max_results: z.number(),
	search_query: z.string().optional()
});
const runViewEvents = async (query, { model, calendar, calendarId }, runManager) => {
	const prompt = new PromptTemplate({
		template: VIEW_EVENTS_PROMPT,
		inputVariables: [
			"date",
			"query",
			"u_timezone",
			"dayName"
		]
	});
	if (!model?.withStructuredOutput) throw new Error("Model does not support structured output");
	const viewEventsChain = prompt.pipe(model.withStructuredOutput(eventSchema));
	const date = (/* @__PURE__ */ new Date()).toISOString();
	const u_timezone = getTimezoneOffsetInHours();
	const dayName = (/* @__PURE__ */ new Date()).toLocaleString("en-us", { weekday: "long" });
	const output = await viewEventsChain.invoke({
		query,
		date,
		u_timezone,
		dayName
	}, runManager?.getChild());
	try {
		const response = await calendar.events.list({
			calendarId,
			...output
		});
		const curatedItems = response.data && response.data.items ? response.data.items.map(({ status, summary, description, start, end }) => ({
			status,
			summary,
			description,
			start,
			end
		})) : [];
		return `Result for the prompt "${query}": \n${JSON.stringify(curatedItems, null, 2)}`;
	} catch (error) {
		return `An error occurred: ${error}`;
	}
};

//#endregion
export { runViewEvents };
//# sourceMappingURL=run-view-events.js.map