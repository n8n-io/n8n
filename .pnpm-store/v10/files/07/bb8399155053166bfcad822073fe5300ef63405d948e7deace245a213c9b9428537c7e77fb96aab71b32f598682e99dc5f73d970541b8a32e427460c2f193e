import { Span } from '../../types-hoist/span';
export interface AIRecordingOptions {
    recordInputs?: boolean;
    recordOutputs?: boolean;
}
/**
 * Resolves AI recording options by falling back to the client's `sendDefaultPii` setting.
 * Precedence: explicit option > sendDefaultPii > false
 */
export declare function resolveAIRecordingOptions<T extends AIRecordingOptions>(options?: T): T & Required<AIRecordingOptions>;
/**
 * Maps AI method paths to OpenTelemetry semantic convention operation names
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/gen-ai-spans/#llm-request-spans
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
/**
 * Extract system instructions from messages array.
 * Finds the first system message and formats it according to OpenTelemetry semantic conventions.
 *
 * @param messages - Array of messages to extract system instructions from
 * @returns systemInstructions (JSON string) and filteredMessages (without system message)
 */
export declare function extractSystemInstructions(messages: unknown[] | unknown): {
    systemInstructions: string | undefined;
    filteredMessages: unknown[] | unknown;
};
/**
 * Wraps a promise-like object to preserve additional methods (like .withResponse())
 * that AI SDK clients (OpenAI, Anthropic) attach to their APIPromise return values.
 *
 * Standard Promise methods (.then, .catch, .finally) are routed to the instrumented
 * promise to preserve Sentry's span instrumentation, while custom SDK methods are
 * forwarded to the original promise to maintain the SDK's API surface.
 */
export declare function wrapPromiseWithMethods<R>(originalPromiseLike: Promise<R>, instrumentedPromise: Promise<R>, mechanismType: string): Promise<R>;
//# sourceMappingURL=utils.d.ts.map
