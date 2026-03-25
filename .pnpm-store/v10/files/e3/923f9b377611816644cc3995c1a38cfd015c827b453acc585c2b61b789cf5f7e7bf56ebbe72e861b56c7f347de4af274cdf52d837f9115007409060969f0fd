import { GoogleCalendarAgentParams, GoogleCalendarBase } from "./base.cjs";
import { CallbackManagerForToolRun } from "@langchain/core/callbacks/manager";

//#region src/tools/google_calendar/delete.d.ts

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
declare class GoogleCalendarDeleteTool extends GoogleCalendarBase {
  name: string;
  description: string;
  constructor(fields: GoogleCalendarAgentParams);
  _call(query: string, runManager?: CallbackManagerForToolRun): Promise<string>;
}
//#endregion
export { GoogleCalendarDeleteTool };
//# sourceMappingURL=delete.d.cts.map