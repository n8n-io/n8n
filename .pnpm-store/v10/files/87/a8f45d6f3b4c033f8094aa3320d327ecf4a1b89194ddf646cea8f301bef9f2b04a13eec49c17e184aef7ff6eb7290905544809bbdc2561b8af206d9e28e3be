Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const attributes = require('./attributes.js');

/**
 * Method configuration and request processing for MCP server instrumentation
 */


/**
 * Configuration for MCP methods to extract targets and arguments
 * @internal Maps method names to their extraction configuration
 */
const METHOD_CONFIGS = {
  'tools/call': {
    targetField: 'name',
    targetAttribute: attributes.MCP_TOOL_NAME_ATTRIBUTE,
    captureArguments: true,
    argumentsField: 'arguments',
  },
  'resources/read': {
    targetField: 'uri',
    targetAttribute: attributes.MCP_RESOURCE_URI_ATTRIBUTE,
    captureUri: true,
  },
  'resources/subscribe': {
    targetField: 'uri',
    targetAttribute: attributes.MCP_RESOURCE_URI_ATTRIBUTE,
  },
  'resources/unsubscribe': {
    targetField: 'uri',
    targetAttribute: attributes.MCP_RESOURCE_URI_ATTRIBUTE,
  },
  'prompts/get': {
    targetField: 'name',
    targetAttribute: attributes.MCP_PROMPT_NAME_ATTRIBUTE,
    captureName: true,
    captureArguments: true,
    argumentsField: 'arguments',
  },
};

/**
 * Extracts target info from method and params based on method type
 * @param method - MCP method name
 * @param params - Method parameters
 * @returns Target name and attributes for span instrumentation
 */
function extractTargetInfo(
  method,
  params,
)

 {
  const config = METHOD_CONFIGS[method];
  if (!config) {
    return { attributes: {} };
  }

  const target =
    config.targetField && typeof params?.[config.targetField] === 'string'
      ? (params[config.targetField] )
      : undefined;

  return {
    target,
    attributes: target && config.targetAttribute ? { [config.targetAttribute]: target } : {},
  };
}

/**
 * Extracts request arguments based on method type
 * @param method - MCP method name
 * @param params - Method parameters
 * @returns Arguments as span attributes with mcp.request.argument prefix
 */
function getRequestArguments(method, params) {
  const args = {};
  const config = METHOD_CONFIGS[method];

  if (!config) {
    return args;
  }

  if (config.captureArguments && config.argumentsField && params?.[config.argumentsField]) {
    const argumentsObj = params[config.argumentsField];
    if (typeof argumentsObj === 'object' && argumentsObj !== null) {
      for (const [key, value] of Object.entries(argumentsObj )) {
        args[`${attributes.MCP_REQUEST_ARGUMENT}.${key.toLowerCase()}`] = JSON.stringify(value);
      }
    }
  }

  if (config.captureUri && params?.uri) {
    args[`${attributes.MCP_REQUEST_ARGUMENT}.uri`] = JSON.stringify(params.uri);
  }

  if (config.captureName && params?.name) {
    args[`${attributes.MCP_REQUEST_ARGUMENT}.name`] = JSON.stringify(params.name);
  }

  return args;
}

exports.extractTargetInfo = extractTargetInfo;
exports.getRequestArguments = getRequestArguments;
//# sourceMappingURL=methodConfig.js.map
