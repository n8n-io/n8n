Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../../currentScopes.js');
const semanticAttributes = require('../../semanticAttributes.js');
const trace = require('../../tracing/trace.js');
const attributeExtraction = require('./attributeExtraction.js');
const attributes = require('./attributes.js');
const methodConfig = require('./methodConfig.js');
const piiFiltering = require('./piiFiltering.js');
const sessionExtraction = require('./sessionExtraction.js');

/**
 * Span creation and management functions for MCP server instrumentation
 *
 * Provides unified span creation following OpenTelemetry MCP semantic conventions and our opinitionated take on MCP.
 * Handles both request and notification spans with attribute extraction.
 */


/**
 * Creates a span name based on the method and target
 * @internal
 * @param method - MCP method name
 * @param target - Optional target identifier
 * @returns Formatted span name
 */
function createSpanName(method, target) {
  return target ? `${method} ${target}` : method;
}

/**
 * Build Sentry-specific attributes based on span type
 * @internal
 * @param type - Span type configuration
 * @returns Sentry-specific attributes
 */
function buildSentryAttributes(type) {
  let op;
  let origin;

  switch (type) {
    case 'request':
      op = attributes.MCP_SERVER_OP_VALUE;
      origin = attributes.MCP_FUNCTION_ORIGIN_VALUE;
      break;
    case 'notification-incoming':
      op = attributes.MCP_NOTIFICATION_CLIENT_TO_SERVER_OP_VALUE;
      origin = attributes.MCP_NOTIFICATION_ORIGIN_VALUE;
      break;
    case 'notification-outgoing':
      op = attributes.MCP_NOTIFICATION_SERVER_TO_CLIENT_OP_VALUE;
      origin = attributes.MCP_NOTIFICATION_ORIGIN_VALUE;
      break;
  }

  return {
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: origin,
    [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: attributes.MCP_ROUTE_SOURCE_VALUE,
  };
}

/**
 * Unified builder for creating MCP spans
 * @internal
 * @param config - Span configuration
 * @returns Created span
 */
function createMcpSpan(config) {
  const { type, message, transport, extra, callback, options } = config;
  const { method } = message;
  const params = message.params;

  // Determine span name based on type and OTEL conventions
  let spanName;
  if (type === 'request') {
    const targetInfo = methodConfig.extractTargetInfo(method, params || {});
    spanName = createSpanName(method, targetInfo.target);
  } else {
    // For notifications, use method name directly per OpenTelemetry conventions
    spanName = method;
  }

  const rawAttributes = {
    ...sessionExtraction.buildTransportAttributes(transport, extra),
    [attributes.MCP_METHOD_NAME_ATTRIBUTE]: method,
    ...attributeExtraction.buildTypeSpecificAttributes(type, message, params, options?.recordInputs),
    ...buildSentryAttributes(type),
  };

  const client = currentScopes.getClient();
  const sendDefaultPii = Boolean(client?.getOptions().sendDefaultPii);
  const attributes$1 = piiFiltering.filterMcpPiiFromSpanData(rawAttributes, sendDefaultPii) ;

  return trace.startSpan(
    {
      name: spanName,
      forceTransaction: true,
      attributes: attributes$1,
    },
    callback,
  );
}

/**
 * Creates a span for incoming MCP notifications
 * @param jsonRpcMessage - Notification message
 * @param transport - MCP transport instance
 * @param extra - Extra handler data
 * @param options - Resolved MCP options
 * @param callback - Span execution callback
 * @returns Span execution result
 */
function createMcpNotificationSpan(
  jsonRpcMessage,
  transport,
  extra,
  options,
  callback,
) {
  return createMcpSpan({
    type: 'notification-incoming',
    message: jsonRpcMessage,
    transport,
    extra,
    callback,
    options,
  });
}

/**
 * Creates a span for outgoing MCP notifications
 * @param jsonRpcMessage - Notification message
 * @param transport - MCP transport instance
 * @param options - Resolved MCP options
 * @param callback - Span execution callback
 * @returns Span execution result
 */
function createMcpOutgoingNotificationSpan(
  jsonRpcMessage,
  transport,
  options,
  callback,
) {
  return createMcpSpan({
    type: 'notification-outgoing',
    message: jsonRpcMessage,
    transport,
    options,
    callback,
  });
}

/**
 * Builds span configuration for MCP server requests
 * @param jsonRpcMessage - Request message
 * @param transport - MCP transport instance
 * @param extra - Optional extra handler data
 * @param options - Resolved MCP options
 * @returns Span configuration object
 */
function buildMcpServerSpanConfig(
  jsonRpcMessage,
  transport,
  extra,
  options,
)

 {
  const { method } = jsonRpcMessage;
  const params = jsonRpcMessage.params;

  const targetInfo = methodConfig.extractTargetInfo(method, params || {});
  const spanName = createSpanName(method, targetInfo.target);

  const rawAttributes = {
    ...sessionExtraction.buildTransportAttributes(transport, extra),
    [attributes.MCP_METHOD_NAME_ATTRIBUTE]: method,
    ...attributeExtraction.buildTypeSpecificAttributes('request', jsonRpcMessage, params, options?.recordInputs),
    ...buildSentryAttributes('request'),
  };

  const client = currentScopes.getClient();
  const sendDefaultPii = Boolean(client?.getOptions().sendDefaultPii);
  const attributes$1 = piiFiltering.filterMcpPiiFromSpanData(rawAttributes, sendDefaultPii) ;

  return {
    name: spanName,
    op: attributes.MCP_SERVER_OP_VALUE,
    forceTransaction: true,
    attributes: attributes$1,
  };
}

exports.buildMcpServerSpanConfig = buildMcpServerSpanConfig;
exports.createMcpNotificationSpan = createMcpNotificationSpan;
exports.createMcpOutgoingNotificationSpan = createMcpOutgoingNotificationSpan;
//# sourceMappingURL=spans.js.map
