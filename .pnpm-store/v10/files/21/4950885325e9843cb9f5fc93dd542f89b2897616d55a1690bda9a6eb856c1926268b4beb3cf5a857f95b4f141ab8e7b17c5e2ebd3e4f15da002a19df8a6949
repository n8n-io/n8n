import { GoogleCalendarAgentParams, GoogleCalendarBase } from "./base.cjs";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";

//#region src/tools/google_calendar/view.d.ts

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
declare class GoogleCalendarViewTool extends GoogleCalendarBase {
  name: string;
  description: string;
  constructor(fields: GoogleCalendarAgentParams);
  _call(query: string, runManager?: CallbackManagerForToolRun): Promise<string>;
}
//#endregion
export { GoogleCalendarViewTool };
//# sourceMappingURL=view.d.cts.map