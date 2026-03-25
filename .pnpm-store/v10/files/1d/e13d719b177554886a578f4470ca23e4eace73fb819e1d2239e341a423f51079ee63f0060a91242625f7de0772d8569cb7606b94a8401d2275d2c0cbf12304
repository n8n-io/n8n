const require_rolldown_runtime = require('../../../_virtual/rolldown_runtime.cjs');
const require_view_events_prompt = require('../prompts/view-events-prompt.cjs');
const require_get_timezone_offset_in_hours = require('../utils/get-timezone-offset-in-hours.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/tools/google_calendar/commands/run-view-events.ts
const eventSchema = zod_v3.z.object({
	time_min: zod_v3.z.string(),
	time_max: zod_v3.z.string(),
	user_timezone: zod_v3.z.string(),
	max_results: zod_v3.z.number(),
	search_query: zod_v3.z.string().optional()
});
const runViewEvents = async (query, { model, calendar, calendarId }, runManager) => {
	const prompt = new __langchain_core_prompts.PromptTemplate({
		template: require_view_events_prompt.VIEW_EVENTS_PROMPT,
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
	const u_timezone = require_get_timezone_offset_in_hours.getTimezoneOffsetInHours();
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
exports.runViewEvents = runViewEvents;
//# sourceMappingURL=run-view-events.cjs.map