Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const attributes = require('../attributes.js');
const carrier = require('../carrier.js');
const currentScopes = require('../currentScopes.js');
const debugBuild = require('../debug-build.js');
const debugLogger = require('../utils/debug-logger.js');
const scopeData = require('../utils/scopeData.js');
const spanOnScope = require('../utils/spanOnScope.js');
const time = require('../utils/time.js');
const traceInfo = require('../utils/trace-info.js');
const envelope = require('./envelope.js');

const MAX_METRIC_BUFFER_SIZE = 1000;

/**
 * Sets a metric attribute if the value exists and the attribute key is not already present.
 *
 * @param metricAttributes - The metric attributes object to modify.
 * @param key - The attribute key to set.
 * @param value - The value to set (only sets if truthy and key not present).
 * @param setEvenIfPresent - Whether to set the attribute if it is present. Defaults to true.
 */
function setMetricAttribute(
  metricAttributes,
  key,
  value,
  setEvenIfPresent = true,
) {
  if (value && (setEvenIfPresent || !(key in metricAttributes))) {
    metricAttributes[key] = value;
  }
}

/**
 * Captures a serialized metric event and adds it to the metric buffer for the given client.
 *
 * @param client - A client. Uses the current client if not provided.
 * @param serializedMetric - The serialized metric event to capture.
 *
 * @experimental This method will experience breaking changes. This is not yet part of
 * the stable Sentry SDK API and can be changed or removed without warning.
 */
function _INTERNAL_captureSerializedMetric(client, serializedMetric) {
  const bufferMap = _getBufferMap();
  const metricBuffer = _INTERNAL_getMetricBuffer(client);

  if (metricBuffer === undefined) {
    bufferMap.set(client, [serializedMetric]);
  } else {
    if (metricBuffer.length >= MAX_METRIC_BUFFER_SIZE) {
      _INTERNAL_flushMetricsBuffer(client, metricBuffer);
      bufferMap.set(client, [serializedMetric]);
    } else {
      bufferMap.set(client, [...metricBuffer, serializedMetric]);
    }
  }
}

/**
 * Options for capturing a metric internally.
 */

/**
 * Enriches metric with all contextual attributes (user, SDK metadata, replay, etc.)
 */
function _enrichMetricAttributes(beforeMetric, client, user) {
  const { release, environment } = client.getOptions();

  const processedMetricAttributes = {
    ...beforeMetric.attributes,
  };

  // Add user attributes
  setMetricAttribute(processedMetricAttributes, 'user.id', user.id, false);
  setMetricAttribute(processedMetricAttributes, 'user.email', user.email, false);
  setMetricAttribute(processedMetricAttributes, 'user.name', user.username, false);

  // Add Sentry metadata
  setMetricAttribute(processedMetricAttributes, 'sentry.release', release);
  setMetricAttribute(processedMetricAttributes, 'sentry.environment', environment);

  // Add SDK metadata
  const { name, version } = client.getSdkMetadata()?.sdk ?? {};
  setMetricAttribute(processedMetricAttributes, 'sentry.sdk.name', name);
  setMetricAttribute(processedMetricAttributes, 'sentry.sdk.version', version);

  // Add replay metadata
  const replay = client.getIntegrationByName

('Replay');

  const replayId = replay?.getReplayId(true);
  setMetricAttribute(processedMetricAttributes, 'sentry.replay_id', replayId);

  if (replayId && replay?.getRecordingMode() === 'buffer') {
    setMetricAttribute(processedMetricAttributes, 'sentry._internal.replay_is_buffering', true);
  }

  return {
    ...beforeMetric,
    attributes: processedMetricAttributes,
  };
}

/**
 * Creates a serialized metric ready to be sent to Sentry.
 */
function _buildSerializedMetric(
  metric,
  client,
  currentScope,
  scopeAttributes,
) {
  // Get trace context
  const [, traceContext] = traceInfo._getTraceInfoFromScope(client, currentScope);
  const span = spanOnScope._getSpanForScope(currentScope);
  const traceId = span ? span.spanContext().traceId : traceContext?.trace_id;
  const spanId = span ? span.spanContext().spanId : undefined;

  return {
    timestamp: time.timestampInSeconds(),
    trace_id: traceId ?? '',
    span_id: spanId,
    name: metric.name,
    type: metric.type,
    unit: metric.unit,
    value: metric.value,
    attributes: {
      ...attributes.serializeAttributes(scopeAttributes),
      ...attributes.serializeAttributes(metric.attributes, 'skip-undefined'),
    },
  };
}

/**
 * Captures a metric event and sends it to Sentry.
 *
 * @param metric - The metric event to capture.
 * @param options - Options for capturing the metric.
 *
 * @experimental This method will experience breaking changes. This is not yet part of
 * the stable Sentry SDK API and can be changed or removed without warning.
 */
function _INTERNAL_captureMetric(beforeMetric, options) {
  const currentScope = options?.scope ?? currentScopes.getCurrentScope();
  const captureSerializedMetric = options?.captureSerializedMetric ?? _INTERNAL_captureSerializedMetric;
  const client = currentScope?.getClient() ?? currentScopes.getClient();
  if (!client) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('No client available to capture metric.');
    return;
  }

  const { _experiments, enableMetrics, beforeSendMetric } = client.getOptions();

  // todo(v11): Remove the experimental flag
  // eslint-disable-next-line deprecation/deprecation
  const metricsEnabled = enableMetrics ?? _experiments?.enableMetrics ?? true;

  if (!metricsEnabled) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.warn('metrics option not enabled, metric will not be captured.');
    return;
  }

  // Enrich metric with contextual attributes
  const { user, attributes: scopeAttributes } = scopeData.getCombinedScopeData(currentScopes.getIsolationScope(), currentScope);
  const enrichedMetric = _enrichMetricAttributes(beforeMetric, client, user);

  client.emit('processMetric', enrichedMetric);

  // todo(v11): Remove the experimental `beforeSendMetric`
  // eslint-disable-next-line deprecation/deprecation
  const beforeSendCallback = beforeSendMetric || _experiments?.beforeSendMetric;
  const processedMetric = beforeSendCallback ? beforeSendCallback(enrichedMetric) : enrichedMetric;

  if (!processedMetric) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.log('`beforeSendMetric` returned `null`, will not send metric.');
    return;
  }

  const serializedMetric = _buildSerializedMetric(processedMetric, client, currentScope, scopeAttributes);

  debugBuild.DEBUG_BUILD && debugLogger.debug.log('[Metric]', serializedMetric);

  captureSerializedMetric(client, serializedMetric);

  client.emit('afterCaptureMetric', processedMetric);
}

/**
 * Flushes the metrics buffer to Sentry.
 *
 * @param client - A client.
 * @param maybeMetricBuffer - A metric buffer. Uses the metric buffer for the given client if not provided.
 *
 * @experimental This method will experience breaking changes. This is not yet part of
 * the stable Sentry SDK API and can be changed or removed without warning.
 */
function _INTERNAL_flushMetricsBuffer(client, maybeMetricBuffer) {
  const metricBuffer = maybeMetricBuffer ?? _INTERNAL_getMetricBuffer(client) ?? [];
  if (metricBuffer.length === 0) {
    return;
  }

  const clientOptions = client.getOptions();
  const envelope$1 = envelope.createMetricEnvelope(metricBuffer, clientOptions._metadata, clientOptions.tunnel, client.getDsn());

  // Clear the metric buffer after envelopes have been constructed.
  _getBufferMap().set(client, []);

  client.emit('flushMetrics');

  // sendEnvelope should not throw
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  client.sendEnvelope(envelope$1);
}

/**
 * Returns the metric buffer for a given client.
 *
 * Exported for testing purposes.
 *
 * @param client - The client to get the metric buffer for.
 * @returns The metric buffer for the given client.
 */
function _INTERNAL_getMetricBuffer(client) {
  return _getBufferMap().get(client);
}

function _getBufferMap() {
  // The reference to the Client <> MetricBuffer map is stored on the carrier to ensure it's always the same
  return carrier.getGlobalSingleton('clientToMetricBufferMap', () => new WeakMap());
}

exports._INTERNAL_captureMetric = _INTERNAL_captureMetric;
exports._INTERNAL_captureSerializedMetric = _INTERNAL_captureSerializedMetric;
exports._INTERNAL_flushMetricsBuffer = _INTERNAL_flushMetricsBuffer;
exports._INTERNAL_getMetricBuffer = _INTERNAL_getMetricBuffer;
//# sourceMappingURL=internal.js.map
