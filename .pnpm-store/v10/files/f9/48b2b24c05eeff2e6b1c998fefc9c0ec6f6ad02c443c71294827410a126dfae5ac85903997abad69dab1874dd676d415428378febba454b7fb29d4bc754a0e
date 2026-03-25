Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const dynamicSamplingContext = require('./tracing/dynamicSamplingContext.js');
const dsn = require('./utils/dsn.js');
const envelope = require('./utils/envelope.js');
const shouldIgnoreSpan = require('./utils/should-ignore-span.js');
const spanUtils = require('./utils/spanUtils.js');

/**
 * Apply SdkInfo (name, version, packages, integrations) to the corresponding event key.
 * Merge with existing data if any.
 *
 * @internal, exported only for testing
 **/
function _enhanceEventWithSdkInfo(event, newSdkInfo) {
  if (!newSdkInfo) {
    return event;
  }

  const eventSdkInfo = event.sdk || {};

  event.sdk = {
    ...eventSdkInfo,
    name: eventSdkInfo.name || newSdkInfo.name,
    version: eventSdkInfo.version || newSdkInfo.version,
    integrations: [...(event.sdk?.integrations || []), ...(newSdkInfo.integrations || [])],
    packages: [...(event.sdk?.packages || []), ...(newSdkInfo.packages || [])],
    settings:
      event.sdk?.settings || newSdkInfo.settings
        ? {
            ...event.sdk?.settings,
            ...newSdkInfo.settings,
          }
        : undefined,
  };

  return event;
}

/** Creates an envelope from a Session */
function createSessionEnvelope(
  session,
  dsn$1,
  metadata,
  tunnel,
) {
  const sdkInfo = envelope.getSdkMetadataForEnvelopeHeader(metadata);
  const envelopeHeaders = {
    sent_at: new Date().toISOString(),
    ...(sdkInfo && { sdk: sdkInfo }),
    ...(!!tunnel && dsn$1 && { dsn: dsn.dsnToString(dsn$1) }),
  };

  const envelopeItem =
    'aggregates' in session ? [{ type: 'sessions' }, session] : [{ type: 'session' }, session.toJSON()];

  return envelope.createEnvelope(envelopeHeaders, [envelopeItem]);
}

/**
 * Create an Envelope from an event.
 */
function createEventEnvelope(
  event,
  dsn,
  metadata,
  tunnel,
) {
  const sdkInfo = envelope.getSdkMetadataForEnvelopeHeader(metadata);

  /*
    Note: Due to TS, event.type may be `replay_event`, theoretically.
    In practice, we never call `createEventEnvelope` with `replay_event` type,
    and we'd have to adjust a looot of types to make this work properly.
    We want to avoid casting this around, as that could lead to bugs (e.g. when we add another type)
    So the safe choice is to really guard against the replay_event type here.
  */
  const eventType = event.type && event.type !== 'replay_event' ? event.type : 'event';

  _enhanceEventWithSdkInfo(event, metadata?.sdk);

  const envelopeHeaders = envelope.createEventEnvelopeHeaders(event, sdkInfo, tunnel, dsn);

  // Prevent this data (which, if it exists, was used in earlier steps in the processing pipeline) from being sent to
  // sentry. (Note: Our use of this property comes and goes with whatever we might be debugging, whatever hacks we may
  // have temporarily added, etc. Even if we don't happen to be using it at some point in the future, let's not get rid
  // of this `delete`, lest we miss putting it back in the next time the property is in use.)
  delete event.sdkProcessingMetadata;

  const eventItem = [{ type: eventType }, event];
  return envelope.createEnvelope(envelopeHeaders, [eventItem]);
}

/**
 * Create envelope from Span item.
 *
 * Takes an optional client and runs spans through `beforeSendSpan` if available.
 */
function createSpanEnvelope(spans, client) {
  function dscHasRequiredProps(dsc) {
    return !!dsc.trace_id && !!dsc.public_key;
  }

  // For the moment we'll obtain the DSC from the first span in the array
  // This might need to be changed if we permit sending multiple spans from
  // different segments in one envelope
  const dsc = dynamicSamplingContext.getDynamicSamplingContextFromSpan(spans[0]);

  const dsn$1 = client?.getDsn();
  const tunnel = client?.getOptions().tunnel;

  const headers = {
    sent_at: new Date().toISOString(),
    ...(dscHasRequiredProps(dsc) && { trace: dsc }),
    ...(!!tunnel && dsn$1 && { dsn: dsn.dsnToString(dsn$1) }),
  };

  const { beforeSendSpan, ignoreSpans } = client?.getOptions() || {};

  const filteredSpans = ignoreSpans?.length
    ? spans.filter(span => !shouldIgnoreSpan.shouldIgnoreSpan(spanUtils.spanToJSON(span), ignoreSpans))
    : spans;
  const droppedSpans = spans.length - filteredSpans.length;

  if (droppedSpans) {
    client?.recordDroppedEvent('before_send', 'span', droppedSpans);
  }

  const convertToSpanJSON = beforeSendSpan
    ? (span) => {
        const spanJson = spanUtils.spanToJSON(span);
        const processedSpan = beforeSendSpan(spanJson);

        if (!processedSpan) {
          spanUtils.showSpanDropWarning();
          return spanJson;
        }

        return processedSpan;
      }
    : spanUtils.spanToJSON;

  const items = [];
  for (const span of filteredSpans) {
    const spanJson = convertToSpanJSON(span);
    if (spanJson) {
      items.push(envelope.createSpanEnvelopeItem(spanJson));
    }
  }

  return envelope.createEnvelope(headers, items);
}

exports._enhanceEventWithSdkInfo = _enhanceEventWithSdkInfo;
exports.createEventEnvelope = createEventEnvelope;
exports.createSessionEnvelope = createSessionEnvelope;
exports.createSpanEnvelope = createSpanEnvelope;
//# sourceMappingURL=envelope.js.map
