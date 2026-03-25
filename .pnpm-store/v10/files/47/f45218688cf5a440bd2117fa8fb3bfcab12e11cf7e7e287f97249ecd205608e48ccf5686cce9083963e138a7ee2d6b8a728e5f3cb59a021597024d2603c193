import { AgentBuiltInState, Runtime } from "../runtime.js";
import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { ClientTool, ServerTool } from "@langchain/core/tools";
import { LanguageModelLike } from "@langchain/core/language_models/base";

//#region src/agents/nodes/types.d.ts
/**
 * Configuration for modifying a model call at runtime.
 * All fields are optional and only provided fields will override defaults.
 *
 * @template TState - The agent's state type, must extend Record<string, unknown>. Defaults to Record<string, unknown>.
 * @template TContext - The runtime context type for accessing metadata and control flow. Defaults to unknown.
 */
interface ModelRequest<TState extends Record<string, unknown> = Record<string, unknown>, TContext = unknown> {
  /**
   * The model to use for this step.
   */
  model: LanguageModelLike;
  /**
   * The messages to send to the model.
   */
  messages: BaseMessage[];
  /**
   * The system message string for this step.
   *
   * @default ""
   * @deprecated Use {@link ModelRequest.systemMessage} instead.
   */
  systemPrompt: string;
  /**
   * The system message for this step. If no `systemPrompt` was provided, when `createAgent`
   * was initialized, an empty system message will be used.
   *
   * @default new SystemMessage("")
   * @example extend system message with a string
   * ```ts
   * wrapModelCall: async (request, handler) => {
   *   return handler({
   *     ...request,
   *     systemMessage: request.systemMessage.concat("something")
   *   });
   * }
   * ```
   * @example extend system message with a SystemMessage and cache control
   * ```ts
   * wrapModelCall: async (request, handler) => {
   *   return handler({
   *     ...request,
   *     systemMessage: request.systemMessage.concat(
   *       new SystemMessage({
   *         content: [{
   *           type: "text",
   *           text: "something",
   *           cache_control: { type: "ephemeral", ttl: "1m" }
   *         }],
   *       })
   *     ),
   *   });
   * }
   * ```
   */
  systemMessage: SystemMessage;
  /**
   * Tool choice configuration (model-specific format).
   * Can be one of:
   * - `"auto"`: means the model can pick between generating a message or calling one or more tools.
   * - `"none"`: means the model will not call any tool and instead generates a message.
   * - `"required"`: means the model must call one or more tools.
   * - `{ type: "function", function: { name: string } }`: The model will use the specified function.
   */
  toolChoice?: "auto" | "none" | "required" | {
    type: "function";
    function: {
      name: string;
    };
  };
  /**
   * The tools to make available for this step.
   */
  tools: (ServerTool | ClientTool)[];
  /**
   * The current agent state (includes both middleware state and built-in state).
   */
  state: TState & AgentBuiltInState;
  /**
   * The runtime context containing metadata, signal, writer, interrupt, etc.
   */
  runtime: Runtime<TContext>;
  /**
   * Additional settings to bind to the model when preparing it for invocation.
   * These settings are applied via `bindTools()` and can include parameters like
   * `headers`, `container`, etc. The model is re-bound on each request,
   * so these settings can vary per invocation.
   *
   * @example
   * ```ts
   * modelSettings: {
   *   headers: { "anthropic-beta": "code-execution-2025-08-25" },
   *   container: "container_abc123"
   * }
   * ```
   */
  modelSettings?: Record<string, unknown>;
}
//#endregion
export { ModelRequest };
//# sourceMappingURL=types.d.ts.map