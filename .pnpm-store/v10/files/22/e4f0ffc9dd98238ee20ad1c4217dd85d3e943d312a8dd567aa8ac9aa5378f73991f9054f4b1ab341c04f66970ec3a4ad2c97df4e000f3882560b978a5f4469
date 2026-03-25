import { CodeExecutionTool, FunctionDeclarationsTool, GoogleSearchRetrievalTool, Part } from "@google/generative-ai";
import { BindToolsInput } from "@langchain/core/language_models/chat_models";

//#region src/types.d.ts
type GoogleGenerativeAIToolType = BindToolsInput | FunctionDeclarationsTool | CodeExecutionTool | GoogleSearchRetrievalTool;
type GoogleGenerativeAIThinkingConfig = {
  /** Indicates whether to include thoughts in the response. If true, thoughts are returned only when available. */includeThoughts?: boolean; /** The number of thoughts tokens that the model should generate. */
  thinkingBudget?: number; /** Optional. The level of thoughts tokens that the model should generate. */
  thinkingLevel?: GoogleGenerativeAIThinkingLevel;
};
type GoogleGenerativeAIThinkingLevel = "THINKING_LEVEL_UNSPECIFIED" | "LOW" | "MEDIUM" | "HIGH";
//#endregion
export { GoogleGenerativeAIThinkingConfig, GoogleGenerativeAIToolType };
//# sourceMappingURL=types.d.cts.map