import { DynamicStructuredTool, DynamicStructuredToolInput } from "@langchain/core/tools";
import { BaseRetrieverInterface } from "@langchain/core/retrievers";
import { z } from "zod/v3";

//#region src/tools/retriever.d.ts
declare function createRetrieverTool(retriever: BaseRetrieverInterface, input: Omit<DynamicStructuredToolInput, "func" | "schema">): DynamicStructuredTool<z.ZodObject<{
  query: z.ZodString;
}, "strip", z.ZodTypeAny, {
  query: string;
}, {
  query: string;
}>, {
  query: string;
}, {
  query: string;
}, string>;
//#endregion
export { createRetrieverTool };
//# sourceMappingURL=retriever.d.cts.map