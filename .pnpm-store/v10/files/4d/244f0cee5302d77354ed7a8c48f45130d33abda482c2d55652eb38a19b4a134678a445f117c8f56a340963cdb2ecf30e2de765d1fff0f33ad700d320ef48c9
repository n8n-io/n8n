import { GmailBaseTool, GmailBaseToolParams } from "./base.js";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/tools/gmail/send_message.d.ts
declare const sendMessageSchema: z.ZodObject<{
  message: z.ZodString;
  to: z.ZodArray<z.ZodString, "many">;
  subject: z.ZodString;
  cc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
  bcc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
  message: string;
  to: string[];
  subject: string;
  cc?: string[] | undefined;
  bcc?: string[] | undefined;
}, {
  message: string;
  to: string[];
  subject: string;
  cc?: string[] | undefined;
  bcc?: string[] | undefined;
}>;
type SendMessageSchema = z.infer<typeof sendMessageSchema>;
declare class GmailSendMessage extends GmailBaseTool {
  name: string;
  schema: z.ZodObject<{
    message: z.ZodString;
    to: z.ZodArray<z.ZodString, "many">;
    subject: z.ZodString;
    cc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    bcc: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
  }, "strip", z.ZodTypeAny, {
    message: string;
    to: string[];
    subject: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
  }, {
    message: string;
    to: string[];
    subject: string;
    cc?: string[] | undefined;
    bcc?: string[] | undefined;
  }>;
  description: string;
  constructor(fields?: GmailBaseToolParams);
  private createEmailMessage;
  _call({
    message,
    to,
    subject,
    cc,
    bcc
  }: InferInteropZodOutput<SendMessageSchema>): Promise<string>;
}
//#endregion
export { GmailSendMessage, SendMessageSchema };
//# sourceMappingURL=send_message.d.ts.map