import { GmailBaseTool, GmailBaseToolParams } from "./base.js";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/tools/gmail/get_thread.d.ts
declare const getThreadSchema: z.ZodObject<{
  threadId: z.ZodString;
}, "strip", z.ZodTypeAny, {
  threadId: string;
}, {
  threadId: string;
}>;
type GetThreadSchema = z.infer<typeof getThreadSchema>;
declare class GmailGetThread extends GmailBaseTool {
  name: string;
  schema: z.ZodObject<{
    threadId: z.ZodString;
  }, "strip", z.ZodTypeAny, {
    threadId: string;
  }, {
    threadId: string;
  }>;
  description: string;
  constructor(fields?: GmailBaseToolParams);
  _call(arg: InferInteropZodOutput<GetThreadSchema>): Promise<string>;
}
//#endregion
export { GetThreadSchema, GmailGetThread };
//# sourceMappingURL=get_thread.d.ts.map