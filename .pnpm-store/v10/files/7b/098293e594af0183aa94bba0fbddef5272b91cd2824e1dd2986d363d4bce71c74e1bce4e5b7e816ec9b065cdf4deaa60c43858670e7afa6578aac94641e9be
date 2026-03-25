import { ToolDefinition } from "@langchain/core/language_models/base";
import { StructuredToolInterface } from "@langchain/core/tools";

//#region src/tools/render.d.ts

/**
 * Render the tool name and description in plain text.
 *
 * Output will be in the format of:
 * ```
 * search: This tool is used for search
 * calculator: This tool is used for math
 * ```
 * @param tools
 * @returns a string of all tools and their descriptions
 */
declare function renderTextDescription(tools: StructuredToolInterface[] | ToolDefinition[]): string;
/**
 * Render the tool name, description, and args in plain text.
 * Output will be in the format of:'
 * ```
 * search: This tool is used for search, args: {"query": {"type": "string"}}
 * calculator: This tool is used for math,
 * args: {"expression": {"type": "string"}}
 * ```
 * @param tools
 * @returns a string of all tools, their descriptions and a stringified version of their schemas
 */
declare function renderTextDescriptionAndArgs(tools: StructuredToolInterface[] | ToolDefinition[]): string;
//#endregion
export { renderTextDescription, renderTextDescriptionAndArgs };
//# sourceMappingURL=render.d.cts.map