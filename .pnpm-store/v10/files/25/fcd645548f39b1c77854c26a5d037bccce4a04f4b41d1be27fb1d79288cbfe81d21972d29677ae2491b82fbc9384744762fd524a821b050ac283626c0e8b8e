/**
 * Shared utils for AI integrations (OpenAI, Anthropic, Verce.AI, etc.)
 */
import type { Span } from '../../types-hoist/span';
/**
 * Maps AI method paths to Sentry operation name
 */
export declare function getFinalOperationName(methodPath: string): string;
/**
 * Get the span operation for AI methods
 * Following Sentry's convention: "gen_ai.{operation_name}"
 */
export declare function getSpanOperation(methodPath: string): string;
/**
 * Build method path from current traversal
 */
export declare function buildMethodPath(currentPath: string, prop: string): string;
/**
 * Set token usage attributes
 * @param span - The span to add attributes to
 * @param promptTokens - The number of prompt tokens
 * @param completionTokens - The number of completion tokens
 * @param cachedInputTokens - The number of cached input tokens
 * @param cachedOutputTokens - The number of cached output tokens
 */
export declare function setTokenUsageAttributes(span: Span, promptTokens?: number, completionTokens?: number, cachedInputTokens?: number, cachedOutputTokens?: number): void;
/**
 * Get the truncated JSON string for a string or array of strings.
 *
 * @param value - The string or array of strings to truncate
 * @returns The truncated JSON string
 */
export declare function getTruncatedJsonString<T>(value: T | T[]): string;
//# sourceMappingURL=utils.d.ts.map