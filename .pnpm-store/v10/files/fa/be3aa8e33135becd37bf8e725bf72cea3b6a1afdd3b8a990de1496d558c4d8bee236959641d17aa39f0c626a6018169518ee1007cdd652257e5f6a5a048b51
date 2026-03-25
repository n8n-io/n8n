import { DynamicStructuredTool, DynamicStructuredToolInput } from "@langchain/core/tools";
import { z } from "zod";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";

//#region src/agents/toolkits/conversational_retrieval/tool.d.ts
declare function createRetrieverTool(retriever: BaseRetrieverInterface, input: Omit<DynamicStructuredToolInput, "func" | "schema">): DynamicStructuredTool<z.ZodObject<{
  input: z.ZodString;
}, z.core.$strip>, {
  input: string;
}, {
  input: string;
}, string, string>;
//#endregion
export { createRetrieverTool };
//# sourceMappingURL=tool.d.ts.map