import OpenAI from "openai";
import { RunnableFunc } from "@langchain/core/runnables";
import { DynamicTool, ToolRunnableConfig } from "@langchain/core/tools";

//#region src/tools/custom.d.ts
type CustomToolFields = Omit<OpenAI.Responses.CustomTool, "type">;
declare function customTool(func: RunnableFunc<string, string, ToolRunnableConfig>, fields: CustomToolFields): DynamicTool<string>;
//#endregion
export { customTool };
//# sourceMappingURL=custom.d.cts.map