import { GmailBaseTool, GmailBaseToolParams } from "./base.cjs";
import { InferInteropZodOutput } from "@langchain/core/utils/types";
import { z } from "zod/v3";
import { gmail_v1 } from "googleapis";

//#region src/tools/gmail/search.d.ts
declare const searchSchema: z.ZodObject<{
  query: z.ZodString;
  maxResults: z.ZodOptional<z.ZodNumber>;
  resource: z.ZodOptional<z.ZodEnum<["messages", "threads"]>>;
}, "strip", z.ZodTypeAny, {
  query: string;
  maxResults?: number | undefined;
  resource?: "messages" | "threads" | undefined;
}, {
  query: string;
  maxResults?: number | undefined;
  resource?: "messages" | "threads" | undefined;
}>;
type SearchSchema = z.infer<typeof searchSchema>;
declare class GmailSearch extends GmailBaseTool {
  name: string;
  schema: z.ZodObject<{
    query: z.ZodString;
    maxResults: z.ZodOptional<z.ZodNumber>;
    resource: z.ZodOptional<z.ZodEnum<["messages", "threads"]>>;
  }, "strip", z.ZodTypeAny, {
    query: string;
    maxResults?: number | undefined;
    resource?: "messages" | "threads" | undefined;
  }, {
    query: string;
    maxResults?: number | undefined;
    resource?: "messages" | "threads" | undefined;
  }>;
  description: string;
  constructor(fields?: GmailBaseToolParams);
  _call(arg: InferInteropZodOutput<SearchSchema>): Promise<string>;
  parseMessages(gmail: gmail_v1.Gmail, messages: gmail_v1.Schema$Message[]): Promise<gmail_v1.Schema$Message[]>;
  parseThreads(gmail: gmail_v1.Gmail, messages: gmail_v1.Schema$Message[]): Promise<gmail_v1.Schema$Thread[]>;
}
//#endregion
export { GmailSearch, SearchSchema };
//# sourceMappingURL=search.d.cts.map