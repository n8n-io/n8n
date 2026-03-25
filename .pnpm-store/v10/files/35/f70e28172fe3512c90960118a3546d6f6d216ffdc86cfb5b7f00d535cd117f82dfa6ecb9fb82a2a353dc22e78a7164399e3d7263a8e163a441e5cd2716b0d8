import { type WrapClaudeAgentSDKConfig } from "./context.js";
/**
 * Wraps the Claude Agent SDK with LangSmith tracing. This returns wrapped versions
 * of query and tool that automatically trace all agent interactions.
 *
 * @param sdk - The Claude Agent SDK module
 * @param config - Optional LangSmith configuration
 * @returns Object with wrapped query, tool, and createSdkMcpServer functions
 *
 * @example
 * ```typescript
 * import * as claudeSDK from "@anthropic-ai/claude-agent-sdk";
 * import { wrapClaudeAgentSDK } from "langsmith/experimental/claude_agent_sdk";
 *
 * // Wrap once - returns { query, tool, createSdkMcpServer } with tracing built-in
 * const { query, tool, createSdkMcpServer } = wrapClaudeAgentSDK(claudeSDK);
 *
 * // Use normally - tracing is automatic
 * for await (const message of query({
 *   prompt: "Hello, Claude!",
 *   options: { model: "claude-haiku-4-5-20251001" }
 * })) {
 *   console.log(message);
 * }
 *
 * // Tools created with wrapped tool() are automatically traced
 * const calculator = tool("calculator", "Does math", schema, handler);
 * ```
 */
export declare function wrapClaudeAgentSDK<T extends object>(sdk: T, config?: WrapClaudeAgentSDKConfig): T;
