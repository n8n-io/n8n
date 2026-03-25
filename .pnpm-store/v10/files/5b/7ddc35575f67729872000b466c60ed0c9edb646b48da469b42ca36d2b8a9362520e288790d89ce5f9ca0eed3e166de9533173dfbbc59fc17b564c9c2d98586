import { SPAN_STATUS_ERROR } from '../../tracing/spanstatus.js';
import { MCP_PROTOCOL_VERSION_ATTRIBUTE } from './attributes.js';
import { extractToolResultAttributes, extractPromptResultAttributes } from './resultExtraction.js';
import { extractSessionDataFromInitializeResponse, buildServerAttributesFromInfo } from './sessionExtraction.js';

/**
 * Request-span correlation system for MCP server instrumentation
 *
 * Handles mapping requestId to span data for correlation with handler execution.
 * Uses WeakMap to scope correlation maps per transport instance, preventing
 * request ID collisions between different MCP sessions.
 */


/**
 * Transport-scoped correlation system that prevents collisions between different MCP sessions
 * @internal Each transport instance gets its own correlation map, eliminating request ID conflicts
 */
const transportToSpanMap = new WeakMap();

/**
 * Gets or creates the span map for a specific transport instance
 * @internal
 * @param transport - MCP transport instance
 * @returns Span map for the transport
 */
function getOrCreateSpanMap(transport) {
  let spanMap = transportToSpanMap.get(transport);
  if (!spanMap) {
    spanMap = new Map();
    transportToSpanMap.set(transport, spanMap);
  }
  return spanMap;
}

/**
 * Stores span context for later correlation with handler execution
 * @param transport - MCP transport instance
 * @param requestId - Request identifier
 * @param span - Active span to correlate
 * @param method - MCP method name
 */
function storeSpanForRequest(transport, requestId, span, method) {
  const spanMap = getOrCreateSpanMap(transport);
  spanMap.set(requestId, {
    span,
    method,
    // eslint-disable-next-line @sentry-internal/sdk/no-unsafe-random-apis
    startTime: Date.now(),
  });
}

/**
 * Completes span with results and cleans up correlation
 * @param transport - MCP transport instance
 * @param requestId - Request identifier
 * @param result - Execution result for attribute extraction
 * @param options - Resolved MCP options
 */
function completeSpanWithResults(
  transport,
  requestId,
  result,
  options,
) {
  const spanMap = getOrCreateSpanMap(transport);
  const spanData = spanMap.get(requestId);
  if (spanData) {
    const { span, method } = spanData;

    if (method === 'initialize') {
      const sessionData = extractSessionDataFromInitializeResponse(result);
      const serverAttributes = buildServerAttributesFromInfo(sessionData.serverInfo);

      const initAttributes = {
        ...serverAttributes,
      };
      if (sessionData.protocolVersion) {
        initAttributes[MCP_PROTOCOL_VERSION_ATTRIBUTE] = sessionData.protocolVersion;
      }

      span.setAttributes(initAttributes);
    } else if (method === 'tools/call') {
      const toolAttributes = extractToolResultAttributes(result, options.recordOutputs);
      span.setAttributes(toolAttributes);
    } else if (method === 'prompts/get') {
      const promptAttributes = extractPromptResultAttributes(result, options.recordOutputs);
      span.setAttributes(promptAttributes);
    }

    span.end();
    spanMap.delete(requestId);
  }
}

/**
 * Cleans up pending spans for a specific transport (when that transport closes)
 * @param transport - MCP transport instance
 */
function cleanupPendingSpansForTransport(transport) {
  const spanMap = transportToSpanMap.get(transport);
  if (spanMap) {
    for (const [, spanData] of spanMap) {
      spanData.span.setStatus({
        code: SPAN_STATUS_ERROR,
        message: 'cancelled',
      });
      spanData.span.end();
    }
    spanMap.clear();
  }
}

export { cleanupPendingSpansForTransport, completeSpanWithResults, storeSpanForRequest };
//# sourceMappingURL=correlation.js.map
