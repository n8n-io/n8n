import { Span } from '../../types-hoist/span';
import { LangChainMessage } from '../langchain/types';
import { CompiledGraph } from './types';
/**
 * Extract tool calls from messages
 */
export declare function extractToolCalls(messages: Array<Record<string, unknown>> | null): unknown[] | null;
/**
 * Extract token usage from a message's usage_metadata or response_metadata
 * Returns token counts without setting span attributes
 */
export declare function extractTokenUsageFromMessage(message: LangChainMessage): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
};
/**
 * Extract model and finish reason from a message's response_metadata
 */
export declare function extractModelMetadata(span: Span, message: LangChainMessage): void;
/**
 * Extract tools from compiled graph structure
 *
 * Tools are stored in: compiledGraph.builder.nodes.tools.runnable.tools
 */
export declare function extractToolsFromCompiledGraph(compiledGraph: CompiledGraph): unknown[] | null;
/**
 * Set response attributes on the span
 */
export declare function setResponseAttributes(span: Span, inputMessages: LangChainMessage[] | null, result: unknown): void;
//# sourceMappingURL=utils.d.ts.map
