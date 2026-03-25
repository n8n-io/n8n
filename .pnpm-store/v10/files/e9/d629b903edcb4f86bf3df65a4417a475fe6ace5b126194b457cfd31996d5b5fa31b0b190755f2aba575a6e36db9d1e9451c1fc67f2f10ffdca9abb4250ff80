import { AgentMiddleware } from "./types.js";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/piiRedaction.d.ts
/**
 * Configuration schema for the Input Guardrails middleware
 */
declare const contextSchema: z.ZodObject<{
  /**
   * A record of PII detection rules to apply
   * @default DEFAULT_PII_RULES (with enabled rules only)
   */
  rules: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<RegExp, z.ZodTypeDef, RegExp>>>;
}, "strip", z.ZodTypeAny, {
  rules?: Record<string, RegExp> | undefined;
}, {
  rules?: Record<string, RegExp> | undefined;
}>;
/**
 * @deprecated
 */
type PIIRedactionMiddlewareConfig = InferInteropZodInput<typeof contextSchema>;
/**
 * Creates a middleware that detects and redacts personally identifiable information (PII)
 * from messages before they are sent to model providers, and restores original values
 * in model responses for tool execution.
 *
 * ## Mechanism
 *
 * The middleware intercepts agent execution at two points:
 *
 * ### Request Phase (`wrapModelCall`)
 * - Applies regex-based pattern matching to all message content (HumanMessage, ToolMessage, SystemMessage, AIMessage)
 * - Processes both message text and AIMessage tool call arguments
 * - Each matched pattern generates:
 *   - Unique identifier: `generateRedactionId()` → `"abc123"`
 *   - Redaction marker: `[REDACTED_{RULE_NAME}_{ID}]` → `"[REDACTED_SSN_abc123]"`
 *   - Redaction map entry: `{ "abc123": "123-45-6789" }`
 * - Returns modified request with redacted message content
 *
 * ### Response Phase (`afterModel`)
 * - Scans AIMessage responses for redaction markers matching pattern: `/\[REDACTED_[A-Z_]+_(\w+)\]/g`
 * - Replaces markers with original values from redaction map
 * - Handles both standard responses and structured output (via tool calls or JSON content)
 * - For structured output, restores values in both the tool call arguments and the `structuredResponse` state field
 * - Returns new message instances via RemoveMessage/AIMessage to update state
 *
 * ## Data Flow
 *
 * ```
 * User Input: "My SSN is 123-45-6789"
 *     ↓ [beforeModel]
 * Model Request: "My SSN is [REDACTED_SSN_abc123]"
 *     ↓ [model invocation]
 * Model Response: tool_call({ "ssn": "[REDACTED_SSN_abc123]" })
 *     ↓ [afterModel]
 * Tool Execution: tool({ "ssn": "123-45-6789" })
 * ```
 *
 * ## Limitations
 *
 * This middleware provides model provider isolation only. PII may still be present in:
 * - LangGraph state checkpoints (memory, databases)
 * - Network traffic between client and application server
 * - Application logs and trace data
 * - Tool execution arguments and responses
 * - Final agent output
 *
 * For comprehensive PII protection, implement additional controls at the application,
 * network, and storage layers.
 *
 * @param options - Configuration options
 * @param options.rules - Record of detection rules mapping rule names to regex patterns.
 *   Rule names are normalized to uppercase and used in redaction markers.
 *   Patterns must use the global flag (`/pattern/g`) to match all occurrences.
 *
 * @returns Middleware instance for use with `createAgent`
 *
 * @example Basic usage with custom rules
 * ```typescript
 * import { piiRedactionMiddleware } from "langchain";
 * import { createAgent } from "langchain";
 * import { tool } from "@langchain/core/tools";
 * import { z } from "zod/v3";
 *
 * const PII_RULES = {
 *   ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
 *   email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
 *   phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
 * };
 *
 * const lookupUser = tool(async ({ ssn }) => {
 *   // Receives original value: "123-45-6789"
 *   return { name: "John Doe", account: "active" };
 * }, {
 *   name: "lookup_user",
 *   description: "Look up user by SSN",
 *   schema: z.object({ ssn: z.string() })
 * });
 *
 * const agent = createAgent({
 *   model: new ChatOpenAI({ model: "gpt-4" }),
 *   tools: [lookupUser],
 *   middleware: [piiRedactionMiddleware({ rules: PII_RULES })]
 * });
 *
 * const result = await agent.invoke({
 *   messages: [new HumanMessage("Look up SSN 123-45-6789")]
 * });
 * // Model request: "Look up SSN [REDACTED_SSN_abc123]"
 * // Model response: tool_call({ "ssn": "[REDACTED_SSN_abc123]" })
 * // Tool receives: { "ssn": "123-45-6789" }
 * ```
 *
 * @example Runtime rule configuration via context
 * ```typescript
 * const agent = createAgent({
 *   model: new ChatOpenAI({ model: "gpt-4" }),
 *   tools: [someTool],
 *   middleware: [piiRedactionMiddleware()]
 * });
 *
 * // Configure rules at runtime via middleware context
 * const result = await agent.invoke(
 *   { messages: [new HumanMessage("...")] },
 *   {
 *     configurable: {
 *       PIIRedactionMiddleware: {
 *         rules: {
 *           ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
 *           email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
 *         }
 *       }
 *     }
 *   }
 * );
 * ```
 *
 * @example Custom rule patterns
 * ```typescript
 * const customRules = {
 *   employee_id: /EMP-\d{6}/g,
 *   api_key: /sk-[a-zA-Z0-9]{32}/g,
 *   credit_card: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
 * };
 *
 * const middleware = piiRedactionMiddleware({ rules: customRules });
 * // Generates markers like: [REDACTED_EMPLOYEE_ID_xyz789]
 * ```
 *
 * @deprecated
 */
declare function piiRedactionMiddleware(options?: PIIRedactionMiddlewareConfig): AgentMiddleware<undefined, z.ZodObject<{
  /**
   * A record of PII detection rules to apply
   * @default DEFAULT_PII_RULES (with enabled rules only)
   */
  rules: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodType<RegExp, z.ZodTypeDef, RegExp>>>;
}, "strip", z.ZodTypeAny, {
  rules?: Record<string, RegExp> | undefined;
}, {
  rules?: Record<string, RegExp> | undefined;
}>, {
  rules?: Record<string, RegExp> | undefined;
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { PIIRedactionMiddlewareConfig, piiRedactionMiddleware };
//# sourceMappingURL=piiRedaction.d.ts.map