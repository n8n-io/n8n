import { GoogleCalendarAgentParams, GoogleCalendarBase } from "./base.cjs";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";

//#region src/tools/google_calendar/create.d.ts

/**
 * @example
 * ```typescript
 * const googleCalendarCreateTool = new GoogleCalendarCreateTool({
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
 * const createInput = `Create a meeting with John Doe next Friday at 4pm - adding to the agenda of it the result of 99 + 99`;
 * const createResult = await googleCalendarCreateTool.invoke({
 *   input: createInput,
 * });
 * console.log("Create Result", createResult);
 * ```
 */
declare class GoogleCalendarCreateTool extends GoogleCalendarBase {
  name: string;
  description: string;
  constructor(fields: GoogleCalendarAgentParams);
  _call(query: string, runManager?: CallbackManagerForToolRun): Promise<string>;
}
//#endregion
export { GoogleCalendarCreateTool };
//# sourceMappingURL=create.d.cts.map