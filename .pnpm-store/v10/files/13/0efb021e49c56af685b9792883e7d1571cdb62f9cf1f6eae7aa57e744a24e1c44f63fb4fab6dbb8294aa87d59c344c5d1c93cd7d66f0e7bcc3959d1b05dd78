import { DEBUG_BUILD } from '../../debug-build.js';
import { debug } from '../../utils/debug-logger.js';

/**
 * Message validation functions for MCP server instrumentation
 *
 * Provides JSON-RPC 2.0 message type validation and MCP server instance validation.
 */


/**
 * Validates if a message is a JSON-RPC request
 * @param message - Message to validate
 * @returns True if message is a JSON-RPC request
 */
function isJsonRpcRequest(message) {
  return (
    typeof message === 'object' &&
    message !== null &&
    'jsonrpc' in message &&
    (message ).jsonrpc === '2.0' &&
    'method' in message &&
    'id' in message
  );
}

/**
 * Validates if a message is a JSON-RPC notification
 * @param message - Message to validate
 * @returns True if message is a JSON-RPC notification
 */
function isJsonRpcNotification(message) {
  return (
    typeof message === 'object' &&
    message !== null &&
    'jsonrpc' in message &&
    (message ).jsonrpc === '2.0' &&
    'method' in message &&
    !('id' in message)
  );
}

/**
 * Validates if a message is a JSON-RPC response
 * @param message - Message to validate
 * @returns True if message is a JSON-RPC response
 */
function isJsonRpcResponse(message) {
  return (
    typeof message === 'object' &&
    message !== null &&
    'jsonrpc' in message &&
    (message ).jsonrpc === '2.0' &&
    'id' in message &&
    ('result' in message || 'error' in message)
  );
}

/**
 * Validates MCP server instance with type checking
 * @param instance - Object to validate as MCP server instance
 * @returns True if instance has required MCP server methods
 */
function validateMcpServerInstance(instance) {
  if (
    typeof instance === 'object' &&
    instance !== null &&
    'resource' in instance &&
    'tool' in instance &&
    'prompt' in instance &&
    'connect' in instance
  ) {
    return true;
  }
  DEBUG_BUILD && debug.warn('Did not patch MCP server. Interface is incompatible.');
  return false;
}

/**
 * Check if the item is a valid content item
 * @param item - The item to check
 * @returns True if the item is a valid content item, false otherwise
 */
function isValidContentItem(item) {
  return item != null && typeof item === 'object';
}

export { isJsonRpcNotification, isJsonRpcRequest, isJsonRpcResponse, isValidContentItem, validateMcpServerInstance };
//# sourceMappingURL=validation.js.map
