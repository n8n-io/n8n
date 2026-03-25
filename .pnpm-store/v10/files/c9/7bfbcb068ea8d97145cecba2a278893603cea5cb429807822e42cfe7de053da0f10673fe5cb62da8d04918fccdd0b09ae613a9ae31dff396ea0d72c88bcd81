import { getClient } from '../../currentScopes.js';
import { captureException } from '../../exports.js';
import { getActiveSpan } from '../../utils/spanUtils.js';
import { SPAN_STATUS_ERROR } from '../../tracing/spanstatus.js';

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
    const client = getClient();
    if (!client) {
      return;
    }

    const activeSpan = getActiveSpan();
    if (activeSpan?.isRecording()) {
      activeSpan.setStatus({
        code: SPAN_STATUS_ERROR,
        message: 'internal_error',
      });
    }

    captureException(error, {
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

export { captureError };
//# sourceMappingURL=errorCapture.js.map
