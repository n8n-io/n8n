Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const url = require('../../utils/url.js');
const attributes = require('./attributes.js');
const methodConfig = require('./methodConfig.js');

/**
 * Core attribute extraction and building functions for MCP server instrumentation
 */


/**
 * Formats logging data for span attributes
 * @internal
 */
function formatLoggingData(data) {
  return typeof data === 'string' ? data : JSON.stringify(data);
}

/**
 * Extracts additional attributes for specific notification types
 * @param method - Notification method name
 * @param params - Notification parameters
 * @param recordInputs - Whether to include actual content or just metadata
 * @returns Method-specific attributes for span instrumentation
 */
function getNotificationAttributes(
  method,
  params,
  recordInputs,
) {
  const attributes$1 = {};

  switch (method) {
    case 'notifications/cancelled':
      if (params?.requestId) {
        attributes$1['mcp.cancelled.request_id'] = String(params.requestId);
      }
      if (params?.reason) {
        attributes$1['mcp.cancelled.reason'] = String(params.reason);
      }
      break;

    case 'notifications/message':
      if (params?.level) {
        attributes$1[attributes.MCP_LOGGING_LEVEL_ATTRIBUTE] = String(params.level);
      }
      if (params?.logger) {
        attributes$1[attributes.MCP_LOGGING_LOGGER_ATTRIBUTE] = String(params.logger);
      }
      if (params?.data !== undefined) {
        attributes$1[attributes.MCP_LOGGING_DATA_TYPE_ATTRIBUTE] = typeof params.data;
        if (recordInputs) {
          attributes$1[attributes.MCP_LOGGING_MESSAGE_ATTRIBUTE] = formatLoggingData(params.data);
        }
      }
      break;

    case 'notifications/progress':
      if (params?.progressToken) {
        attributes$1['mcp.progress.token'] = String(params.progressToken);
      }
      if (typeof params?.progress === 'number') {
        attributes$1['mcp.progress.current'] = params.progress;
      }
      if (typeof params?.total === 'number') {
        attributes$1['mcp.progress.total'] = params.total;
        if (typeof params?.progress === 'number') {
          attributes$1['mcp.progress.percentage'] = (params.progress / params.total) * 100;
        }
      }
      if (params?.message) {
        attributes$1['mcp.progress.message'] = String(params.message);
      }
      break;

    case 'notifications/resources/updated':
      if (params?.uri) {
        attributes$1[attributes.MCP_RESOURCE_URI_ATTRIBUTE] = String(params.uri);
        const urlObject = url.parseStringToURLObject(String(params.uri));
        if (urlObject && !url.isURLObjectRelative(urlObject)) {
          attributes$1['mcp.resource.protocol'] = urlObject.protocol.replace(':', '');
        }
      }
      break;

    case 'notifications/initialized':
      attributes$1['mcp.lifecycle.phase'] = 'initialization_complete';
      attributes$1['mcp.protocol.ready'] = 1;
      break;
  }

  return attributes$1;
}

/**
 * Build type-specific attributes based on message type
 * @param type - Span type (request or notification)
 * @param message - JSON-RPC message
 * @param params - Optional parameters for attribute extraction
 * @param recordInputs - Whether to capture input arguments in spans
 * @returns Type-specific attributes for span instrumentation
 */
function buildTypeSpecificAttributes(
  type,
  message,
  params,
  recordInputs,
) {
  if (type === 'request') {
    const request = message ;
    const targetInfo = methodConfig.extractTargetInfo(request.method, params || {});

    return {
      ...(request.id !== undefined && { [attributes.MCP_REQUEST_ID_ATTRIBUTE]: String(request.id) }),
      ...targetInfo.attributes,
      ...(recordInputs ? methodConfig.getRequestArguments(request.method, params || {}) : {}),
    };
  }

  return getNotificationAttributes(message.method, params || {}, recordInputs);
}

exports.buildTypeSpecificAttributes = buildTypeSpecificAttributes;
exports.getNotificationAttributes = getNotificationAttributes;
//# sourceMappingURL=attributeExtraction.js.map
