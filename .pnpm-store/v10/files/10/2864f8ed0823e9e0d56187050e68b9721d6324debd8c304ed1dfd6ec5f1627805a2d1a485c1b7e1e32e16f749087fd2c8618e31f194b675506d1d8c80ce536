import { Span } from '../../types-hoist/span';
import { AnthropicAiInstrumentedMethod, AnthropicAiResponse } from './types';
/**
 * Check if a method path should be instrumented
 */
export declare function shouldInstrument(methodPath: string): methodPath is AnthropicAiInstrumentedMethod;
/**
 * Set the messages and messages original length attributes.
 */
export declare function setMessagesAttribute(span: Span, messages: unknown): void;
/**
 * Capture error information from the response
 * @see https://docs.anthropic.com/en/api/errors#error-shapes
 */
export declare function handleResponseError(span: Span, response: AnthropicAiResponse): void;
/**
 * Include the system prompt in the messages list, if available
 */
export declare function messagesFromParams(params: Record<string, unknown>): unknown[];
//# sourceMappingURL=utils.d.ts.map
