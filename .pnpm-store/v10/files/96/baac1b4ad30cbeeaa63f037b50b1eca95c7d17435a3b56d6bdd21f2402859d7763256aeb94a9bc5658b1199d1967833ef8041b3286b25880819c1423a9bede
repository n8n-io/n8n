import { GmailBaseTool, GmailBaseToolParams } from "./base.cjs";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/tools/gmail/create_draft.d.ts
declare const createDraftSchema: z.ZodObject<{
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
type CreateDraftSchema = z.infer<typeof createDraftSchema>;
declare class GmailCreateDraft extends GmailBaseTool {
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
  private prepareDraftMessage;
  _call(arg: InferInteropZodOutput<CreateDraftSchema>): Promise<string>;
}
//#endregion
export { CreateDraftSchema, GmailCreateDraft };
//# sourceMappingURL=create_draft.d.cts.map