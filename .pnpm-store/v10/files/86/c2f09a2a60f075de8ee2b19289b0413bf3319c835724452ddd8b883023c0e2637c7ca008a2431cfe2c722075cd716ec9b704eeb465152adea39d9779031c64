import { StructuredTool } from "@langchain/core/tools";
import { gmail_v1 } from "googleapis";

//#region src/tools/gmail/base.d.ts
interface GmailBaseToolParams {
  credentials?: {
    clientEmail?: string;
    privateKey?: string;
    keyfile?: string;
    subject?: string;
    accessToken?: string | (() => Promise<string>);
  };
  scopes?: string[];
}
declare abstract class GmailBaseTool extends StructuredTool {
  name: string;
  description: string;
  protected params: GmailBaseToolParams;
  protected gmail?: gmail_v1.Gmail;
  constructor({
    credentials,
    scopes
  }?: GmailBaseToolParams);
  getGmailClient(): Promise<gmail_v1.Gmail>;
  parseHeaderAndBody(payload: gmail_v1.Schema$MessagePart | undefined): {
    body: string;
    subject?: undefined;
    sender?: undefined;
  } | {
    subject: gmail_v1.Schema$MessagePartHeader | undefined;
    sender: gmail_v1.Schema$MessagePartHeader | undefined;
    body: string;
  };
  decodeBody(body: string): string;
}
//#endregion
export { GmailBaseTool, GmailBaseToolParams };
//# sourceMappingURL=base.d.cts.map