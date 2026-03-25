import { getIsolationScope, withIsolationScope } from '../../currentScopes.js';
import { fill } from '../../utils/object.js';
import { startInactiveSpan, withActiveSpan } from '../../tracing/trace.js';
import { MCP_PROTOCOL_VERSION_ATTRIBUTE } from './attributes.js';
import { storeSpanForRequest, completeSpanWithResults, cleanupPendingSpansForTransport } from './correlation.js';
import { captureError } from './errorCapture.js';
import { extractSessionDataFromInitializeRequest, buildClientAttributesFromInfo, extractSessionDataFromInitializeResponse } from './sessionExtraction.js';
import { storeSessionDataForTransport, updateSessionDataForTransport, cleanupSessionDataForTransport } from './sessionManagement.js';
import { buildMcpServerSpanConfig, createMcpNotificationSpan, createMcpOutgoingNotificationSpan } from './spans.js';
import { isJsonRpcRequest, isJsonRpcNotification, isJsonRpcResponse, isValidContentItem } from './validation.js';

/**
 * Transport layer instrumentation for MCP server
 *
 * Handles message interception and response correlation.
 * @see https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
 */


/**
 * Wraps transport.onmessage to create spans for incoming messages.
 * For "initialize" requests, extracts and stores client info and protocol version
 * in the session data for the transport.
 * @param transport - MCP transport instance to wrap
 * @param options - Resolved MCP options
 */
function wrapTransportOnMessage(transport, options) {
  if (transport.onmessage) {
    fill(transport, 'onmessage', originalOnMessage => {
      return function ( message, extra) {
        if (isJsonRpcRequest(message)) {
          const isInitialize = message.method === 'initialize';
          let initSessionData;

          if (isInitialize) {
            try {
              initSessionData = extractSessionDataFromInitializeRequest(message);
              storeSessionDataForTransport(this, initSessionData);
            } catch {
              // noop
            }
          }

          const isolationScope = getIsolationScope().clone();

          return withIsolationScope(isolationScope, () => {
            const spanConfig = buildMcpServerSpanConfig(message, this, extra , options);
            const span = startInactiveSpan(spanConfig);

            // For initialize requests, add client info directly to span (works even for stateless transports)
            if (isInitialize && initSessionData) {
              span.setAttributes({
                ...buildClientAttributesFromInfo(initSessionData.clientInfo),
                ...(initSessionData.protocolVersion && {
                  [MCP_PROTOCOL_VERSION_ATTRIBUTE]: initSessionData.protocolVersion,
                }),
              });
            }

            storeSpanForRequest(this, message.id, span, message.method);

            return withActiveSpan(span, () => {
              return (originalOnMessage ).call(this, message, extra);
            });
          });
        }

        if (isJsonRpcNotification(message)) {
          return createMcpNotificationSpan(message, this, extra , options, () => {
            return (originalOnMessage ).call(this, message, extra);
          });
        }

        return (originalOnMessage ).call(this, message, extra);
      };
    });
  }
}

/**
 * Wraps transport.send to handle outgoing messages and response correlation.
 * For "initialize" responses, extracts and stores protocol version and server info
 * in the session data for the transport.
 * @param transport - MCP transport instance to wrap
 * @param options - Resolved MCP options
 */
function wrapTransportSend(transport, options) {
  if (transport.send) {
    fill(transport, 'send', originalSend => {
      return async function ( ...args) {
        const [message] = args;

        if (isJsonRpcNotification(message)) {
          return createMcpOutgoingNotificationSpan(message, this, options, () => {
            return (originalSend ).call(this, ...args);
          });
        }

        if (isJsonRpcResponse(message)) {
          if (message.id !== null && message.id !== undefined) {
            if (message.error) {
              captureJsonRpcErrorResponse(message.error);
            }

            if (isValidContentItem(message.result)) {
              if (message.result.protocolVersion || message.result.serverInfo) {
                try {
                  const serverData = extractSessionDataFromInitializeResponse(message.result);
                  updateSessionDataForTransport(this, serverData);
                } catch {
                  // noop
                }
              }
            }

            completeSpanWithResults(this, message.id, message.result, options);
          }
        }

        return (originalSend ).call(this, ...args);
      };
    });
  }
}

/**
 * Wraps transport.onclose to clean up pending spans for this transport only
 * @param transport - MCP transport instance to wrap
 */
function wrapTransportOnClose(transport) {
  if (transport.onclose) {
    fill(transport, 'onclose', originalOnClose => {
      return function ( ...args) {
        cleanupPendingSpansForTransport(this);
        cleanupSessionDataForTransport(this);
        return (originalOnClose ).call(this, ...args);
      };
    });
  }
}

/**
 * Wraps transport error handlers to capture connection errors
 * @param transport - MCP transport instance to wrap
 */
function wrapTransportError(transport) {
  if (transport.onerror) {
    fill(transport, 'onerror', (originalOnError) => {
      return function ( error) {
        captureTransportError(error);
        return originalOnError.call(this, error);
      };
    });
  }
}

/**
 * Captures JSON-RPC error responses for server-side errors.
 * @see https://www.jsonrpc.org/specification#error_object
 * @internal
 * @param errorResponse - JSON-RPC error response
 */
function captureJsonRpcErrorResponse(errorResponse) {
  try {
    if (errorResponse && typeof errorResponse === 'object' && 'code' in errorResponse && 'message' in errorResponse) {
      const jsonRpcError = errorResponse ;

      const isServerError =
        jsonRpcError.code === -32603 || (jsonRpcError.code >= -32099 && jsonRpcError.code <= -32000);

      if (isServerError) {
        const error = new Error(jsonRpcError.message);
        error.name = `JsonRpcError_${jsonRpcError.code}`;

        captureError(error, 'protocol');
      }
    }
  } catch {
    // noop
  }
}

/**
 * Captures transport connection errors
 * @internal
 * @param error - Transport error
 */
function captureTransportError(error) {
  try {
    captureError(error, 'transport');
  } catch {
    // noop
  }
}

export { wrapTransportError, wrapTransportOnClose, wrapTransportOnMessage, wrapTransportSend };
//# sourceMappingURL=transport.js.map
