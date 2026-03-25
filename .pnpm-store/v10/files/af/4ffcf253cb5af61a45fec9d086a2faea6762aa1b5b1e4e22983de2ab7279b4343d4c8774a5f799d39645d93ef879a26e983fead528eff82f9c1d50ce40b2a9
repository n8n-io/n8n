import { RunnableToolLike } from "../runnables/base.js";
import { FunctionDefinition, ToolDefinition } from "../language_models/base.js";
import { StructuredToolInterface, StructuredToolParams, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams } from "../tools/types.js";

//#region src/utils/function_calling.d.ts
/**
 * Formats a `StructuredTool` or `RunnableToolLike` instance into a format
 * that is compatible with OpenAI function calling. If `StructuredTool` or
 * `RunnableToolLike` has a zod schema, the output will be converted into a
 * JSON schema, which is then used as the parameters for the OpenAI tool.
 *
 * @param {StructuredToolInterface | RunnableToolLike} tool The tool to convert to an OpenAI function.
 * @returns {FunctionDefinition} The inputted tool in OpenAI function format.
 */
declare function convertToOpenAIFunction(tool: StructuredToolInterface | RunnableToolLike | StructuredToolParams, fields?: {
  /**
   * If `true`, model output is guaranteed to exactly match the JSON Schema
   * provided in the function definition.
   */
  strict?: boolean;
} | number): FunctionDefinition;
/**
 * Formats a `StructuredTool` or `RunnableToolLike` instance into a
 * format that is compatible with OpenAI tool calling. If `StructuredTool` or
 * `RunnableToolLike` has a zod schema, the output will be converted into a
 * JSON schema, which is then used as the parameters for the OpenAI tool.
 *
 * @param {StructuredToolInterface | Record<string, any> | RunnableToolLike} tool The tool to convert to an OpenAI tool.
 * @returns {ToolDefinition} The inputted tool in OpenAI tool format.
 */
declare function convertToOpenAITool(tool: StructuredToolInterface | Record<string, any> | RunnableToolLike, fields?: {
  /**
   * If `true`, model output is guaranteed to exactly match the JSON Schema
   * provided in the function definition.
   */
  strict?: boolean;
} | number): ToolDefinition;
//#endregion
export { convertToOpenAIFunction, convertToOpenAITool, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams };
//# sourceMappingURL=function_calling.d.ts.map