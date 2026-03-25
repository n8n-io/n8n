import { AgentMiddleware } from "./types.js";
import { ContextSize, KeepSize, TokenCounter } from "./summarization.js";
import { BaseMessage } from "@langchain/core/messages";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

//#region src/agents/middleware/contextEditing.d.ts
/**
 * Protocol describing a context editing strategy.
 *
 * Implement this interface to create custom strategies for managing
 * conversation context size. The `apply` method should modify the
 * messages array in-place and return the updated token count.
 *
 * @example
 * ```ts
 * import { HumanMessage, type ContextEdit, type BaseMessage  } from "langchain";
 *
 * class RemoveOldHumanMessages implements ContextEdit {
 *   constructor(private keepRecent: number = 10) {}
 *
 *   async apply({ messages, countTokens }) {
 *     // Check current token count
 *     const tokens = await countTokens(messages);
 *
 *     // Remove old human messages if over limit, keeping the most recent ones
 *     if (tokens > 50000) {
 *       const humanMessages: number[] = [];
 *
 *       // Find all human message indices
 *       for (let i = 0; i < messages.length; i++) {
 *         if (HumanMessage.isInstance(messages[i])) {
 *           humanMessages.push(i);
 *         }
 *       }
 *
 *       // Remove old human messages (keep only the most recent N)
 *       const toRemove = humanMessages.slice(0, -this.keepRecent);
 *       for (let i = toRemove.length - 1; i >= 0; i--) {
 *         messages.splice(toRemove[i]!, 1);
 *       }
 *     }
 *   }
 * }
 * ```
 */
interface ContextEdit {
  /**
   * Apply an edit to the message list, returning the new token count.
   *
   * This method should:
   * 1. Check if editing is needed based on `tokens` parameter
   * 2. Modify the `messages` array in-place (if needed)
   * 3. Return the new token count after modifications
   *
   * @param params - Parameters for the editing operation
   * @returns The updated token count after applying edits
   */
  apply(params: {
    /**
     * Array of messages to potentially edit (modify in-place)
     */
    messages: BaseMessage[];
    /**
     * Function to count tokens in a message array
     */
    countTokens: TokenCounter;
    /**
     * Optional model instance for model profile information
     */
    model?: BaseLanguageModel;
  }): void | Promise<void>;
}
/**
 * Configuration for clearing tool outputs when token limits are exceeded.
 */
interface ClearToolUsesEditConfig {
  /**
   * Trigger conditions for context editing.
   * Can be a single condition object (all properties must be met) or an array of conditions (any condition must be met).
   *
   * @example
   * ```ts
   * // Single condition: trigger if tokens >= 100000 AND messages >= 50
   * trigger: { tokens: 100000, messages: 50 }
   *
   * // Multiple conditions: trigger if (tokens >= 100000 AND messages >= 50) OR (tokens >= 50000 AND messages >= 100)
   * trigger: [
   *   { tokens: 100000, messages: 50 },
   *   { tokens: 50000, messages: 100 }
   * ]
   *
   * // Fractional trigger: trigger at 80% of model's max input tokens
   * trigger: { fraction: 0.8 }
   * ```
   */
  trigger?: ContextSize | ContextSize[];
  /**
   * Context retention policy applied after editing.
   * Specify how many tool results to preserve using messages, tokens, or fraction.
   *
   * @example
   * ```ts
   * // Keep 3 most recent tool results
   * keep: { messages: 3 }
   *
   * // Keep tool results that fit within 1000 tokens
   * keep: { tokens: 1000 }
   *
   * // Keep tool results that fit within 30% of model's max input tokens
   * keep: { fraction: 0.3 }
   * ```
   */
  keep?: KeepSize;
  /**
   * Whether to clear the originating tool call parameters on the AI message.
   * @default false
   */
  clearToolInputs?: boolean;
  /**
   * List of tool names to exclude from clearing.
   * @default []
   */
  excludeTools?: string[];
  /**
   * Placeholder text inserted for cleared tool outputs.
   * @default "[cleared]"
   */
  placeholder?: string;
  /**
   * @deprecated Use `trigger: { tokens: value }` instead.
   */
  triggerTokens?: number;
  /**
   * @deprecated Use `keep: { messages: value }` instead.
   */
  keepMessages?: number;
  /**
   * @deprecated This property is deprecated and will be removed in a future version.
   * Use `keep: { tokens: value }` or `keep: { messages: value }` instead to control retention.
   */
  clearAtLeast?: number;
}
/**
 * Strategy for clearing tool outputs when token limits are exceeded.
 *
 * This strategy mirrors Anthropic's `clear_tool_uses_20250919` behavior by
 * replacing older tool results with a placeholder text when the conversation
 * grows too large. It preserves the most recent tool results and can exclude
 * specific tools from being cleared.
 *
 * @example
 * ```ts
 * import { ClearToolUsesEdit } from "langchain";
 *
 * const edit = new ClearToolUsesEdit({
 *   trigger: { tokens: 100000 },  // Start clearing at 100K tokens
 *   keep: { messages: 3 },        // Keep 3 most recent tool results
 *   excludeTools: ["important"],   // Never clear "important" tool
 *   clearToolInputs: false,        // Keep tool call arguments
 *   placeholder: "[cleared]",      // Replacement text
 * });
 *
 * // Multiple trigger conditions
 * const edit2 = new ClearToolUsesEdit({
 *   trigger: [
 *     { tokens: 100000, messages: 50 },
 *     { tokens: 50000, messages: 100 }
 *   ],
 *   keep: { messages: 3 },
 * });
 *
 * // Fractional trigger with model profile
 * const edit3 = new ClearToolUsesEdit({
 *   trigger: { fraction: 0.8 },  // Trigger at 80% of model's max tokens
 *   keep: { fraction: 0.3 },     // Keep 30% of model's max tokens
 * });
 * ```
 */
declare class ClearToolUsesEdit implements ContextEdit {
  #private;
  trigger: ContextSize | ContextSize[];
  keep: KeepSize;
  clearToolInputs: boolean;
  excludeTools: Set<string>;
  placeholder: string;
  model: BaseLanguageModel;
  clearAtLeast: number;
  constructor(config?: ClearToolUsesEditConfig);
  apply(params: {
    messages: BaseMessage[];
    model: BaseLanguageModel;
    countTokens: TokenCounter;
  }): Promise<void>;
}
/**
 * Configuration for the Context Editing Middleware.
 */
interface ContextEditingMiddlewareConfig {
  /**
   * Sequence of edit strategies to apply. Defaults to a single
   * ClearToolUsesEdit mirroring Anthropic defaults.
   */
  edits?: ContextEdit[];
  /**
   * Whether to use approximate token counting (faster, less accurate)
   * or exact counting implemented by the chat model (potentially slower, more accurate).
   * Currently only OpenAI models support exact counting.
   * @default "approx"
   */
  tokenCountMethod?: "approx" | "model";
}
/**
 * Middleware that automatically prunes tool results to manage context size.
 *
 * This middleware applies a sequence of edits when the total input token count
 * exceeds configured thresholds. By default, it uses the `ClearToolUsesEdit` strategy
 * which mirrors Anthropic's `clear_tool_uses_20250919` behaviour by clearing older
 * tool results once the conversation exceeds 100,000 tokens.
 *
 * ## Basic Usage
 *
 * Use the middleware with default settings to automatically manage context:
 *
 * @example Basic usage with defaults
 * ```ts
 * import { contextEditingMiddleware } from "langchain";
 * import { createAgent } from "langchain";
 *
 * const agent = createAgent({
 *   model: "anthropic:claude-sonnet-4-5",
 *   tools: [searchTool, calculatorTool],
 *   middleware: [
 *     contextEditingMiddleware(),
 *   ],
 * });
 * ```
 *
 * The default configuration:
 * - Triggers when context exceeds **100,000 tokens**
 * - Keeps the **3 most recent** tool results
 * - Uses **approximate token counting** (fast)
 * - Does not clear tool call arguments
 *
 * ## Custom Configuration
 *
 * Customize the clearing behavior with `ClearToolUsesEdit`:
 *
 * @example Custom ClearToolUsesEdit configuration
 * ```ts
 * import { contextEditingMiddleware, ClearToolUsesEdit } from "langchain";
 *
 * // Single condition: trigger if tokens >= 50000 AND messages >= 20
 * const agent1 = createAgent({
 *   model: "anthropic:claude-sonnet-4-5",
 *   tools: [searchTool, calculatorTool],
 *   middleware: [
 *     contextEditingMiddleware({
 *       edits: [
 *         new ClearToolUsesEdit({
 *           trigger: { tokens: 50000, messages: 20 },
 *           keep: { messages: 5 },
 *           excludeTools: ["search"],
 *           clearToolInputs: true,
 *         }),
 *       ],
 *       tokenCountMethod: "approx",
 *     }),
 *   ],
 * });
 *
 * // Multiple conditions: trigger if (tokens >= 50000 AND messages >= 20) OR (tokens >= 30000 AND messages >= 50)
 * const agent2 = createAgent({
 *   model: "anthropic:claude-sonnet-4-5",
 *   tools: [searchTool, calculatorTool],
 *   middleware: [
 *     contextEditingMiddleware({
 *       edits: [
 *         new ClearToolUsesEdit({
 *           trigger: [
 *             { tokens: 50000, messages: 20 },
 *             { tokens: 30000, messages: 50 },
 *           ],
 *           keep: { messages: 5 },
 *         }),
 *       ],
 *     }),
 *   ],
 * });
 *
 * // Fractional trigger with model profile
 * const agent3 = createAgent({
 *   model: chatModel,
 *   tools: [searchTool, calculatorTool],
 *   middleware: [
 *     contextEditingMiddleware({
 *       edits: [
 *         new ClearToolUsesEdit({
 *           trigger: { fraction: 0.8 },  // Trigger at 80% of model's max tokens
 *           keep: { fraction: 0.3 },     // Keep 30% of model's max tokens
 *           model: chatModel,
 *         }),
 *       ],
 *     }),
 *   ],
 * });
 * ```
 *
 * ## Custom Editing Strategies
 *
 * Implement your own context editing strategy by creating a class that
 * implements the `ContextEdit` interface:
 *
 * @example Custom editing strategy
 * ```ts
 * import { contextEditingMiddleware, type ContextEdit, type TokenCounter } from "langchain";
 * import type { BaseMessage } from "@langchain/core/messages";
 *
 * class CustomEdit implements ContextEdit {
 *   async apply(params: {
 *     tokens: number;
 *     messages: BaseMessage[];
 *     countTokens: TokenCounter;
 *   }): Promise<number> {
 *     // Implement your custom editing logic here
 *     // and apply it to the messages array, then
 *     // return the new token count after edits
 *     return countTokens(messages);
 *   }
 * }
 * ```
 *
 * @param config - Configuration options for the middleware
 * @returns A middleware instance that can be used with `createAgent`
 */
declare function contextEditingMiddleware(config?: ContextEditingMiddlewareConfig): AgentMiddleware<undefined, undefined, unknown, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { ClearToolUsesEdit, ClearToolUsesEditConfig, ContextEdit, ContextEditingMiddlewareConfig, contextEditingMiddleware };
//# sourceMappingURL=contextEditing.d.ts.map