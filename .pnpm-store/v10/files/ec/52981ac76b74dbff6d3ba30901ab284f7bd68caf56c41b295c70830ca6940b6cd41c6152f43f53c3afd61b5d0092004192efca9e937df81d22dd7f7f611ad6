import * as _langchain_core_language_models_base0 from "@langchain/core/language_models/base";
import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { Tool } from "@langchain/core/tools";
import { calendar_v3 } from "googleapis";

//#region src/tools/google_calendar/base.d.ts
interface GoogleCalendarAgentParams {
  credentials?: {
    clientEmail?: string;
    privateKey?: string;
    keyfile?: string;
    subject?: string;
    accessToken?: string | (() => Promise<string>);
    calendarId?: string;
  };
  scopes?: string[];
  model?: BaseLanguageModel;
}
declare class GoogleCalendarBase extends Tool {
  name: string;
  description: string;
  protected calendarId: string;
  protected llm: BaseLanguageModel;
  protected params: GoogleCalendarAgentParams;
  protected calendar?: calendar_v3.Calendar;
  constructor({
    credentials,
    scopes,
    model
  }?: GoogleCalendarAgentParams);
  getModel(): BaseLanguageModel<any, _langchain_core_language_models_base0.BaseLanguageModelCallOptions>;
  getCalendarClient(): Promise<calendar_v3.Calendar>;
  _call(input: string): Promise<string>;
}
//#endregion
export { GoogleCalendarAgentParams, GoogleCalendarBase };
//# sourceMappingURL=base.d.cts.map