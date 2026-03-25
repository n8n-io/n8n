import { AgentMiddleware } from "./types.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ClientTool, ServerTool } from "@langchain/core/tools";

//#region src/agents/middleware/toolEmulator.d.ts
/**
 * Options for configuring the Tool Emulator middleware.
 */
interface ToolEmulatorOptions {
  /**
   * List of tool names (string) or tool instances to emulate.
   * - If `undefined` (default), ALL tools will be emulated.
   * - If empty array, no tools will be emulated.
   * - If array with tool names/instances, only those tools will be emulated.
   */
  tools?: (string | ClientTool | ServerTool)[];
  /**
   * Model to use for emulation.
   * - Can be a model identifier string (e.g., "anthropic:claude-sonnet-4-5-20250929")
   * - Can be a BaseChatModel instance
   * - Defaults to agent model
   */
  model?: string | BaseChatModel;
}
/**
 * Middleware that emulates specified tools using an LLM instead of executing them.
 *
 * This middleware allows selective emulation of tools for testing purposes.
 * By default (when `tools` is undefined), all tools are emulated. You can specify
 * which tools to emulate by passing a list of tool names or tool instances.
 *
 * @param options - Configuration options for the middleware
 * @param options.tools - List of tool names or tool instances to emulate. If undefined, all tools are emulated.
 * @param options.model - Model to use for emulation. Defaults to "anthropic:claude-sonnet-4-5-20250929".
 *
 * @example Emulate all tools (default behavior)
 * ```ts
 * import { toolEmulatorMiddleware } from "@langchain/langchain/agents/middleware";
 * import { createAgent } from "@langchain/langchain/agents";
 *
 * const middleware = toolEmulatorMiddleware();
 *
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   tools: [getWeather, getUserLocation, calculator],
 *   middleware: [middleware],
 * });
 * ```
 *
 * @example Emulate specific tools by name
 * ```ts
 * const middleware = toolEmulatorMiddleware({
 *   tools: ["get_weather", "get_user_location"]
 * });
 * ```
 *
 * @example Use a custom model for emulation
 * ```ts
 * const middleware = toolEmulatorMiddleware({
 *   tools: ["get_weather"],
 *   model: "anthropic:claude-sonnet-4-5-20250929"
 * });
 * ```
 *
 * @example Emulate specific tools by passing tool instances
 * ```ts
 * const middleware = toolEmulatorMiddleware({
 *   tools: [getWeather, getUserLocation]
 * });
 * ```
 */
declare function toolEmulatorMiddleware(options?: ToolEmulatorOptions): AgentMiddleware<undefined, undefined, unknown, readonly (ServerTool | ClientTool)[]>;
//#endregion
export { ToolEmulatorOptions, toolEmulatorMiddleware };
//# sourceMappingURL=toolEmulator.d.ts.map