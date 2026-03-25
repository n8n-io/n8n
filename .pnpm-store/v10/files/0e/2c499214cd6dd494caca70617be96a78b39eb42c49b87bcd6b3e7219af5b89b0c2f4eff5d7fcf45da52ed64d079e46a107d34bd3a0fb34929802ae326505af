import type { TraceContext } from '../../types-hoist/context';
import type { Span, SpanAttributes, SpanJSON } from '../../types-hoist/span';
import type { TokenSummary } from './types';
/**
 * Accumulates token data from a span to its parent in the token accumulator map.
 * This function extracts token usage from the current span and adds it to the
 * accumulated totals for its parent span.
 */
export declare function accumulateTokensForParent(span: SpanJSON, tokenAccumulator: Map<string, TokenSummary>): void;
/**
 * Applies accumulated token data to the `gen_ai.invoke_agent` span.
 * Only immediate children of the `gen_ai.invoke_agent` span are considered,
 * since aggregation will automatically occur for each parent span.
 */
export declare function applyAccumulatedTokens(spanOrTrace: SpanJSON | TraceContext, tokenAccumulator: Map<string, TokenSummary>): void;
/**
 * Get the span associated with a tool call ID
 */
export declare function _INTERNAL_getSpanForToolCallId(toolCallId: string): Span | undefined;
/**
 * Clean up the span mapping for a tool call ID
 */
export declare function _INTERNAL_cleanupToolCallSpan(toolCallId: string): void;
/**
 * Convert an array of tool strings to a JSON string
 */
export declare function convertAvailableToolsToJsonString(tools: unknown[]): string;
/**
 * Convert the prompt string to messages array
 */
export declare function convertPromptToMessages(prompt: string): {
    role: string;
    content: string;
}[];
/**
 * Generate a request.messages JSON array from the prompt field in the
 * invoke_agent op
 */
export declare function requestMessagesFromPrompt(span: Span, attributes: SpanAttributes): void;
/**
 * Maps a Vercel AI span name to the corresponding Sentry op.
 */
export declare function getSpanOpFromName(name: string): string | undefined;
//# sourceMappingURL=utils.d.ts.map