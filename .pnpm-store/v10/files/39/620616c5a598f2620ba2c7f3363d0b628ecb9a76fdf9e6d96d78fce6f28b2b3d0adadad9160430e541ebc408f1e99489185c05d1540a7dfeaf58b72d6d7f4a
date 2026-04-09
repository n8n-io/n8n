import type WatsonXAI from "../vml_v1.js";
/**
 * Converts a utility agent tool to a Watsonx text chat parameter tool format. This function
 * transforms the tool definition from the utility agent format to the format expected by Watsonx
 * text chat APIs.
 *
 * @example
 *   ```typescript
 *   const utilityTool = {
 *     name: 'calculator',
 *     description: 'Performs calculations',
 *     input_schema: { type: 'object', properties: { expression: { type: 'string' } } }
 *   };
 *   const watsonxTool = convertUtilityToolToWatsonxTool(utilityTool);
 *   ```;
 *
 * @param {WatsonXAI.UtilityAgentTool} utilityTool - The utility agent tool to convert
 * @returns {WatsonXAI.TextChatParameterTools} The converted tool in Watsonx format
 */
declare function convertUtilityToolToWatsonxTool(utilityTool: WatsonXAI.UtilityAgentTool): WatsonXAI.TextChatParameterTools;
/**
 * Converts a Watsonx tool call to a utility agent tool run request. This function transforms the
 * tool call from Watsonx text chat format to the format expected by the utility agent tools run
 * API.
 *
 * @example
 *   ```typescript
 *   const toolCall = {
 *     id: '12345',
 *     type: 'function',
 *     function: {
 *       name: 'calculator',
 *       arguments: '{"input": "2 + 2"}'
 *     }
 *   };
 *   const runRequest = convertWatsonxToolCallToUtilityToolCall(toolCall);
 *   ```;
 *
 * @param {WatsonXAI.TextChatToolCall} toolCall - The Watsonx tool call to convert
 * @param {WatsonXAI.JsonObject} [config] - Optional configuration for the tool run
 * @returns {WatsonXAI.WxUtilityAgentToolsRunRequest} The converted tool run request
 */
declare function convertWatsonxToolCallToUtilityToolCall(toolCall: WatsonXAI.TextChatToolCall, config?: WatsonXAI.JsonObject): WatsonXAI.WxUtilityAgentToolsRunRequest;
export { convertUtilityToolToWatsonxTool, convertWatsonxToolCallToUtilityToolCall };
//# sourceMappingURL=converters.d.ts.map