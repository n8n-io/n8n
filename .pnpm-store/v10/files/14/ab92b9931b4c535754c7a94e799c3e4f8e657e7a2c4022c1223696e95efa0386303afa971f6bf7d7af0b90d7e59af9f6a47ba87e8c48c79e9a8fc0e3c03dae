import { AgentMiddleware } from "./types.js";
import * as _langchain_core_tools0 from "@langchain/core/tools";
import { InferInteropZodInput } from "@langchain/core/utils/types";
import { z } from "zod/v3";

//#region src/agents/middleware/pii.d.ts
/**
 * Represents a detected PII match in content
 */
interface PIIMatch {
  /**
   * The matched text
   */
  text: string;
  /**
   * The start index of the match
   */
  start: number;
  /**
   * The end index of the match
   */
  end: number;
}
/**
 * Error thrown when PII is detected and strategy is 'block'
 */
declare class PIIDetectionError extends Error {
  readonly piiType: string;
  readonly matches: PIIMatch[];
  constructor(piiType: string, matches: PIIMatch[]);
}
/**
 * Strategy for handling detected PII
 */
type PIIStrategy = "block" | "redact" | "mask" | "hash";
/**
 * Built-in PII types
 */
type BuiltInPIIType = "email" | "credit_card" | "ip" | "mac_address" | "url";
/**
 * Custom detector function that takes content and returns matches
 */
type PIIDetector = (content: string) => PIIMatch[];
type Detector = PIIDetector | RegExp | string;
/**
 * Configuration for a redaction rule
 */
interface RedactionRuleConfig {
  /**
   * Type of PII to detect (built-in or custom name)
   */
  piiType: BuiltInPIIType | string;
  /**
   * Strategy for handling detected PII
   */
  strategy: PIIStrategy;
  /**
   * Custom detector function or regex pattern string
   */
  detector?: Detector;
}
/**
 * Resolved redaction rule with a concrete detector function
 */
interface ResolvedRedactionRule {
  piiType: string;
  strategy: PIIStrategy;
  detector: PIIDetector;
}
/**
 * Detect email addresses in content
 */
declare function detectEmail(content: string): PIIMatch[];
/**
 * Detect credit card numbers in content (validated with Luhn algorithm)
 */
declare function detectCreditCard(content: string): PIIMatch[];
/**
 * Detect IP addresses in content (validated)
 */
declare function detectIP(content: string): PIIMatch[];
/**
 * Detect MAC addresses in content
 */
declare function detectMacAddress(content: string): PIIMatch[];
/**
 * Detect URLs in content
 */
declare function detectUrl(content: string): PIIMatch[];
/**
 * Resolve a redaction rule to a concrete detector function
 */
declare function resolveRedactionRule(config: RedactionRuleConfig): ResolvedRedactionRule;
/**
 * Apply strategy to content based on matches
 */
declare function applyStrategy(content: string, matches: PIIMatch[], strategy: PIIStrategy, piiType: string): string;
/**
 * Configuration schema for PII middleware
 */
declare const contextSchema: z.ZodObject<{
  /**
   * Whether to check user messages before model call
   */
  applyToInput: z.ZodOptional<z.ZodBoolean>;
  /**
   * Whether to check AI messages after model call
   */
  applyToOutput: z.ZodOptional<z.ZodBoolean>;
  /**
   * Whether to check tool result messages after tool execution
   */
  applyToToolResults: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
  applyToInput?: boolean | undefined;
  applyToOutput?: boolean | undefined;
  applyToToolResults?: boolean | undefined;
}, {
  applyToInput?: boolean | undefined;
  applyToOutput?: boolean | undefined;
  applyToToolResults?: boolean | undefined;
}>;
type PIIMiddlewareConfig = InferInteropZodInput<typeof contextSchema>;
/**
 * Creates a middleware that detects and handles personally identifiable information (PII)
 * in conversations.
 *
 * This middleware detects common PII types and applies configurable strategies to handle them.
 * It can detect emails, credit cards, IP addresses, MAC addresses, and URLs in both user input
 * and agent output.
 *
 * Built-in PII types:
 * - `email`: Email addresses
 * - `credit_card`: Credit card numbers (validated with Luhn algorithm)
 * - `ip`: IP addresses (validated)
 * - `mac_address`: MAC addresses
 * - `url`: URLs (both `http`/`https` and bare URLs)
 *
 * Strategies:
 * - `block`: Raise an exception when PII is detected
 * - `redact`: Replace PII with `[REDACTED_TYPE]` placeholders
 * - `mask`: Partially mask PII (e.g., `****-****-****-1234` for credit card)
 * - `hash`: Replace PII with deterministic hash (e.g., `<email_hash:a1b2c3d4>`)
 *
 * Strategy Selection Guide:
 * | Strategy | Preserves Identity? | Best For                                |
 * | -------- | ------------------- | --------------------------------------- |
 * | `block`  | N/A                 | Avoid PII completely                    |
 * | `redact` | No                  | General compliance, log sanitization    |
 * | `mask`   | No                  | Human readability, customer service UIs |
 * | `hash`   | Yes (pseudonymous)  | Analytics, debugging                    |
 *
 * @param piiType - Type of PII to detect. Can be a built-in type (`email`, `credit_card`, `ip`, `mac_address`, `url`) or a custom type name.
 * @param options - Configuration options
 * @param options.strategy - How to handle detected PII. Defaults to `"redact"`.
 * @param options.detector - Custom detector function or regex pattern string. If not provided, uses built-in detector for the `piiType`.
 * @param options.applyToInput - Whether to check user messages before model call. Defaults to `true`.
 * @param options.applyToOutput - Whether to check AI messages after model call. Defaults to `false`.
 * @param options.applyToToolResults - Whether to check tool result messages after tool execution. Defaults to `false`.
 *
 * @returns Middleware instance for use with `createAgent`
 *
 * @throws {PIIDetectionError} When PII is detected and strategy is `'block'`
 * @throws {Error} If `piiType` is not built-in and no detector is provided
 *
 * @example Basic usage
 * ```typescript
 * import { piiMiddleware } from "langchain";
 * import { createAgent } from "langchain";
 *
 * // Redact all emails in user input
 * const agent = createAgent({
 *   model: "openai:gpt-4",
 *   middleware: [
 *     piiMiddleware("email", { strategy: "redact" }),
 *   ],
 * });
 * ```
 *
 * @example Different strategies for different PII types
 * ```typescript
 * const agent = createAgent({
 *   model: "openai:gpt-4o",
 *   middleware: [
 *     piiMiddleware("credit_card", { strategy: "mask" }),
 *     piiMiddleware("url", { strategy: "redact" }),
 *     piiMiddleware("ip", { strategy: "hash" }),
 *   ],
 * });
 * ```
 *
 * @example Custom PII type with regex
 * ```typescript
 * const agent = createAgent({
 *   model: "openai:gpt-4",
 *   middleware: [
 *     piiMiddleware("api_key", {
 *       detector: "sk-[a-zA-Z0-9]{32}",
 *       strategy: "block",
 *     }),
 *   ],
 * });
 * ```
 *
 * @public
 */
declare function piiMiddleware(piiType: BuiltInPIIType | string, options?: {
  strategy?: PIIStrategy;
  detector?: Detector;
  applyToInput?: boolean;
  applyToOutput?: boolean;
  applyToToolResults?: boolean;
}): AgentMiddleware<undefined, z.ZodObject<{
  /**
   * Whether to check user messages before model call
   */
  applyToInput: z.ZodOptional<z.ZodBoolean>;
  /**
   * Whether to check AI messages after model call
   */
  applyToOutput: z.ZodOptional<z.ZodBoolean>;
  /**
   * Whether to check tool result messages after tool execution
   */
  applyToToolResults: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
  applyToInput?: boolean | undefined;
  applyToOutput?: boolean | undefined;
  applyToToolResults?: boolean | undefined;
}, {
  applyToInput?: boolean | undefined;
  applyToOutput?: boolean | undefined;
  applyToToolResults?: boolean | undefined;
}>, {
  applyToInput?: boolean | undefined;
  applyToOutput?: boolean | undefined;
  applyToToolResults?: boolean | undefined;
}, readonly (_langchain_core_tools0.ServerTool | _langchain_core_tools0.ClientTool)[]>;
//#endregion
export { BuiltInPIIType, PIIDetectionError, PIIDetector, PIIMatch, PIIMiddlewareConfig, PIIStrategy, RedactionRuleConfig, ResolvedRedactionRule, applyStrategy, detectCreditCard, detectEmail, detectIP, detectMacAddress, detectUrl, piiMiddleware, resolveRedactionRule };
//# sourceMappingURL=pii.d.ts.map