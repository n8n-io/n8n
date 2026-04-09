Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const spanstatus = require('../../tracing/spanstatus.js');
const attributes = require('./attributes.js');
const resultExtraction = require('./resultExtraction.js');
const sessionExtraction = require('./sessionExtraction.js');

/**
 * Request-span correlation system for MCP server instrumentation
 *
 * Handles mapping requestId to span data for correlation with handler execution.
 *
 * Uses sessionId as the primary key for stateful transports. This handles the wrapper
 * transport pattern (e.g., NodeStreamableHTTPServerTransport wrapping WebStandardStreamableHTTPServerTransport)
 * where onmessage and send may receive different `this` values but share the same sessionId.
 *
 * Falls back to WeakMap by transport instance for stateless transports (no sessionId).
 */


/**
 * Session-scoped correlation for stateful transports (with sessionId)
 * @internal Using sessionId as key handles wrapper transport patterns where
 * different transport objects share the same logical session
 */
const sessionToSpanMap = new Map();

/**
 * Transport-scoped correlation fallback for stateless transports (no sessionId)
 * @internal WeakMap allows automatic cleanup when transport is garbage collected
 */
const statelessSpanMap = new WeakMap();

/**
 * Gets or creates the span map for a transport, using sessionId when available
 * @internal
 * @param transport - MCP transport instance
 * @returns Span map for the transport/session
 */
function getOrCreateSpanMap(transport) {
  const sessionId = transport.sessionId;

  if (sessionId) {
    // Stateful transport - use sessionId as key (handles wrapper pattern)
    let spanMap = sessionToSpanMap.get(sessionId);
    if (!spanMap) {
      spanMap = new Map();
      sessionToSpanMap.set(sessionId, spanMap);
    }
    return spanMap;
  }

  // Stateless fallback - use transport instance as key
  let spanMap = statelessSpanMap.get(transport);
  if (!spanMap) {
    spanMap = new Map();
    statelessSpanMap.set(transport, spanMap);
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
    // oxlint-disable-next-line sdk/no-unsafe-random-apis
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
      const sessionData = sessionExtraction.extractSessionDataFromInitializeResponse(result);
      const serverAttributes = sessionExtraction.buildServerAttributesFromInfo(sessionData.serverInfo);

      const initAttributes = {
        ...serverAttributes,
      };
      if (sessionData.protocolVersion) {
        initAttributes[attributes.MCP_PROTOCOL_VERSION_ATTRIBUTE] = sessionData.protocolVersion;
      }

      span.setAttributes(initAttributes);
    } else if (method === 'tools/call') {
      const toolAttributes = resultExtraction.extractToolResultAttributes(result, options.recordOutputs);
      span.setAttributes(toolAttributes);
    } else if (method === 'prompts/get') {
      const promptAttributes = resultExtraction.extractPromptResultAttributes(result, options.recordOutputs);
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
  const sessionId = transport.sessionId;

  // Try sessionId-based cleanup first (for stateful transports)
  if (sessionId) {
    const spanMap = sessionToSpanMap.get(sessionId);
    if (spanMap) {
      for (const [, spanData] of spanMap) {
        spanData.span.setStatus({
          code: spanstatus.SPAN_STATUS_ERROR,
          message: 'cancelled',
        });
        spanData.span.end();
      }
      sessionToSpanMap.delete(sessionId);
    }
    return;
  }

  // Fallback to transport-based cleanup (for stateless transports)
  const spanMap = statelessSpanMap.get(transport);
  if (spanMap) {
    for (const [, spanData] of spanMap) {
      spanData.span.setStatus({
        code: spanstatus.SPAN_STATUS_ERROR,
        message: 'cancelled',
      });
      spanData.span.end();
    }
    spanMap.clear();
    // Note: WeakMap entries are automatically cleaned up when transport is GC'd
  }
}

exports.cleanupPendingSpansForTransport = cleanupPendingSpansForTransport;
exports.completeSpanWithResults = completeSpanWithResults;
exports.storeSpanForRequest = storeSpanForRequest;
//# sourceMappingURL=correlation.js.map
