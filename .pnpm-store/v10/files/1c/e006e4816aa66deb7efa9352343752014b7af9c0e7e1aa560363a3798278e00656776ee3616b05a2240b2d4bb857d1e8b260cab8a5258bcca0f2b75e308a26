Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../../debug-build.js');
const debugLogger = require('../../utils/debug-logger.js');
const object = require('../../utils/object.js');
const errorCapture = require('./errorCapture.js');

/**
 * Handler method wrapping for MCP server instrumentation
 *
 * Provides automatic error capture and span correlation for tool, resource,
 * and prompt handlers.
 */


/**
 * Generic function to wrap MCP server method handlers
 * @internal
 * @param serverInstance - MCP server instance
 * @param methodName - Method name to wrap (tool, resource, prompt)
 */
function wrapMethodHandler(serverInstance, methodName) {
  object.fill(serverInstance, methodName, originalMethod => {
    return function ( name, ...args) {
      const handler = args[args.length - 1];

      if (typeof handler !== 'function') {
        return (originalMethod ).call(this, name, ...args);
      }

      const wrappedHandler = createWrappedHandler(handler , methodName, name);
      return (originalMethod ).call(this, name, ...args.slice(0, -1), wrappedHandler);
    };
  });
}

/**
 * Creates a wrapped handler with span correlation and error capture
 * @internal
 * @param originalHandler - Original handler function
 * @param methodName - MCP method name
 * @param handlerName - Handler identifier
 * @returns Wrapped handler function
 */
function createWrappedHandler(originalHandler, methodName, handlerName) {
  return function ( ...handlerArgs) {
    try {
      return createErrorCapturingHandler.call(this, originalHandler, methodName, handlerName, handlerArgs);
    } catch (error) {
      debugBuild.DEBUG_BUILD && debugLogger.debug.warn('MCP handler wrapping failed:', error);
      return originalHandler.apply(this, handlerArgs);
    }
  };
}

/**
 * Creates an error-capturing wrapper for handler execution
 * @internal
 * @param originalHandler - Original handler function
 * @param methodName - MCP method name
 * @param handlerName - Handler identifier
 * @param handlerArgs - Handler arguments
 * @param extraHandlerData - Additional handler context
 * @returns Handler execution result
 */
function createErrorCapturingHandler(

  originalHandler,
  methodName,
  handlerName,
  handlerArgs,
) {
  try {
    const result = originalHandler.apply(this, handlerArgs);

    if (result && typeof result === 'object' && typeof (result ).then === 'function') {
      return Promise.resolve(result).catch(error => {
        captureHandlerError(error, methodName, handlerName);
        throw error;
      });
    }

    return result;
  } catch (error) {
    captureHandlerError(error , methodName, handlerName);
    throw error;
  }
}

/**
 * Captures handler execution errors based on handler type
 * @internal
 * @param error - Error to capture
 * @param methodName - MCP method name
 * @param handlerName - Handler identifier
 */
function captureHandlerError(error, methodName, handlerName) {
  try {
    const extraData = {};

    if (methodName === 'tool') {
      extraData.tool_name = handlerName;

      if (
        error.name === 'ProtocolValidationError' ||
        error.message.includes('validation') ||
        error.message.includes('protocol')
      ) {
        errorCapture.captureError(error, 'validation', extraData);
      } else if (
        error.name === 'ServerTimeoutError' ||
        error.message.includes('timed out') ||
        error.message.includes('timeout')
      ) {
        errorCapture.captureError(error, 'timeout', extraData);
      } else {
        errorCapture.captureError(error, 'tool_execution', extraData);
      }
    } else if (methodName === 'resource') {
      extraData.resource_uri = handlerName;
      errorCapture.captureError(error, 'resource_execution', extraData);
    } else if (methodName === 'prompt') {
      extraData.prompt_name = handlerName;
      errorCapture.captureError(error, 'prompt_execution', extraData);
    }
  } catch (captureErr) {
    // noop
  }
}

/**
 * Wraps tool handlers to associate them with request spans
 * @param serverInstance - MCP server instance
 */
function wrapToolHandlers(serverInstance) {
  wrapMethodHandler(serverInstance, 'tool');
}

/**
 * Wraps resource handlers to associate them with request spans
 * @param serverInstance - MCP server instance
 */
function wrapResourceHandlers(serverInstance) {
  wrapMethodHandler(serverInstance, 'resource');
}

/**
 * Wraps prompt handlers to associate them with request spans
 * @param serverInstance - MCP server instance
 */
function wrapPromptHandlers(serverInstance) {
  wrapMethodHandler(serverInstance, 'prompt');
}

/**
 * Wraps all MCP handler types (tool, resource, prompt) for span correlation
 * @param serverInstance - MCP server instance
 */
function wrapAllMCPHandlers(serverInstance) {
  wrapToolHandlers(serverInstance);
  wrapResourceHandlers(serverInstance);
  wrapPromptHandlers(serverInstance);
}

exports.wrapAllMCPHandlers = wrapAllMCPHandlers;
exports.wrapPromptHandlers = wrapPromptHandlers;
exports.wrapResourceHandlers = wrapResourceHandlers;
exports.wrapToolHandlers = wrapToolHandlers;
//# sourceMappingURL=handlers.js.map
