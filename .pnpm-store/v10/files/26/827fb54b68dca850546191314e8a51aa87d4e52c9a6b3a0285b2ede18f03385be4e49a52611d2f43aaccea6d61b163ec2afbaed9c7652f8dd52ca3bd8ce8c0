import { DynamicStructuredTool, DynamicStructuredToolInput } from "@langchain/core/tools";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";
import { z } from "zod";

//#region src/agents/toolkits/conversational_retrieval/tool.d.ts
declare function createRetrieverTool(retriever: BaseRetrieverInterface, input: Omit<DynamicStructuredToolInput, "func" | "schema">): DynamicStructuredTool<z.ZodObject<{
  input: z.ZodString;
}, "strip", z.ZodTypeAny, {
  input: string;
}, {
  input: string;
}>, {
  input: string;
}, {
  input: string;
}, string>;
//#endregion
export { createRetrieverTool };
//# sourceMappingURL=tool.d.cts.map