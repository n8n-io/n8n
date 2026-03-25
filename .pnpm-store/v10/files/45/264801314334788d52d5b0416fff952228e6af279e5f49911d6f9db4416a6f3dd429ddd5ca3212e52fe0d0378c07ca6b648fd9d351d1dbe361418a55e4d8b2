Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../../currentScopes.js');
const exports$1 = require('../../exports.js');
const spanUtils = require('../../utils/spanUtils.js');
const spanstatus = require('../../tracing/spanstatus.js');

/**
 * Safe error capture utilities for MCP server instrumentation
 *
 * Ensures error reporting never interferes with MCP server operation.
 * All capture operations are wrapped in try-catch to prevent side effects.
 */


/**
 * Captures an error without affecting MCP server operation.
 *
 * The active span already contains all MCP context (method, tool, arguments, etc.)
 * @param error - Error to capture
 * @param errorType - Classification of error type for filtering
 * @param extraData - Additional context data to include
 */
function captureError(error, errorType, extraData) {
  try {
    const client = currentScopes.getClient();
    if (!client) {
      return;
    }

    const activeSpan = spanUtils.getActiveSpan();
    if (activeSpan?.isRecording()) {
      activeSpan.setStatus({
        code: spanstatus.SPAN_STATUS_ERROR,
        message: 'internal_error',
      });
    }

    exports$1.captureException(error, {
      mechanism: {
        type: 'auto.ai.mcp_server',
        handled: false,
        data: {
          error_type: errorType || 'handler_execution',
          ...extraData,
        },
      },
    });
  } catch {
    // noop
  }
}

exports.captureError = captureError;
//# sourceMappingURL=errorCapture.js.map
