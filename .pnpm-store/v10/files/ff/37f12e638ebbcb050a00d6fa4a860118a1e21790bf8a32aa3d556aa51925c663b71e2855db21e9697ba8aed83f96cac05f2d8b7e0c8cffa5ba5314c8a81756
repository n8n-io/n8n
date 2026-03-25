import { GmailBaseTool, GmailBaseToolParams } from "./base.js";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/tools/gmail/get_message.d.ts
declare const getMessageSchema: z.ZodObject<{
  messageId: z.ZodString;
}, "strip", z.ZodTypeAny, {
  messageId: string;
}, {
  messageId: string;
}>;
type GetMessageSchema = z.infer<typeof getMessageSchema>;
declare class GmailGetMessage extends GmailBaseTool {
  name: string;
  schema: z.ZodObject<{
    messageId: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    messageId: string;
  }, {
    messageId: string;
  }>;
  description: string;
  constructor(fields?: GmailBaseToolParams);
  _call(arg: InferInteropZodOutput<GetMessageSchema>): Promise<string>;
}
//#endregion
export { GetMessageSchema, GmailGetMessage };
//# sourceMappingURL=get_message.d.ts.map