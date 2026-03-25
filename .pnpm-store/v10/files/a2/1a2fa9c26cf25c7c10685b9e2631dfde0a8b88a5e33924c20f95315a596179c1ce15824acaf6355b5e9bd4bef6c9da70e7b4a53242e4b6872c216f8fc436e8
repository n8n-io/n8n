Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../../currentScopes.js');
const object = require('../../utils/object.js');
const trace = require('../../tracing/trace.js');
const attributes = require('./attributes.js');
const correlation = require('./correlation.js');
const errorCapture = require('./errorCapture.js');
const sessionExtraction = require('./sessionExtraction.js');
const sessionManagement = require('./sessionManagement.js');
const spans = require('./spans.js');
const validation = require('./validation.js');

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
    object.fill(transport, 'onmessage', originalOnMessage => {
      return function ( message, extra) {
        if (validation.isJsonRpcRequest(message)) {
          const isInitialize = message.method === 'initialize';
          let initSessionData;

          if (isInitialize) {
            try {
              initSessionData = sessionExtraction.extractSessionDataFromInitializeRequest(message);
              sessionManagement.storeSessionDataForTransport(this, initSessionData);
            } catch {
              // noop
            }
          }

          const isolationScope = currentScopes.getIsolationScope().clone();

          return currentScopes.withIsolationScope(isolationScope, () => {
            const spanConfig = spans.buildMcpServerSpanConfig(message, this, extra , options);
            const span = trace.startInactiveSpan(spanConfig);

            // For initialize requests, add client info directly to span (works even for stateless transports)
            if (isInitialize && initSessionData) {
              span.setAttributes({
                ...sessionExtraction.buildClientAttributesFromInfo(initSessionData.clientInfo),
                ...(initSessionData.protocolVersion && {
                  [attributes.MCP_PROTOCOL_VERSION_ATTRIBUTE]: initSessionData.protocolVersion,
                }),
              });
            }

            correlation.storeSpanForRequest(this, message.id, span, message.method);

            return trace.withActiveSpan(span, () => {
              return (originalOnMessage ).call(this, message, extra);
            });
          });
        }

        if (validation.isJsonRpcNotification(message)) {
          return spans.createMcpNotificationSpan(message, this, extra , options, () => {
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
    object.fill(transport, 'send', originalSend => {
      return async function ( ...args) {
        const [message] = args;

        if (validation.isJsonRpcNotification(message)) {
          return spans.createMcpOutgoingNotificationSpan(message, this, options, () => {
            return (originalSend ).call(this, ...args);
          });
        }

        if (validation.isJsonRpcResponse(message)) {
          if (message.id !== null && message.id !== undefined) {
            if (message.error) {
              captureJsonRpcErrorResponse(message.error);
            }

            if (validation.isValidContentItem(message.result)) {
              if (message.result.protocolVersion || message.result.serverInfo) {
                try {
                  const serverData = sessionExtraction.extractSessionDataFromInitializeResponse(message.result);
                  sessionManagement.updateSessionDataForTransport(this, serverData);
                } catch {
                  // noop
                }
              }
            }

            correlation.completeSpanWithResults(this, message.id, message.result, options);
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
    object.fill(transport, 'onclose', originalOnClose => {
      return function ( ...args) {
        correlation.cleanupPendingSpansForTransport(this);
        sessionManagement.cleanupSessionDataForTransport(this);
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
    object.fill(transport, 'onerror', (originalOnError) => {
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

        errorCapture.captureError(error, 'protocol');
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
    errorCapture.captureError(error, 'transport');
  } catch {
    // noop
  }
}

exports.wrapTransportError = wrapTransportError;
exports.wrapTransportOnClose = wrapTransportOnClose;
exports.wrapTransportOnMessage = wrapTransportOnMessage;
exports.wrapTransportSend = wrapTransportSend;
//# sourceMappingURL=transport.js.map
