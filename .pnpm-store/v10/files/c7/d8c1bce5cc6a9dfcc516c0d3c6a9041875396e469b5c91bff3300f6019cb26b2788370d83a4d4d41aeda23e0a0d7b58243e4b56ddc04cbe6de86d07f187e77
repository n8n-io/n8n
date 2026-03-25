import { ATTR_URL_FULL, SEMATTRS_HTTP_URL, ATTR_HTTP_REQUEST_METHOD, SEMATTRS_HTTP_METHOD, ATTR_DB_SYSTEM_NAME, SEMATTRS_DB_SYSTEM, SEMATTRS_RPC_SERVICE, SEMATTRS_MESSAGING_SYSTEM, SEMATTRS_FAAS_TRIGGER, SEMATTRS_DB_STATEMENT, SEMATTRS_HTTP_TARGET, ATTR_HTTP_ROUTE, ATTR_HTTP_RESPONSE_STATUS_CODE, SEMATTRS_HTTP_STATUS_CODE, SEMATTRS_RPC_GRPC_STATUS_CODE } from '@opentelemetry/semantic-conventions';
import { parseUrl, getSanitizedUrlString, SDK_VERSION, addNonEnumerableProperty, isSentryRequestUrl, getClient, baggageHeaderToDynamicSamplingContext, SEMANTIC_ATTRIBUTE_SENTRY_OP, SEMANTIC_ATTRIBUTE_SENTRY_SOURCE, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME, stripUrlQueryAndFragment, spanToJSON, hasSpansEnabled, dynamicSamplingContextToSentryBaggageHeader, LRUMap, debug, parseBaggageHeader, SENTRY_BAGGAGE_KEY_PREFIX, generateSentryTraceHeader, generateTraceparentHeader, stringMatchesSomePattern, getDynamicSamplingContextFromSpan, getCurrentScope, getDynamicSamplingContextFromScope, getIsolationScope, propagationContextFromHeaders, shouldContinueTrace, spanToTraceContext, getTraceContextFromScope, handleCallbackErrors, getRootSpan, getCapturedScopesOnSpan, setAsyncContextStrategy, getDefaultIsolationScope, getDefaultCurrentScope, SPAN_STATUS_OK, SPAN_STATUS_ERROR, getSpanStatusFromHttpCode, _INTERNAL_safeDateNow, debounce, timedEventsToMeasurements, captureEvent, SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE, convertSpanLinksForEnvelope, getStatusMessage, spanTimeInputToSeconds, addChildSpanToSpan, setCapturedScopesOnSpan, logSpanStart, logSpanEnd, parseSampleRate, _INTERNAL_safeMathRandom, sampleSpan } from '@sentry/core';
export { getClient, getDynamicSamplingContextFromSpan } from '@sentry/core';
import * as api from '@opentelemetry/api';
import { trace, SpanKind, createContextKey, TraceFlags, propagation, INVALID_TRACEID, context, SpanStatusCode, ROOT_CONTEXT, isSpanContextValid } from '@opentelemetry/api';
import { TraceState, W3CBaggagePropagator, isTracingSuppressed, suppressTracing as suppressTracing$1 } from '@opentelemetry/core';
import { SamplingDecision } from '@opentelemetry/sdk-trace-base';

/** If this attribute is true, it means that the parent is a remote span. */
const SEMANTIC_ATTRIBUTE_SENTRY_PARENT_IS_REMOTE = 'sentry.parentIsRemote';

// These are not standardized yet, but used by the graphql instrumentation
const SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION = 'sentry.graphql.operation';

/**
 * Get the parent span id from a span.
 * In OTel v1, the parent span id is accessed as `parentSpanId`
 * In OTel v2, the parent span id is accessed as `spanId` on the `parentSpanContext`
 */
function getParentSpanId(span) {
  if ('parentSpanId' in span) {
    return span.parentSpanId ;
  } else if ('parentSpanContext' in span) {
    return (span.parentSpanContext )?.spanId;
  }

  return undefined;
}

/**
 * Check if a given span has attributes.
 * This is necessary because the base `Span` type does not have attributes,
 * so in places where we are passed a generic span, we need to check if we want to access them.
 */
function spanHasAttributes(
  span,
) {
  const castSpan = span ;
  return !!castSpan.attributes && typeof castSpan.attributes === 'object';
}

/**
 * Check if a given span has a kind.
 * This is necessary because the base `Span` type does not have a kind,
 * so in places where we are passed a generic span, we need to check if we want to access it.
 */
function spanHasKind(span) {
  const castSpan = span ;
  return typeof castSpan.kind === 'number';
}

/**
 * Check if a given span has a status.
 * This is necessary because the base `Span` type does not have a status,
 * so in places where we are passed a generic span, we need to check if we want to access it.
 */
function spanHasStatus(
  span,
) {
  const castSpan = span ;
  return !!castSpan.status;
}

/**
 * Check if a given span has a name.
 * This is necessary because the base `Span` type does not have a name,
 * so in places where we are passed a generic span, we need to check if we want to access it.
 */
function spanHasName(span) {
  const castSpan = span ;
  return !!castSpan.name;
}

/**
 * Check if a given span has a kind.
 * This is necessary because the base `Span` type does not have a kind,
 * so in places where we are passed a generic span, we need to check if we want to access it.
 */
function spanHasParentId(
  span,
) {
  const castSpan = span ;
  return !!getParentSpanId(castSpan);
}

/**
 * Check if a given span has events.
 * This is necessary because the base `Span` type does not have events,
 * so in places where we are passed a generic span, we need to check if we want to access it.
 */
function spanHasEvents(
  span,
) {
  const castSpan = span ;
  return Array.isArray(castSpan.events);
}

/**
 * Get sanitizied request data from an OTEL span.
 */
function getRequestSpanData(span) {
  // The base `Span` type has no `attributes`, so we need to guard here against that
  if (!spanHasAttributes(span)) {
    return {};
  }

  // eslint-disable-next-line deprecation/deprecation
  const maybeUrlAttribute = (span.attributes[ATTR_URL_FULL] || span.attributes[SEMATTRS_HTTP_URL])

;

  const data = {
    url: maybeUrlAttribute,
    // eslint-disable-next-line deprecation/deprecation
    'http.method': (span.attributes[ATTR_HTTP_REQUEST_METHOD] || span.attributes[SEMATTRS_HTTP_METHOD])

,
  };

  // Default to GET if URL is set but method is not
  if (!data['http.method'] && data.url) {
    data['http.method'] = 'GET';
  }

  try {
    if (typeof maybeUrlAttribute === 'string') {
      const url = parseUrl(maybeUrlAttribute);

      data.url = getSanitizedUrlString(url);

      if (url.search) {
        data['http.query'] = url.search;
      }
      if (url.hash) {
        data['http.fragment'] = url.hash;
      }
    }
  } catch {
    // ignore
  }

  return data;
}

// Typescript complains if we do not use `...args: any[]` for the mixin, with:
// A mixin class must have a constructor with a single rest parameter of type 'any[]'.ts(2545)
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Wrap an Client class with things we need for OpenTelemetry support.
 * Make sure that the Client class passed in is non-abstract!
 *
 * Usage:
 * const OpenTelemetryClient = getWrappedClientClass(NodeClient);
 * const client = new OpenTelemetryClient(options);
 */
function wrapClientClass

(ClientClass) {
  // @ts-expect-error We just assume that this is non-abstract, if you pass in an abstract class this would make it non-abstract
  class OpenTelemetryClient extends ClientClass  {

     constructor(...args) {
      super(...args);
    }

    /** Get the OTEL tracer. */
     get tracer() {
      if (this._tracer) {
        return this._tracer;
      }

      const name = '@sentry/opentelemetry';
      const version = SDK_VERSION;
      const tracer = trace.getTracer(name, version);
      this._tracer = tracer;

      return tracer;
    }

    /**
     * @inheritDoc
     */
     async flush(timeout) {
      const provider = this.traceProvider;
      await provider?.forceFlush();
      return super.flush(timeout);
    }
  }

  return OpenTelemetryClient ;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Get the span kind from a span.
 * For whatever reason, this is not public API on the generic "Span" type,
 * so we need to check if we actually have a `SDKTraceBaseSpan` where we can fetch this from.
 * Otherwise, we fall back to `SpanKind.INTERNAL`.
 */
function getSpanKind(span) {
  if (spanHasKind(span)) {
    return span.kind;
  }

  return SpanKind.INTERNAL;
}

const SENTRY_TRACE_HEADER = 'sentry-trace';
const SENTRY_BAGGAGE_HEADER = 'baggage';

const SENTRY_TRACE_STATE_DSC = 'sentry.dsc';
const SENTRY_TRACE_STATE_SAMPLED_NOT_RECORDING = 'sentry.sampled_not_recording';
const SENTRY_TRACE_STATE_URL = 'sentry.url';
const SENTRY_TRACE_STATE_SAMPLE_RAND = 'sentry.sample_rand';
const SENTRY_TRACE_STATE_SAMPLE_RATE = 'sentry.sample_rate';

// NOTE: `@sentry/nextjs` has a local copy of this context key for Edge bundles:
// - `packages/nextjs/src/edge/index.ts` (`SENTRY_SCOPES_CONTEXT_KEY`)
//
// If you change the key name passed to `createContextKey(...)`, update that file too.
const SENTRY_SCOPES_CONTEXT_KEY = createContextKey('sentry_scopes');

const SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY = createContextKey('sentry_fork_isolation_scope');

const SENTRY_FORK_SET_SCOPE_CONTEXT_KEY = createContextKey('sentry_fork_set_scope');

const SENTRY_FORK_SET_ISOLATION_SCOPE_CONTEXT_KEY = createContextKey('sentry_fork_set_isolation_scope');

const SCOPE_CONTEXT_FIELD = '_scopeContext';

/**
 * Try to get the current scopes from the given OTEL context.
 * This requires a Context Manager that was wrapped with getWrappedContextManager.
 */
function getScopesFromContext(context) {
  // NOTE: `@sentry/nextjs` has a local copy of this helper for Edge bundles:
  // - `packages/nextjs/src/edge/index.ts` (`getScopesFromContext`)
  //
  // If you change how scopes are stored/read (key or retrieval), update that file too.
  return context.getValue(SENTRY_SCOPES_CONTEXT_KEY) ;
}

/**
 * Set the current scopes on an OTEL context.
 * This will return a forked context with the Propagation Context set.
 */
function setScopesOnContext(context, scopes) {
  return context.setValue(SENTRY_SCOPES_CONTEXT_KEY, scopes);
}

/**
 * Set the context on the scope so we can later look it up.
 * We need this to get the context from the scope in the `trace` functions.
 */
function setContextOnScope(scope, context) {
  addNonEnumerableProperty(scope, SCOPE_CONTEXT_FIELD, context);
}

/**
 * Get the context related to a scope.
 */
function getContextFromScope(scope) {
  return (scope )[SCOPE_CONTEXT_FIELD];
}

/**
 *
 * @param otelSpan Checks whether a given OTEL Span is an http request to sentry.
 * @returns boolean
 */
function isSentryRequestSpan(span) {
  // NOTE: `@sentry/nextjs` has a local copy of this helper for Edge bundles:
  // - `packages/nextjs/src/common/utils/dropMiddlewareTunnelRequests.ts` (`isSentryRequestSpan`)
  //
  // If you change supported OTEL attribute keys or request detection logic, update that file too.
  if (!spanHasAttributes(span)) {
    return false;
  }

  const { attributes } = span;

  // `ATTR_URL_FULL` is the new attribute, but we still support the old one, `ATTR_HTTP_URL`, for now.
  // eslint-disable-next-line deprecation/deprecation
  const httpUrl = attributes[SEMATTRS_HTTP_URL] || attributes[ATTR_URL_FULL];

  if (!httpUrl) {
    return false;
  }

  return isSentryRequestUrl(httpUrl.toString(), getClient());
}

/**
 * OpenTelemetry only knows about SAMPLED or NONE decision,
 * but for us it is important to differentiate between unset and unsampled.
 *
 * Both of these are identified as `traceFlags === TracegFlags.NONE`,
 * but we additionally look at a special trace state to differentiate between them.
 */
function getSamplingDecision(spanContext) {
  const { traceFlags, traceState } = spanContext;

  const sampledNotRecording = traceState ? traceState.get(SENTRY_TRACE_STATE_SAMPLED_NOT_RECORDING) === '1' : false;

  // If trace flag is `SAMPLED`, we interpret this as sampled
  // If it is `NONE`, it could mean either it was sampled to be not recorder, or that it was not sampled at all
  // For us this is an important difference, sow e look at the SENTRY_TRACE_STATE_SAMPLED_NOT_RECORDING
  // to identify which it is
  if (traceFlags === TraceFlags.SAMPLED) {
    return true;
  }

  if (sampledNotRecording) {
    return false;
  }

  // Fall back to DSC as a last resort, that may also contain `sampled`...
  const dscString = traceState ? traceState.get(SENTRY_TRACE_STATE_DSC) : undefined;
  const dsc = dscString ? baggageHeaderToDynamicSamplingContext(dscString) : undefined;

  if (dsc?.sampled === 'true') {
    return true;
  }
  if (dsc?.sampled === 'false') {
    return false;
  }

  return undefined;
}

/**
 * Infer the op & description for a set of name, attributes and kind of a span.
 */
function inferSpanData(spanName, attributes, kind) {
  // if http.method exists, this is an http request span
  // eslint-disable-next-line deprecation/deprecation
  const httpMethod = attributes[ATTR_HTTP_REQUEST_METHOD] || attributes[SEMATTRS_HTTP_METHOD];
  if (httpMethod) {
    return descriptionForHttpMethod({ attributes, name: spanName, kind }, httpMethod);
  }

  // eslint-disable-next-line deprecation/deprecation
  const dbSystem = attributes[ATTR_DB_SYSTEM_NAME] || attributes[SEMATTRS_DB_SYSTEM];
  const opIsCache =
    typeof attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP] === 'string' &&
    attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP].startsWith('cache.');

  // If db.type exists then this is a database call span
  // If the Redis DB is used as a cache, the span description should not be changed
  if (dbSystem && !opIsCache) {
    return descriptionForDbSystem({ attributes, name: spanName });
  }

  const customSourceOrRoute = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] === 'custom' ? 'custom' : 'route';

  // If rpc.service exists then this is a rpc call span.
  // eslint-disable-next-line deprecation/deprecation
  const rpcService = attributes[SEMATTRS_RPC_SERVICE];
  if (rpcService) {
    return {
      ...getUserUpdatedNameAndSource(spanName, attributes, 'route'),
      op: 'rpc',
    };
  }

  // If messaging.system exists then this is a messaging system span.
  // eslint-disable-next-line deprecation/deprecation
  const messagingSystem = attributes[SEMATTRS_MESSAGING_SYSTEM];
  if (messagingSystem) {
    return {
      ...getUserUpdatedNameAndSource(spanName, attributes, customSourceOrRoute),
      op: 'message',
    };
  }

  // If faas.trigger exists then this is a function as a service span.
  // eslint-disable-next-line deprecation/deprecation
  const faasTrigger = attributes[SEMATTRS_FAAS_TRIGGER];
  if (faasTrigger) {
    return {
      ...getUserUpdatedNameAndSource(spanName, attributes, customSourceOrRoute),
      op: faasTrigger.toString(),
    };
  }

  return { op: undefined, description: spanName, source: 'custom' };
}

/**
 * Extract better op/description from an otel span.
 *
 * Does not overwrite the span name if the source is already set to custom to ensure
 * that user-updated span names are preserved. In this case, we only adjust the op but
 * leave span description and source unchanged.
 *
 * Based on https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/7422ce2a06337f68a59b552b8c5a2ac125d6bae5/exporter/sentryexporter/sentry_exporter.go#L306
 */
function parseSpanDescription(span) {
  const attributes = spanHasAttributes(span) ? span.attributes : {};
  const name = spanHasName(span) ? span.name : '<unknown>';
  const kind = getSpanKind(span);

  return inferSpanData(name, attributes, kind);
}

function descriptionForDbSystem({ attributes, name }) {
  // if we already have a custom name, we don't overwrite it but only set the op
  const userDefinedName = attributes[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
  if (typeof userDefinedName === 'string') {
    return {
      op: 'db',
      description: userDefinedName,
      source: (attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] ) || 'custom',
    };
  }

  // if we already have the source set to custom, we don't overwrite the span description but only set the op
  if (attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] === 'custom') {
    return { op: 'db', description: name, source: 'custom' };
  }

  // Use DB statement (Ex "SELECT * FROM table") if possible as description.
  // eslint-disable-next-line deprecation/deprecation
  const statement = attributes[SEMATTRS_DB_STATEMENT];

  const description = statement ? statement.toString() : name;

  return { op: 'db', description, source: 'task' };
}

/** Only exported for tests. */
function descriptionForHttpMethod(
  { name, kind, attributes },
  httpMethod,
) {
  const opParts = ['http'];

  switch (kind) {
    case SpanKind.CLIENT:
      opParts.push('client');
      break;
    case SpanKind.SERVER:
      opParts.push('server');
      break;
  }

  // Spans for HTTP requests we have determined to be prefetch requests will have a `.prefetch` postfix in the op
  if (attributes['sentry.http.prefetch']) {
    opParts.push('prefetch');
  }

  const { urlPath, url, query, fragment, hasRoute } = getSanitizedUrl(attributes, kind);

  if (!urlPath) {
    return { ...getUserUpdatedNameAndSource(name, attributes), op: opParts.join('.') };
  }

  const graphqlOperationsAttribute = attributes[SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION];

  // Ex. GET /api/users
  const baseDescription = `${httpMethod} ${urlPath}`;

  // When the http span has a graphql operation, append it to the description
  // We add these in the graphqlIntegration
  const inferredDescription = graphqlOperationsAttribute
    ? `${baseDescription} (${getGraphqlOperationNamesFromAttribute(graphqlOperationsAttribute)})`
    : baseDescription;

  // If `httpPath` is a root path, then we can categorize the transaction source as route.
  const inferredSource = hasRoute || urlPath === '/' ? 'route' : 'url';

  const data = {};

  if (url) {
    data.url = url;
  }
  if (query) {
    data['http.query'] = query;
  }
  if (fragment) {
    data['http.fragment'] = fragment;
  }

  // If the span kind is neither client nor server, we use the original name
  // this infers that somebody manually started this span, in which case we don't want to overwrite the name
  const isClientOrServerKind = kind === SpanKind.CLIENT || kind === SpanKind.SERVER;

  // If the span is an auto-span (=it comes from one of our instrumentations),
  // we always want to infer the name
  // this is necessary because some of the auto-instrumentation we use uses kind=INTERNAL
  const origin = attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] || 'manual';
  const isManualSpan = !`${origin}`.startsWith('auto');

  // If users (or in very rare occasions we) set the source to custom, we don't overwrite the name
  const alreadyHasCustomSource = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] === 'custom';
  const customSpanName = attributes[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];

  const useInferredDescription =
    !alreadyHasCustomSource && customSpanName == null && (isClientOrServerKind || !isManualSpan);

  const { description, source } = useInferredDescription
    ? { description: inferredDescription, source: inferredSource }
    : getUserUpdatedNameAndSource(name, attributes);

  return {
    op: opParts.join('.'),
    description,
    source,
    data,
  };
}

function getGraphqlOperationNamesFromAttribute(attr) {
  if (Array.isArray(attr)) {
    const sorted = attr.slice().sort();

    // Up to 5 items, we just add all of them
    if (sorted.length <= 5) {
      return sorted.join(', ');
    } else {
      // Else, we add the first 5 and the diff of other operations
      return `${sorted.slice(0, 5).join(', ')}, +${sorted.length - 5}`;
    }
  }

  return `${attr}`;
}

/** Exported for tests only */
function getSanitizedUrl(
  attributes,
  kind,
)

 {
  // This is the relative path of the URL, e.g. /sub
  // eslint-disable-next-line deprecation/deprecation
  const httpTarget = attributes[SEMATTRS_HTTP_TARGET];
  // This is the full URL, including host & query params etc., e.g. https://example.com/sub?foo=bar
  // eslint-disable-next-line deprecation/deprecation
  const httpUrl = attributes[SEMATTRS_HTTP_URL] || attributes[ATTR_URL_FULL];
  // This is the normalized route name - may not always be available!
  const httpRoute = attributes[ATTR_HTTP_ROUTE];

  const parsedUrl = typeof httpUrl === 'string' ? parseUrl(httpUrl) : undefined;
  const url = parsedUrl ? getSanitizedUrlString(parsedUrl) : undefined;
  const query = parsedUrl?.search || undefined;
  const fragment = parsedUrl?.hash || undefined;

  if (typeof httpRoute === 'string') {
    return { urlPath: httpRoute, url, query, fragment, hasRoute: true };
  }

  if (kind === SpanKind.SERVER && typeof httpTarget === 'string') {
    return { urlPath: stripUrlQueryAndFragment(httpTarget), url, query, fragment, hasRoute: false };
  }

  if (parsedUrl) {
    return { urlPath: url, url, query, fragment, hasRoute: false };
  }

  // fall back to target even for client spans, if no URL is present
  if (typeof httpTarget === 'string') {
    return { urlPath: stripUrlQueryAndFragment(httpTarget), url, query, fragment, hasRoute: false };
  }

  return { urlPath: undefined, url, query, fragment, hasRoute: false };
}

/**
 * Because Otel instrumentation sometimes mutates span names via `span.updateName`, the only way
 * to ensure that a user-set span name is preserved is to store it as a tmp attribute on the span.
 * We delete this attribute once we're done with it when preparing the event envelope.
 *
 * This temp attribute always takes precedence over the original name.
 *
 * We also need to take care of setting the correct source. Users can always update the source
 * after updating the name, so we need to respect that.
 *
 * @internal exported only for testing
 */
function getUserUpdatedNameAndSource(
  originalName,
  attributes,
  fallbackSource = 'custom',
)

 {
  const source = (attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] ) || fallbackSource;
  const description = attributes[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];

  if (description && typeof description === 'string') {
    return {
      description,
      source,
    };
  }

  return { description: originalName, source };
}

/**
 * Setup a DSC handler on the passed client,
 * ensuring that the transaction name is inferred from the span correctly.
 */
function enhanceDscWithOpenTelemetryRootSpanName(client) {
  client.on('createDsc', (dsc, rootSpan) => {
    if (!rootSpan) {
      return;
    }

    // We want to overwrite the transaction on the DSC that is created by default in core
    // The reason for this is that we want to infer the span name, not use the initial one
    // Otherwise, we'll get names like "GET" instead of e.g. "GET /foo"
    // `parseSpanDescription` takes the attributes of the span into account for the name
    // This mutates the passed-in DSC

    const jsonSpan = spanToJSON(rootSpan);
    const attributes = jsonSpan.data;
    const source = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE];

    const { description } = spanHasName(rootSpan) ? parseSpanDescription(rootSpan) : { description: undefined };
    if (source !== 'url' && description) {
      dsc.transaction = description;
    }

    // Also ensure sampling decision is correctly inferred
    // In core, we use `spanIsSampled`, which just looks at the trace flags
    // but in OTEL, we use a slightly more complex logic to be able to differntiate between unsampled and deferred sampling
    if (hasSpansEnabled()) {
      const sampled = getSamplingDecision(rootSpan.spanContext());
      dsc.sampled = sampled == undefined ? undefined : String(sampled);
    }
  });
}

/**
 * Returns the currently active span.
 */
function getActiveSpan() {
  return trace.getActiveSpan();
}

/**
 * This serves as a build time flag that will be true by default, but false in non-debug builds or if users replace `__SENTRY_DEBUG__` in their generated code.
 *
 * ATTENTION: This constant must never cross package boundaries (i.e. be exported) to guarantee that it can be used for tree shaking.
 */
const DEBUG_BUILD = (typeof __SENTRY_DEBUG__ === 'undefined' || __SENTRY_DEBUG__);

/**
 * Generate a TraceState for the given data.
 */
function makeTraceState({
  dsc,
  sampled,
}

) {
  // We store the DSC as OTEL trace state on the span context
  const dscString = dsc ? dynamicSamplingContextToSentryBaggageHeader(dsc) : undefined;

  const traceStateBase = new TraceState();

  const traceStateWithDsc = dscString ? traceStateBase.set(SENTRY_TRACE_STATE_DSC, dscString) : traceStateBase;

  // We also specifically want to store if this is sampled to be not recording,
  // or unsampled (=could be either sampled or not)
  return sampled === false ? traceStateWithDsc.set(SENTRY_TRACE_STATE_SAMPLED_NOT_RECORDING, '1') : traceStateWithDsc;
}

const setupElements = new Set();

/** Get all the OpenTelemetry elements that have been set up. */
function openTelemetrySetupCheck() {
  return Array.from(setupElements);
}

/** Mark an OpenTelemetry element as setup. */
function setIsSetup(element) {
  setupElements.add(element);
}

/**
 * Injects and extracts `sentry-trace` and `baggage` headers from carriers.
 */
class SentryPropagator extends W3CBaggagePropagator {
  /** A map of URLs that have already been checked for if they match tracePropagationTargets. */

   constructor() {
    super();
    setIsSetup('SentryPropagator');

    // We're caching results so we don't have to recompute regexp every time we create a request.
    this._urlMatchesTargetsMap = new LRUMap(100);
  }

  /**
   * @inheritDoc
   */
   inject(context, carrier, setter) {
    if (isTracingSuppressed(context)) {
      DEBUG_BUILD && debug.log('[Tracing] Not injecting trace data for url because tracing is suppressed.');
      return;
    }

    const activeSpan = trace.getSpan(context);
    const url = activeSpan && getCurrentURL(activeSpan);

    const { tracePropagationTargets, propagateTraceparent } = getClient()?.getOptions() || {};
    if (!shouldPropagateTraceForUrl(url, tracePropagationTargets, this._urlMatchesTargetsMap)) {
      DEBUG_BUILD &&
        debug.log('[Tracing] Not injecting trace data for url because it does not match tracePropagationTargets:', url);
      return;
    }

    const existingBaggageHeader = getExistingBaggage(carrier);
    let baggage = propagation.getBaggage(context) || propagation.createBaggage({});

    const { dynamicSamplingContext, traceId, spanId, sampled } = getInjectionData(context);

    if (existingBaggageHeader) {
      const baggageEntries = parseBaggageHeader(existingBaggageHeader);

      if (baggageEntries) {
        Object.entries(baggageEntries).forEach(([key, value]) => {
          baggage = baggage.setEntry(key, { value });
        });
      }
    }

    if (dynamicSamplingContext) {
      baggage = Object.entries(dynamicSamplingContext).reduce((b, [dscKey, dscValue]) => {
        if (dscValue) {
          return b.setEntry(`${SENTRY_BAGGAGE_KEY_PREFIX}${dscKey}`, { value: dscValue });
        }
        return b;
      }, baggage);
    }

    // We also want to avoid setting the default OTEL trace ID, if we get that for whatever reason
    if (traceId && traceId !== INVALID_TRACEID) {
      setter.set(carrier, SENTRY_TRACE_HEADER, generateSentryTraceHeader(traceId, spanId, sampled));

      if (propagateTraceparent) {
        setter.set(carrier, 'traceparent', generateTraceparentHeader(traceId, spanId, sampled));
      }
    }

    super.inject(propagation.setBaggage(context, baggage), carrier, setter);
  }

  /**
   * @inheritDoc
   */
   extract(context, carrier, getter) {
    const maybeSentryTraceHeader = getter.get(carrier, SENTRY_TRACE_HEADER);
    const baggage = getter.get(carrier, SENTRY_BAGGAGE_HEADER);

    const sentryTrace = maybeSentryTraceHeader
      ? Array.isArray(maybeSentryTraceHeader)
        ? maybeSentryTraceHeader[0]
        : maybeSentryTraceHeader
      : undefined;

    // Add remote parent span context
    // If there is no incoming trace, this will return the context as-is
    return ensureScopesOnContext(getContextWithRemoteActiveSpan(context, { sentryTrace, baggage }));
  }

  /**
   * @inheritDoc
   */
   fields() {
    return [SENTRY_TRACE_HEADER, SENTRY_BAGGAGE_HEADER, 'traceparent'];
  }
}

const NOT_PROPAGATED_MESSAGE =
  '[Tracing] Not injecting trace data for url because it does not match tracePropagationTargets:';

/**
 * Check if a given URL should be propagated to or not.
 * If no url is defined, or no trace propagation targets are defined, this will always return `true`.
 * You can also optionally provide a decision map, to cache decisions and avoid repeated regex lookups.
 */
function shouldPropagateTraceForUrl(
  url,
  tracePropagationTargets,
  decisionMap,
) {
  if (typeof url !== 'string' || !tracePropagationTargets) {
    return true;
  }

  const cachedDecision = decisionMap?.get(url);
  if (cachedDecision !== undefined) {
    DEBUG_BUILD && !cachedDecision && debug.log(NOT_PROPAGATED_MESSAGE, url);
    return cachedDecision;
  }

  const decision = stringMatchesSomePattern(url, tracePropagationTargets);
  decisionMap?.set(url, decision);

  DEBUG_BUILD && !decision && debug.log(NOT_PROPAGATED_MESSAGE, url);
  return decision;
}

/**
 * Get propagation injection data for the given context.
 * The additional options can be passed to override the scope and client that is otherwise derived from the context.
 */
function getInjectionData(
  context,
  options = {},
)

 {
  const span = trace.getSpan(context);

  // If we have a remote span, the spanId should be considered as the parentSpanId, not spanId itself
  // Instead, we use a virtual (generated) spanId for propagation
  if (span?.spanContext().isRemote) {
    const spanContext = span.spanContext();
    const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);

    return {
      dynamicSamplingContext,
      traceId: spanContext.traceId,
      spanId: undefined,
      sampled: getSamplingDecision(spanContext), // TODO: Do we need to change something here?
    };
  }

  // If we have a local span, we just use this
  if (span) {
    const spanContext = span.spanContext();
    const dynamicSamplingContext = getDynamicSamplingContextFromSpan(span);

    return {
      dynamicSamplingContext,
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
      sampled: getSamplingDecision(spanContext), // TODO: Do we need to change something here?
    };
  }

  // Else we try to use the propagation context from the scope
  // The only scenario where this should happen is when we neither have a span, nor an incoming trace
  const scope = options.scope || getScopesFromContext(context)?.scope || getCurrentScope();
  const client = options.client || getClient();

  const propagationContext = scope.getPropagationContext();
  const dynamicSamplingContext = client ? getDynamicSamplingContextFromScope(client, scope) : undefined;
  return {
    dynamicSamplingContext,
    traceId: propagationContext.traceId,
    spanId: propagationContext.propagationSpanId,
    sampled: propagationContext.sampled,
  };
}

function getContextWithRemoteActiveSpan(
  ctx,
  { sentryTrace, baggage },
) {
  const propagationContext = propagationContextFromHeaders(sentryTrace, baggage);

  const { traceId, parentSpanId, sampled, dsc } = propagationContext;

  const client = getClient();
  const incomingDsc = baggageHeaderToDynamicSamplingContext(baggage);

  // We only want to set the virtual span if we are continuing a concrete trace
  // Otherwise, we ignore the incoming trace here, e.g. if we have no trace headers
  if (!parentSpanId || (client && !shouldContinueTrace(client, incomingDsc?.org_id))) {
    return ctx;
  }

  const spanContext = generateRemoteSpanContext({
    traceId,
    spanId: parentSpanId,
    sampled,
    dsc,
  });

  return trace.setSpanContext(ctx, spanContext);
}

/**
 * Takes trace strings and propagates them as a remote active span.
 * This should be used in addition to `continueTrace` in OTEL-powered environments.
 */
function continueTraceAsRemoteSpan(
  ctx,
  options,
  callback,
) {
  const ctxWithSpanContext = ensureScopesOnContext(getContextWithRemoteActiveSpan(ctx, options));

  return context.with(ctxWithSpanContext, callback);
}

function ensureScopesOnContext(ctx) {
  // If there are no scopes yet on the context, ensure we have them
  const scopes = getScopesFromContext(ctx);
  const newScopes = {
    // If we have no scope here, this is most likely either the root context or a context manually derived from it
    // In this case, we want to fork the current scope, to ensure we do not pollute the root scope
    scope: scopes ? scopes.scope : getCurrentScope().clone(),
    isolationScope: scopes ? scopes.isolationScope : getIsolationScope(),
  };

  return setScopesOnContext(ctx, newScopes);
}

/** Try to get the existing baggage header so we can merge this in. */
function getExistingBaggage(carrier) {
  try {
    const baggage = (carrier )[SENTRY_BAGGAGE_HEADER];
    return Array.isArray(baggage) ? baggage.join(',') : baggage;
  } catch {
    return undefined;
  }
}

/**
 * It is pretty tricky to get access to the outgoing request URL of a request in the propagator.
 * As we only have access to the context of the span to be sent and the carrier (=headers),
 * but the span may be unsampled and thus have no attributes.
 *
 * So we use the following logic:
 * 1. If we have an active span, we check if it has a URL attribute.
 * 2. Else, if the active span has no URL attribute (e.g. it is unsampled), we check a special trace state (which we set in our sampler).
 */
function getCurrentURL(span) {
  const spanData = spanToJSON(span).data;
  // `ATTR_URL_FULL` is the new attribute, but we still support the old one, `SEMATTRS_HTTP_URL`, for now.
  // eslint-disable-next-line deprecation/deprecation
  const urlAttribute = spanData[SEMATTRS_HTTP_URL] || spanData[ATTR_URL_FULL];
  if (typeof urlAttribute === 'string') {
    return urlAttribute;
  }

  // Also look at the traceState, which we may set in the sampler even for unsampled spans
  const urlTraceState = span.spanContext().traceState?.get(SENTRY_TRACE_STATE_URL);
  if (urlTraceState) {
    return urlTraceState;
  }

  return undefined;
}

function generateRemoteSpanContext({
  spanId,
  traceId,
  sampled,
  dsc,
}

) {
  // We store the DSC as OTEL trace state on the span context
  const traceState = makeTraceState({
    dsc,
    sampled,
  });

  const spanContext = {
    traceId,
    spanId,
    isRemote: true,
    traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
    traceState,
  };

  return spanContext;
}

/**
 * Internal helper for starting spans and manual spans. See {@link startSpan} and {@link startSpanManual} for the public APIs.
 * @param options - The span context options
 * @param callback - The callback to execute with the span
 * @param autoEnd - Whether to automatically end the span after the callback completes
 */
function _startSpan(options, callback, autoEnd) {
  const tracer = getTracer();

  const { name, parentSpan: customParentSpan } = options;

  // If `options.parentSpan` is defined, we want to wrap the callback in `withActiveSpan`
  const wrapper = getActiveSpanWrapper(customParentSpan);

  return wrapper(() => {
    const activeCtx = getContext(options.scope, options.forceTransaction);
    const shouldSkipSpan = options.onlyIfParent && !trace.getSpan(activeCtx);
    const ctx = shouldSkipSpan ? suppressTracing$1(activeCtx) : activeCtx;

    const spanOptions = getSpanOptions(options);

    // If spans are not enabled, ensure we suppress tracing for the span creation
    // but preserve the original context for the callback execution
    // This ensures that we don't create spans when tracing is disabled which
    // would otherwise be a problem for users that don't enable tracing but use
    // custom OpenTelemetry setups.
    if (!hasSpansEnabled()) {
      const suppressedCtx = isTracingSuppressed(ctx) ? ctx : suppressTracing$1(ctx);

      return context.with(suppressedCtx, () => {
        return tracer.startActiveSpan(name, spanOptions, suppressedCtx, span => {
          // Restore the original unsuppressed context for the callback execution
          // so that custom OpenTelemetry spans maintain the correct context.
          // We use activeCtx (not ctx) because ctx may be suppressed when onlyIfParent is true
          // and no parent span exists. Using activeCtx ensures custom OTel spans are never
          // inadvertently suppressed.
          return context.with(activeCtx, () => {
            return handleCallbackErrors(
              () => callback(span),
              () => {
                // Only set the span status to ERROR when there wasn't any status set before, in order to avoid stomping useful span statuses
                if (spanToJSON(span).status === undefined) {
                  span.setStatus({ code: SpanStatusCode.ERROR });
                }
              },
              autoEnd ? () => span.end() : undefined,
            );
          });
        });
      });
    }

    return tracer.startActiveSpan(name, spanOptions, ctx, span => {
      return handleCallbackErrors(
        () => callback(span),
        () => {
          // Only set the span status to ERROR when there wasn't any status set before, in order to avoid stomping useful span statuses
          if (spanToJSON(span).status === undefined) {
            span.setStatus({ code: SpanStatusCode.ERROR });
          }
        },
        autoEnd ? () => span.end() : undefined,
      );
    });
  });
}

/**
 * Wraps a function with a transaction/span and finishes the span after the function is done.
 * The created span is the active span and will be used as parent by other spans created inside the function
 * and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
 *
 * If you want to create a span that is not set as active, use {@link startInactiveSpan}.
 *
 * You'll always get a span passed to the callback,
 * it may just be a non-recording span if the span is not sampled or if tracing is disabled.
 */
function startSpan(options, callback) {
  return _startSpan(options, callback, true);
}

/**
 * Similar to `Sentry.startSpan`. Wraps a function with a span, but does not finish the span
 * after the function is done automatically. You'll have to call `span.end()` or the `finish` function passed to the callback manually.
 *
 * The created span is the active span and will be used as parent by other spans created inside the function
 * and can be accessed via `Sentry.getActiveSpan()`, as long as the function is executed while the scope is active.
 *
 * You'll always get a span passed to the callback,
 * it may just be a non-recording span if the span is not sampled or if tracing is disabled.
 */
function startSpanManual(
  options,
  callback,
) {
  return _startSpan(options, span => callback(span, () => span.end()), false);
}

/**
 * Creates a span. This span is not set as active, so will not get automatic instrumentation spans
 * as children or be able to be accessed via `Sentry.getActiveSpan()`.
 *
 * If you want to create a span that is set as active, use {@link startSpan}.
 *
 * This function will always return a span,
 * it may just be a non-recording span if the span is not sampled or if tracing is disabled.
 */
function startInactiveSpan(options) {
  const tracer = getTracer();

  const { name, parentSpan: customParentSpan } = options;

  // If `options.parentSpan` is defined, we want to wrap the callback in `withActiveSpan`
  const wrapper = getActiveSpanWrapper(customParentSpan);

  return wrapper(() => {
    const activeCtx = getContext(options.scope, options.forceTransaction);
    const shouldSkipSpan = options.onlyIfParent && !trace.getSpan(activeCtx);
    let ctx = shouldSkipSpan ? suppressTracing$1(activeCtx) : activeCtx;

    const spanOptions = getSpanOptions(options);

    if (!hasSpansEnabled()) {
      ctx = isTracingSuppressed(ctx) ? ctx : suppressTracing$1(ctx);
    }

    return tracer.startSpan(name, spanOptions, ctx);
  });
}

/**
 * Forks the current scope and sets the provided span as active span in the context of the provided callback. Can be
 * passed `null` to start an entirely new span tree.
 *
 * @param span Spans started in the context of the provided callback will be children of this span. If `null` is passed,
 * spans started within the callback will be root spans.
 * @param callback Execution context in which the provided span will be active. Is passed the newly forked scope.
 * @returns the value returned from the provided callback function.
 */
function withActiveSpan(span, callback) {
  const newContextWithActiveSpan = span ? trace.setSpan(context.active(), span) : trace.deleteSpan(context.active());
  return context.with(newContextWithActiveSpan, () => callback(getCurrentScope()));
}

function getTracer() {
  const client = getClient();
  return client?.tracer || trace.getTracer('@sentry/opentelemetry', SDK_VERSION);
}

function getSpanOptions(options) {
  const { startTime, attributes, kind, op, links } = options;

  // OTEL expects timestamps in ms, not seconds
  const fixedStartTime = typeof startTime === 'number' ? ensureTimestampInMilliseconds(startTime) : startTime;

  return {
    attributes: op
      ? {
          [SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
          ...attributes,
        }
      : attributes,
    kind,
    links,
    startTime: fixedStartTime,
  };
}

function ensureTimestampInMilliseconds(timestamp) {
  const isMs = timestamp < 9999999999;
  return isMs ? timestamp * 1000 : timestamp;
}

function getContext(scope, forceTransaction) {
  const ctx = getContextForScope(scope);
  const parentSpan = trace.getSpan(ctx);

  // In the case that we have no parent span, we start a new trace
  // Note that if we continue a trace, we'll always have a remote parent span here anyhow
  if (!parentSpan) {
    return ctx;
  }

  // If we don't want to force a transaction, and we have a parent span, all good, we just return as-is!
  if (!forceTransaction) {
    return ctx;
  }

  // Else, if we do have a parent span but want to force a transaction, we have to simulate a "root" context

  // Else, we need to do two things:
  // 1. Unset the parent span from the context, so we'll create a new root span
  // 2. Ensure the propagation context is correct, so we'll continue from the parent span
  const ctxWithoutSpan = trace.deleteSpan(ctx);

  const { spanId, traceId } = parentSpan.spanContext();
  const sampled = getSamplingDecision(parentSpan.spanContext());

  // In this case, when we are forcing a transaction, we want to treat this like continuing an incoming trace
  // so we set the traceState according to the root span
  const rootSpan = getRootSpan(parentSpan);
  const dsc = getDynamicSamplingContextFromSpan(rootSpan);

  const traceState = makeTraceState({
    dsc,
    sampled,
  });

  const spanOptions = {
    traceId,
    spanId,
    isRemote: true,
    traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
    traceState,
  };

  const ctxWithSpanContext = trace.setSpanContext(ctxWithoutSpan, spanOptions);

  return ctxWithSpanContext;
}

function getContextForScope(scope) {
  if (scope) {
    const ctx = getContextFromScope(scope);
    if (ctx) {
      return ctx;
    }
  }

  return context.active();
}

/**
 * Continue a trace from `sentry-trace` and `baggage` values.
 * These values can be obtained from incoming request headers, or in the browser from `<meta name="sentry-trace">`
 * and `<meta name="baggage">` HTML tags.
 *
 * Spans started with `startSpan`, `startSpanManual` and `startInactiveSpan`, within the callback will automatically
 * be attached to the incoming trace.
 *
 * This is a custom version of `continueTrace` that is used in OTEL-powered environments.
 * It propagates the trace as a remote span, in addition to setting it on the propagation context.
 */
function continueTrace(options, callback) {
  return continueTraceAsRemoteSpan(context.active(), options, callback);
}

/**
 * Get the trace context for a given scope.
 * We have a custom implementation here because we need an OTEL-specific way to get the span from a scope.
 */
function getTraceContextForScope(
  client,
  scope,
) {
  const ctx = getContextFromScope(scope);
  const span = ctx && trace.getSpan(ctx);

  const traceContext = span ? spanToTraceContext(span) : getTraceContextFromScope(scope);

  const dynamicSamplingContext = span
    ? getDynamicSamplingContextFromSpan(span)
    : getDynamicSamplingContextFromScope(client, scope);
  return [dynamicSamplingContext, traceContext];
}

function getActiveSpanWrapper(parentSpan) {
  return parentSpan !== undefined
    ? (callback) => {
        return withActiveSpan(parentSpan, callback);
      }
    : (callback) => callback();
}

/** Suppress tracing in the given callback, ensuring no spans are generated inside of it. */
function suppressTracing(callback) {
  const ctx = suppressTracing$1(context.active());
  return context.with(ctx, callback);
}

/** Ensure the `trace` context is set on all events. */
function setupEventContextTrace(client) {
  client.on('preprocessEvent', event => {
    const span = getActiveSpan();
    // For transaction events, this is handled separately
    // Because the active span may not be the span that is actually the transaction event
    if (!span || event.type === 'transaction') {
      return;
    }

    // If event has already set `trace` context, use that one.
    event.contexts = {
      trace: spanToTraceContext(span),
      ...event.contexts,
    };

    const rootSpan = getRootSpan(span);

    event.sdkProcessingMetadata = {
      dynamicSamplingContext: getDynamicSamplingContextFromSpan(rootSpan),
      ...event.sdkProcessingMetadata,
    };

    return event;
  });
}

/**
 * Otel-specific implementation of `getTraceData`.
 * @see `@sentry/core` version of `getTraceData` for more information
 */
function getTraceData({
  span,
  scope,
  client,
  propagateTraceparent,
} = {}) {
  let ctx = (scope && getContextFromScope(scope)) ?? api.context.active();

  if (span) {
    const { scope } = getCapturedScopesOnSpan(span);
    // fall back to current context if for whatever reason we can't find the one of the span
    ctx = (scope && getContextFromScope(scope)) || api.trace.setSpan(api.context.active(), span);
  }

  const { traceId, spanId, sampled, dynamicSamplingContext } = getInjectionData(ctx, { scope, client });

  const traceData = {
    'sentry-trace': generateSentryTraceHeader(traceId, spanId, sampled),
    baggage: dynamicSamplingContextToSentryBaggageHeader(dynamicSamplingContext),
  };

  if (propagateTraceparent) {
    traceData.traceparent = generateTraceparentHeader(traceId, spanId, sampled);
  }

  return traceData;
}

/**
 * Sets the async context strategy to use follow the OTEL context under the hood.
 * We handle forking a hub inside of our custom OTEL Context Manager (./otelContextManager.ts)
 */
function setOpenTelemetryContextAsyncContextStrategy() {
  function getScopes() {
    const ctx = api.context.active();
    const scopes = getScopesFromContext(ctx);

    if (scopes) {
      return scopes;
    }

    // fallback behavior:
    // if, for whatever reason, we can't find scopes on the context here, we have to fix this somehow
    return {
      scope: getDefaultCurrentScope(),
      isolationScope: getDefaultIsolationScope(),
    };
  }

  function withScope(callback) {
    const ctx = api.context.active();

    // We depend on the otelContextManager to handle the context/hub
    // We set the `SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY` context value, which is picked up by
    // the OTEL context manager, which uses the presence of this key to determine if it should
    // fork the isolation scope, or not
    // as by default, we don't want to fork this, unless triggered explicitly by `withScope`
    return api.context.with(ctx, () => {
      return callback(getCurrentScope());
    });
  }

  function withSetScope(scope, callback) {
    const ctx = getContextFromScope(scope) || api.context.active();

    // We depend on the otelContextManager to handle the context/hub
    // We set the `SENTRY_FORK_SET_SCOPE_CONTEXT_KEY` context value, which is picked up by
    // the OTEL context manager, which picks up this scope as the current scope
    return api.context.with(ctx.setValue(SENTRY_FORK_SET_SCOPE_CONTEXT_KEY, scope), () => {
      return callback(scope);
    });
  }

  function withIsolationScope(callback) {
    const ctx = api.context.active();

    // We depend on the otelContextManager to handle the context/hub
    // We set the `SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY` context value, which is picked up by
    // the OTEL context manager, which uses the presence of this key to determine if it should
    // fork the isolation scope, or not
    return api.context.with(ctx.setValue(SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY, true), () => {
      return callback(getIsolationScope());
    });
  }

  function withSetIsolationScope(isolationScope, callback) {
    const ctx = api.context.active();

    // We depend on the otelContextManager to handle the context/hub
    // We set the `SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY` context value, which is picked up by
    // the OTEL context manager, which uses the presence of this key to determine if it should
    // fork the isolation scope, or not
    return api.context.with(ctx.setValue(SENTRY_FORK_SET_ISOLATION_SCOPE_CONTEXT_KEY, isolationScope), () => {
      return callback(getIsolationScope());
    });
  }

  function getCurrentScope() {
    return getScopes().scope;
  }

  function getIsolationScope() {
    return getScopes().isolationScope;
  }

  setAsyncContextStrategy({
    withScope,
    withSetScope,
    withSetIsolationScope,
    withIsolationScope,
    getCurrentScope,
    getIsolationScope,
    startSpan,
    startSpanManual,
    startInactiveSpan,
    getActiveSpan,
    suppressTracing,
    getTraceData,
    continueTrace,
    // The types here don't fully align, because our own `Span` type is narrower
    // than the OTEL one - but this is OK for here, as we now we'll only have OTEL spans passed around
    withActiveSpan: withActiveSpan ,
  });
}

/**
 * Wrap an OpenTelemetry ContextManager in a way that ensures the context is kept in sync with the Sentry Scope.
 *
 * Usage:
 * import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
 * const SentryContextManager = wrapContextManagerClass(AsyncLocalStorageContextManager);
 * const contextManager = new SentryContextManager();
 */
function wrapContextManagerClass(
  ContextManagerClass,
) {
  /**
   * This is a custom ContextManager for OpenTelemetry, which extends the default AsyncLocalStorageContextManager.
   * It ensures that we create new scopes per context, so that the OTEL Context & the Sentry Scope are always in sync.
   *
   * Note that we currently only support AsyncHooks with this,
   * but since this should work for Node 14+ anyhow that should be good enough.
   */

  // @ts-expect-error TS does not like this, but we know this is fine
  class SentryContextManager extends ContextManagerClass {
     constructor(...args) {
      super(...args);
      setIsSetup('SentryContextManager');
    }
    /**
     * Overwrite with() of the original AsyncLocalStorageContextManager
     * to ensure we also create new scopes per context.
     */
     with(
      context,
      fn,
      thisArg,
      ...args
    ) {
      const currentScopes = getScopesFromContext(context);
      const currentScope = currentScopes?.scope || getCurrentScope();
      const currentIsolationScope = currentScopes?.isolationScope || getIsolationScope();

      const shouldForkIsolationScope = context.getValue(SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY) === true;
      const scope = context.getValue(SENTRY_FORK_SET_SCOPE_CONTEXT_KEY) ;
      const isolationScope = context.getValue(SENTRY_FORK_SET_ISOLATION_SCOPE_CONTEXT_KEY) ;

      const newCurrentScope = scope || currentScope.clone();
      const newIsolationScope =
        isolationScope || (shouldForkIsolationScope ? currentIsolationScope.clone() : currentIsolationScope);
      const scopes = { scope: newCurrentScope, isolationScope: newIsolationScope };

      const ctx1 = setScopesOnContext(context, scopes);

      // Remove the unneeded values again
      const ctx2 = ctx1
        .deleteValue(SENTRY_FORK_ISOLATION_SCOPE_CONTEXT_KEY)
        .deleteValue(SENTRY_FORK_SET_SCOPE_CONTEXT_KEY)
        .deleteValue(SENTRY_FORK_SET_ISOLATION_SCOPE_CONTEXT_KEY);

      setContextOnScope(newCurrentScope, ctx2);

      return super.with(ctx2, fn, thisArg, ...args);
    }

    /**
     * Gets underlying AsyncLocalStorage and symbol to allow lookup of scope.
     */
     getAsyncLocalStorageLookup() {
      return {
        // @ts-expect-error This is on the base class, but not part of the interface
        asyncLocalStorage: this._asyncLocalStorage,
        contextSymbol: SENTRY_SCOPES_CONTEXT_KEY,
      };
    }
  }

  return SentryContextManager ;
}

/**
 * This function runs through a list of OTEL Spans, and wraps them in an `SpanNode`
 * where each node holds a reference to their parent node.
 */
function groupSpansWithParents(spans) {
  const nodeMap = new Map();

  for (const span of spans) {
    createOrUpdateSpanNodeAndRefs(nodeMap, span);
  }

  return Array.from(nodeMap, function ([_id, spanNode]) {
    return spanNode;
  });
}

/**
 * This returns the _local_ parent ID - `parentId` on the span may point to a remote span.
 */
function getLocalParentId(span) {
  const parentIsRemote = span.attributes[SEMANTIC_ATTRIBUTE_SENTRY_PARENT_IS_REMOTE] === true;
  // If the parentId is the trace parent ID, we pretend it's undefined
  // As this means the parent exists somewhere else
  return !parentIsRemote ? getParentSpanId(span) : undefined;
}

function createOrUpdateSpanNodeAndRefs(nodeMap, span) {
  const id = span.spanContext().spanId;
  const parentId = getLocalParentId(span);

  if (!parentId) {
    createOrUpdateNode(nodeMap, { id, span, children: [] });
    return;
  }

  // Else make sure to create parent node as well
  // Note that the parent may not know it's parent _yet_, this may be updated in a later pass
  const parentNode = createOrGetParentNode(nodeMap, parentId);
  const node = createOrUpdateNode(nodeMap, { id, span, parentNode, children: [] });
  parentNode.children.push(node);
}

function createOrGetParentNode(nodeMap, id) {
  const existing = nodeMap.get(id);

  if (existing) {
    return existing;
  }

  return createOrUpdateNode(nodeMap, { id, children: [] });
}

function createOrUpdateNode(nodeMap, spanNode) {
  const existing = nodeMap.get(spanNode.id);

  // If span is already set, nothing to do here
  if (existing?.span) {
    return existing;
  }

  // If it exists but span is not set yet, we update it
  if (existing && !existing.span) {
    existing.span = spanNode.span;
    existing.parentNode = spanNode.parentNode;
    return existing;
  }

  // Else, we create a new one...
  nodeMap.set(spanNode.id, spanNode);
  return spanNode;
}

// canonicalCodesGrpcMap maps some GRPC codes to Sentry's span statuses. See description in grpc documentation.
const canonicalGrpcErrorCodesMap = {
  '1': 'cancelled',
  '2': 'unknown_error',
  '3': 'invalid_argument',
  '4': 'deadline_exceeded',
  '5': 'not_found',
  '6': 'already_exists',
  '7': 'permission_denied',
  '8': 'resource_exhausted',
  '9': 'failed_precondition',
  '10': 'aborted',
  '11': 'out_of_range',
  '12': 'unimplemented',
  '13': 'internal_error',
  '14': 'unavailable',
  '15': 'data_loss',
  '16': 'unauthenticated',
} ;

const isStatusErrorMessageValid = (message) => {
  return Object.values(canonicalGrpcErrorCodesMap).includes(message );
};

/**
 * Get a Sentry span status from an otel span.
 */
function mapStatus(span) {
  const attributes = spanHasAttributes(span) ? span.attributes : {};
  const status = spanHasStatus(span) ? span.status : undefined;

  if (status) {
    // Since span status OK is not set by default, we give it priority: https://opentelemetry.io/docs/concepts/signals/traces/#span-status
    if (status.code === SpanStatusCode.OK) {
      return { code: SPAN_STATUS_OK };
      // If the span is already marked as erroneous we return that exact status
    } else if (status.code === SpanStatusCode.ERROR) {
      if (typeof status.message === 'undefined') {
        const inferredStatus = inferStatusFromAttributes(attributes);
        if (inferredStatus) {
          return inferredStatus;
        }
      }

      if (status.message && isStatusErrorMessageValid(status.message)) {
        return { code: SPAN_STATUS_ERROR, message: status.message };
      } else {
        return { code: SPAN_STATUS_ERROR, message: 'internal_error' };
      }
    }
  }

  // If the span status is UNSET, we try to infer it from HTTP or GRPC status codes.
  const inferredStatus = inferStatusFromAttributes(attributes);

  if (inferredStatus) {
    return inferredStatus;
  }

  // We default to setting the spans status to ok.
  if (status?.code === SpanStatusCode.UNSET) {
    return { code: SPAN_STATUS_OK };
  } else {
    return { code: SPAN_STATUS_ERROR, message: 'unknown_error' };
  }
}

function inferStatusFromAttributes(attributes) {
  // If the span status is UNSET, we try to infer it from HTTP or GRPC status codes.

  // eslint-disable-next-line deprecation/deprecation
  const httpCodeAttribute = attributes[ATTR_HTTP_RESPONSE_STATUS_CODE] || attributes[SEMATTRS_HTTP_STATUS_CODE];
  // eslint-disable-next-line deprecation/deprecation
  const grpcCodeAttribute = attributes[SEMATTRS_RPC_GRPC_STATUS_CODE];

  const numberHttpCode =
    typeof httpCodeAttribute === 'number'
      ? httpCodeAttribute
      : typeof httpCodeAttribute === 'string'
        ? parseInt(httpCodeAttribute)
        : undefined;

  if (typeof numberHttpCode === 'number') {
    return getSpanStatusFromHttpCode(numberHttpCode);
  }

  if (typeof grpcCodeAttribute === 'string') {
    return { code: SPAN_STATUS_ERROR, message: canonicalGrpcErrorCodesMap[grpcCodeAttribute] || 'unknown_error' };
  }

  return undefined;
}

const MAX_SPAN_COUNT = 1000;
const DEFAULT_TIMEOUT = 300; // 5 min

/**
 * A Sentry-specific exporter that converts OpenTelemetry Spans to Sentry Spans & Transactions.
 */
class SentrySpanExporter {
  /*
   * A quick explanation on the buckets: We do bucketing of finished spans for efficiency. This span exporter is
   * accumulating spans until a root span is encountered and then it flushes all the spans that are descendants of that
   * root span. Because it is totally in the realm of possibilities that root spans are never finished, and we don't
   * want to accumulate spans indefinitely in memory, we need to periodically evacuate spans. Naively we could simply
   * store the spans in an array and each time a new span comes in we could iterate through the entire array and
   * evacuate all spans that have an end-timestamp that is older than our limit. This could get quite expensive because
   * we would have to iterate a potentially large number of spans every time we evacuate. We want to avoid these large
   * bursts of computation.
   *
   * Instead we go for a bucketing approach and put spans into buckets, based on what second
   * (modulo the time limit) the span was put into the exporter. With buckets, when we decide to evacuate, we can
   * iterate through the bucket entries instead, which have an upper bound of items, making the evacuation much more
   * efficient. Cleaning up also becomes much more efficient since it simply involves de-referencing a bucket within the
   * bucket array, and letting garbage collection take care of the rest.
   */

  // Essentially a a set of span ids that are already sent. The values are expiration
  // times in this cache so we don't hold onto them indefinitely.

  /* Internally, we use a debounced flush to give some wiggle room to the span processor to accumulate more spans. */

   constructor(options

) {
    this._finishedSpanBucketSize = options?.timeout || DEFAULT_TIMEOUT;
    this._finishedSpanBuckets = new Array(this._finishedSpanBucketSize).fill(undefined);
    this._lastCleanupTimestampInS = Math.floor(_INTERNAL_safeDateNow() / 1000);
    this._spansToBucketEntry = new WeakMap();
    this._sentSpans = new Map();
    this._debouncedFlush = debounce(this.flush.bind(this), 1, { maxWait: 100 });
  }

  /**
   * Export a single span.
   * This is called by the span processor whenever a span is ended.
   */
   export(span) {
    const currentTimestampInS = Math.floor(_INTERNAL_safeDateNow() / 1000);

    if (this._lastCleanupTimestampInS !== currentTimestampInS) {
      let droppedSpanCount = 0;
      this._finishedSpanBuckets.forEach((bucket, i) => {
        if (bucket && bucket.timestampInS <= currentTimestampInS - this._finishedSpanBucketSize) {
          droppedSpanCount += bucket.spans.size;
          this._finishedSpanBuckets[i] = undefined;
        }
      });
      if (droppedSpanCount > 0) {
        DEBUG_BUILD &&
          debug.log(
            `SpanExporter dropped ${droppedSpanCount} spans because they were pending for more than ${this._finishedSpanBucketSize} seconds.`,
          );
      }
      this._lastCleanupTimestampInS = currentTimestampInS;
    }

    const currentBucketIndex = currentTimestampInS % this._finishedSpanBucketSize;
    const currentBucket = this._finishedSpanBuckets[currentBucketIndex] || {
      timestampInS: currentTimestampInS,
      spans: new Set(),
    };
    this._finishedSpanBuckets[currentBucketIndex] = currentBucket;
    currentBucket.spans.add(span);
    this._spansToBucketEntry.set(span, currentBucket);

    // If the span doesn't have a local parent ID (it's a root span), we're gonna flush all the ended spans
    const localParentId = getLocalParentId(span);
    if (!localParentId || this._sentSpans.has(localParentId)) {
      this._debouncedFlush();
    }
  }

  /**
   * Try to flush any pending spans immediately.
   * This is called internally by the exporter (via _debouncedFlush),
   * but can also be triggered externally if we force-flush.
   */
   flush() {
    const finishedSpans = this._finishedSpanBuckets.flatMap(bucket => (bucket ? Array.from(bucket.spans) : []));

    this._flushSentSpanCache();
    const sentSpans = this._maybeSend(finishedSpans);

    const sentSpanCount = sentSpans.size;
    const remainingOpenSpanCount = finishedSpans.length - sentSpanCount;
    DEBUG_BUILD &&
      debug.log(
        `SpanExporter exported ${sentSpanCount} spans, ${remainingOpenSpanCount} spans are waiting for their parent spans to finish`,
      );

    const expirationDate = _INTERNAL_safeDateNow() + DEFAULT_TIMEOUT * 1000;

    for (const span of sentSpans) {
      this._sentSpans.set(span.spanContext().spanId, expirationDate);
      const bucketEntry = this._spansToBucketEntry.get(span);
      if (bucketEntry) {
        bucketEntry.spans.delete(span);
      }
    }
    // Cancel a pending debounced flush, if there is one
    // This can be relevant if we directly flush, circumventing the debounce
    // in that case, we want to cancel any pending debounced flush
    this._debouncedFlush.cancel();
  }

  /**
   * Clear the exporter.
   * This is called when the span processor is shut down.
   */
   clear() {
    this._finishedSpanBuckets = this._finishedSpanBuckets.fill(undefined);
    this._sentSpans.clear();
    this._debouncedFlush.cancel();
  }

  /**
   * Send the given spans, but only if they are part of a finished transaction.
   *
   * Returns the sent spans.
   * Spans remain unsent when their parent span is not yet finished.
   * This will happen regularly, as child spans are generally finished before their parents.
   * But it _could_ also happen because, for whatever reason, a parent span was lost.
   * In this case, we'll eventually need to clean this up.
   */
   _maybeSend(spans) {
    const grouped = groupSpansWithParents(spans);
    const sentSpans = new Set();

    const rootNodes = this._getCompletedRootNodes(grouped);

    for (const root of rootNodes) {
      const span = root.span;
      sentSpans.add(span);
      const transactionEvent = createTransactionForOtelSpan(span);

      // Add an attribute to the transaction event to indicate that this transaction is an orphaned transaction
      if (root.parentNode && this._sentSpans.has(root.parentNode.id)) {
        const traceData = transactionEvent.contexts?.trace?.data;
        if (traceData) {
          traceData['sentry.parent_span_already_sent'] = true;
        }
      }

      // We'll recursively add all the child spans to this array
      const spans = transactionEvent.spans || [];

      for (const child of root.children) {
        createAndFinishSpanForOtelSpan(child, spans, sentSpans);
      }

      // spans.sort() mutates the array, but we do not use this anymore after this point
      // so we can safely mutate it here
      transactionEvent.spans =
        spans.length > MAX_SPAN_COUNT
          ? spans.sort((a, b) => a.start_timestamp - b.start_timestamp).slice(0, MAX_SPAN_COUNT)
          : spans;

      const measurements = timedEventsToMeasurements(span.events);
      if (measurements) {
        transactionEvent.measurements = measurements;
      }

      captureEvent(transactionEvent);
    }

    return sentSpans;
  }

  /** Remove "expired" span id entries from the _sentSpans cache. */
   _flushSentSpanCache() {
    const currentTimestamp = _INTERNAL_safeDateNow();
    // Note, it is safe to delete items from the map as we go: https://stackoverflow.com/a/35943995/90297
    for (const [spanId, expirationTime] of this._sentSpans.entries()) {
      if (expirationTime <= currentTimestamp) {
        this._sentSpans.delete(spanId);
      }
    }
  }

  /** Check if a node is a completed root node or a node whose parent has already been sent */
   _nodeIsCompletedRootNodeOrHasSentParent(node) {
    return !!node.span && (!node.parentNode || this._sentSpans.has(node.parentNode.id));
  }

  /** Get all completed root nodes from a list of nodes */
   _getCompletedRootNodes(nodes) {
    // TODO: We should be able to remove the explicit `node is SpanNodeCompleted` type guard
    //       once we stop supporting TS < 5.5
    return nodes.filter((node) => this._nodeIsCompletedRootNodeOrHasSentParent(node));
  }
}

function parseSpan(span) {
  const attributes = span.attributes;

  const origin = attributes[SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN] ;
  const op = attributes[SEMANTIC_ATTRIBUTE_SENTRY_OP] ;
  const source = attributes[SEMANTIC_ATTRIBUTE_SENTRY_SOURCE] ;

  return { origin, op, source };
}

/** Exported only for tests. */
function createTransactionForOtelSpan(span) {
  const { op, description, data, origin = 'manual', source } = getSpanData(span);
  const capturedSpanScopes = getCapturedScopesOnSpan(span );

  const sampleRate = span.attributes[SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE] ;

  const attributes = {
    [SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: source,
    [SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE]: sampleRate,
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: origin,
    ...data,
    ...removeSentryAttributes(span.attributes),
  };

  const { links } = span;
  const { traceId: trace_id, spanId: span_id } = span.spanContext();

  // If parentSpanIdFromTraceState is defined at all, we want it to take precedence
  // In that case, an empty string should be interpreted as "no parent span id",
  // even if `span.parentSpanId` is set
  // this is the case when we are starting a new trace, where we have a virtual span based on the propagationContext
  // We only want to continue the traceId in this case, but ignore the parent span
  const parent_span_id = getParentSpanId(span);

  const status = mapStatus(span);

  const traceContext = {
    parent_span_id,
    span_id,
    trace_id,
    data: attributes,
    origin,
    op,
    status: getStatusMessage(status), // As per protocol, span status is allowed to be undefined
    links: convertSpanLinksForEnvelope(links),
  };

  const statusCode = attributes[ATTR_HTTP_RESPONSE_STATUS_CODE];
  const responseContext = typeof statusCode === 'number' ? { response: { status_code: statusCode } } : undefined;

  const transactionEvent = {
    contexts: {
      trace: traceContext,
      otel: {
        resource: span.resource.attributes,
      },
      ...responseContext,
    },
    spans: [],
    start_timestamp: spanTimeInputToSeconds(span.startTime),
    timestamp: spanTimeInputToSeconds(span.endTime),
    transaction: description,
    type: 'transaction',
    sdkProcessingMetadata: {
      capturedSpanScope: capturedSpanScopes.scope,
      capturedSpanIsolationScope: capturedSpanScopes.isolationScope,
      sampleRate,
      dynamicSamplingContext: getDynamicSamplingContextFromSpan(span ),
    },
    ...(source && {
      transaction_info: {
        source,
      },
    }),
  };

  return transactionEvent;
}

function createAndFinishSpanForOtelSpan(node, spans, sentSpans) {
  const span = node.span;

  if (span) {
    sentSpans.add(span);
  }

  const shouldDrop = !span;

  // If this span should be dropped, we still want to create spans for the children of this
  if (shouldDrop) {
    node.children.forEach(child => {
      createAndFinishSpanForOtelSpan(child, spans, sentSpans);
    });
    return;
  }

  const span_id = span.spanContext().spanId;
  const trace_id = span.spanContext().traceId;
  const parentSpanId = getParentSpanId(span);

  const { attributes, startTime, endTime, links } = span;

  const { op, description, data, origin = 'manual' } = getSpanData(span);
  const allData = {
    [SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN]: origin,
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: op,
    ...removeSentryAttributes(attributes),
    ...data,
  };

  const status = mapStatus(span);

  const spanJSON = {
    span_id,
    trace_id,
    data: allData,
    description,
    parent_span_id: parentSpanId,
    start_timestamp: spanTimeInputToSeconds(startTime),
    // This is [0,0] by default in OTEL, in which case we want to interpret this as no end time
    timestamp: spanTimeInputToSeconds(endTime) || undefined,
    status: getStatusMessage(status), // As per protocol, span status is allowed to be undefined
    op,
    origin,
    measurements: timedEventsToMeasurements(span.events),
    links: convertSpanLinksForEnvelope(links),
  };

  spans.push(spanJSON);

  node.children.forEach(child => {
    createAndFinishSpanForOtelSpan(child, spans, sentSpans);
  });
}

function getSpanData(span)

 {
  const { op: definedOp, source: definedSource, origin } = parseSpan(span);
  const { op: inferredOp, description, source: inferredSource, data: inferredData } = parseSpanDescription(span);

  const op = definedOp || inferredOp;
  const source = definedSource || inferredSource;

  const data = { ...inferredData, ...getData(span) };

  return {
    op,
    description,
    source,
    origin,
    data,
  };
}

/**
 * Remove custom `sentry.` attributes we do not need to send.
 * These are more carrier attributes we use inside of the SDK, we do not need to send them to the API.
 */
function removeSentryAttributes(data) {
  const cleanedData = { ...data };

  /* eslint-disable @typescript-eslint/no-dynamic-delete */
  delete cleanedData[SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE];
  delete cleanedData[SEMANTIC_ATTRIBUTE_SENTRY_PARENT_IS_REMOTE];
  delete cleanedData[SEMANTIC_ATTRIBUTE_SENTRY_CUSTOM_SPAN_NAME];
  /* eslint-enable @typescript-eslint/no-dynamic-delete */

  return cleanedData;
}

function getData(span) {
  const attributes = span.attributes;
  const data = {};

  if (span.kind !== SpanKind.INTERNAL) {
    data['otel.kind'] = SpanKind[span.kind];
  }

  // eslint-disable-next-line deprecation/deprecation
  const maybeHttpStatusCodeAttribute = attributes[SEMATTRS_HTTP_STATUS_CODE];
  if (maybeHttpStatusCodeAttribute) {
    data[ATTR_HTTP_RESPONSE_STATUS_CODE] = maybeHttpStatusCodeAttribute ;
  }

  const requestData = getRequestSpanData(span);

  if (requestData.url) {
    data.url = requestData.url;
  }

  if (requestData['http.query']) {
    data['http.query'] = requestData['http.query'].slice(1);
  }
  if (requestData['http.fragment']) {
    data['http.fragment'] = requestData['http.fragment'].slice(1);
  }

  return data;
}

function onSpanStart(span, parentContext) {
  // This is a reliable way to get the parent span - because this is exactly how the parent is identified in the OTEL SDK
  const parentSpan = trace.getSpan(parentContext);

  let scopes = getScopesFromContext(parentContext);

  // We need access to the parent span in order to be able to move up the span tree for breadcrumbs
  if (parentSpan && !parentSpan.spanContext().isRemote) {
    addChildSpanToSpan(parentSpan, span);
  }

  // We need this in the span exporter
  if (parentSpan?.spanContext().isRemote) {
    span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_PARENT_IS_REMOTE, true);
  }

  // The root context does not have scopes stored, so we check for this specifically
  // As fallback we attach the global scopes
  if (parentContext === ROOT_CONTEXT) {
    scopes = {
      scope: getDefaultCurrentScope(),
      isolationScope: getDefaultIsolationScope(),
    };
  }

  // We need the scope at time of span creation in order to apply it to the event when the span is finished
  if (scopes) {
    setCapturedScopesOnSpan(span, scopes.scope, scopes.isolationScope);
  }

  logSpanStart(span);

  const client = getClient();
  client?.emit('spanStart', span);
}

function onSpanEnd(span) {
  logSpanEnd(span);

  const client = getClient();
  client?.emit('spanEnd', span);
}

/**
 * Converts OpenTelemetry Spans to Sentry Spans and sends them to Sentry via
 * the Sentry SDK.
 */
class SentrySpanProcessor  {

   constructor(options) {
    setIsSetup('SentrySpanProcessor');
    this._exporter = new SentrySpanExporter(options);
  }

  /**
   * @inheritDoc
   */
   async forceFlush() {
    this._exporter.flush();
  }

  /**
   * @inheritDoc
   */
   async shutdown() {
    this._exporter.clear();
  }

  /**
   * @inheritDoc
   */
   onStart(span, parentContext) {
    onSpanStart(span, parentContext);
  }

  /** @inheritDoc */
   onEnd(span) {
    onSpanEnd(span);

    this._exporter.export(span);
  }
}

/**
 * A custom OTEL sampler that uses Sentry sampling rates to make its decision
 */
class SentrySampler  {

   constructor(client) {
    this._client = client;
    setIsSetup('SentrySampler');
  }

  /** @inheritDoc */
   shouldSample(
    context,
    traceId,
    spanName,
    spanKind,
    spanAttributes,
    _links,
  ) {
    const options = this._client.getOptions();

    const parentSpan = getValidSpan(context);
    const parentContext = parentSpan?.spanContext();

    if (!hasSpansEnabled(options)) {
      return wrapSamplingDecision({ decision: undefined, context, spanAttributes });
    }

    // `ATTR_HTTP_REQUEST_METHOD` is the new attribute, but we still support the old one, `SEMATTRS_HTTP_METHOD`, for now.
    // eslint-disable-next-line deprecation/deprecation
    const maybeSpanHttpMethod = spanAttributes[SEMATTRS_HTTP_METHOD] || spanAttributes[ATTR_HTTP_REQUEST_METHOD];

    // If we have a http.client span that has no local parent, we never want to sample it
    // but we want to leave downstream sampling decisions up to the server
    if (spanKind === SpanKind.CLIENT && maybeSpanHttpMethod && (!parentSpan || parentContext?.isRemote)) {
      return wrapSamplingDecision({ decision: undefined, context, spanAttributes });
    }

    const parentSampled = parentSpan ? getParentSampled(parentSpan, traceId, spanName) : undefined;
    const isRootSpan = !parentSpan || parentContext?.isRemote;

    // We only sample based on parameters (like tracesSampleRate or tracesSampler) for root spans (which is done in sampleSpan).
    // Non-root-spans simply inherit the sampling decision from their parent.
    if (!isRootSpan) {
      return wrapSamplingDecision({
        decision: parentSampled ? SamplingDecision.RECORD_AND_SAMPLED : SamplingDecision.NOT_RECORD,
        context,
        spanAttributes,
      });
    }

    // We want to pass the inferred name & attributes to the sampler method
    const {
      description: inferredSpanName,
      data: inferredAttributes,
      op,
    } = inferSpanData(spanName, spanAttributes, spanKind);

    const mergedAttributes = {
      ...inferredAttributes,
      ...spanAttributes,
    };

    if (op) {
      mergedAttributes[SEMANTIC_ATTRIBUTE_SENTRY_OP] = op;
    }

    const mutableSamplingDecision = { decision: true };
    this._client.emit(
      'beforeSampling',
      {
        spanAttributes: mergedAttributes,
        spanName: inferredSpanName,
        parentSampled: parentSampled,
        parentContext: parentContext,
      },
      mutableSamplingDecision,
    );
    if (!mutableSamplingDecision.decision) {
      return wrapSamplingDecision({ decision: undefined, context, spanAttributes });
    }

    const { isolationScope } = getScopesFromContext(context) ?? {};

    const dscString = parentContext?.traceState ? parentContext.traceState.get(SENTRY_TRACE_STATE_DSC) : undefined;
    const dsc = dscString ? baggageHeaderToDynamicSamplingContext(dscString) : undefined;

    const sampleRand = parseSampleRate(dsc?.sample_rand) ?? _INTERNAL_safeMathRandom();

    const [sampled, sampleRate, localSampleRateWasApplied] = sampleSpan(
      options,
      {
        name: inferredSpanName,
        attributes: mergedAttributes,
        normalizedRequest: isolationScope?.getScopeData().sdkProcessingMetadata.normalizedRequest,
        parentSampled,
        parentSampleRate: parseSampleRate(dsc?.sample_rate),
      },
      sampleRand,
    );

    const method = `${maybeSpanHttpMethod}`.toUpperCase();
    if (method === 'OPTIONS' || method === 'HEAD') {
      DEBUG_BUILD && debug.log(`[Tracing] Not sampling span because HTTP method is '${method}' for ${spanName}`);

      return wrapSamplingDecision({
        decision: SamplingDecision.NOT_RECORD,
        context,
        spanAttributes,
        sampleRand,
        downstreamTraceSampleRate: 0, // we don't want to sample anything in the downstream trace either
      });
    }

    if (
      !sampled &&
      // We check for `parentSampled === undefined` because we only want to record client reports for spans that are trace roots (ie. when there was incoming trace)
      parentSampled === undefined
    ) {
      DEBUG_BUILD && debug.log('[Tracing] Discarding root span because its trace was not chosen to be sampled.');
      this._client.recordDroppedEvent('sample_rate', 'transaction');
    }

    return {
      ...wrapSamplingDecision({
        decision: sampled ? SamplingDecision.RECORD_AND_SAMPLED : SamplingDecision.NOT_RECORD,
        context,
        spanAttributes,
        sampleRand,
        downstreamTraceSampleRate: localSampleRateWasApplied ? sampleRate : undefined,
      }),
      attributes: {
        // We set the sample rate on the span when a local sample rate was applied to better understand how traces were sampled in Sentry
        [SEMANTIC_ATTRIBUTE_SENTRY_SAMPLE_RATE]: localSampleRateWasApplied ? sampleRate : undefined,
      },
    };
  }

  /** Returns the sampler name or short description with the configuration. */
   toString() {
    return 'SentrySampler';
  }
}

function getParentSampled(parentSpan, traceId, spanName) {
  const parentContext = parentSpan.spanContext();

  // Only inherit sample rate if `traceId` is the same
  // Note for testing: `isSpanContextValid()` checks the format of the traceId/spanId, so we need to pass valid ones
  if (isSpanContextValid(parentContext) && parentContext.traceId === traceId) {
    if (parentContext.isRemote) {
      const parentSampled = getSamplingDecision(parentSpan.spanContext());
      DEBUG_BUILD &&
        debug.log(`[Tracing] Inheriting remote parent's sampled decision for ${spanName}: ${parentSampled}`);
      return parentSampled;
    }

    const parentSampled = getSamplingDecision(parentContext);
    DEBUG_BUILD && debug.log(`[Tracing] Inheriting parent's sampled decision for ${spanName}: ${parentSampled}`);
    return parentSampled;
  }

  return undefined;
}

/**
 * Wrap a sampling decision with data that Sentry needs to work properly with it.
 * If you pass `decision: undefined`, it will be treated as `NOT_RECORDING`, but in contrast to passing `NOT_RECORDING`
 * it will not propagate this decision to downstream Sentry SDKs.
 */
function wrapSamplingDecision({
  decision,
  context,
  spanAttributes,
  sampleRand,
  downstreamTraceSampleRate,
}

) {
  let traceState = getBaseTraceState(context, spanAttributes);

  // We will override the propagated sample rate downstream when
  // - the tracesSampleRate is applied
  // - the tracesSampler is invoked
  // Since unsampled OTEL spans (NonRecordingSpans) cannot hold attributes we need to store this on the (trace)context.
  if (downstreamTraceSampleRate !== undefined) {
    traceState = traceState.set(SENTRY_TRACE_STATE_SAMPLE_RATE, `${downstreamTraceSampleRate}`);
  }

  if (sampleRand !== undefined) {
    traceState = traceState.set(SENTRY_TRACE_STATE_SAMPLE_RAND, `${sampleRand}`);
  }

  // If the decision is undefined, we treat it as NOT_RECORDING, but we don't propagate this decision to downstream SDKs
  // Which is done by not setting `SENTRY_TRACE_STATE_SAMPLED_NOT_RECORDING` traceState
  if (decision == undefined) {
    return { decision: SamplingDecision.NOT_RECORD, traceState };
  }

  if (decision === SamplingDecision.NOT_RECORD) {
    return { decision, traceState: traceState.set(SENTRY_TRACE_STATE_SAMPLED_NOT_RECORDING, '1') };
  }

  return { decision, traceState };
}

function getBaseTraceState(context, spanAttributes) {
  const parentSpan = trace.getSpan(context);
  const parentContext = parentSpan?.spanContext();

  let traceState = parentContext?.traceState || new TraceState();

  // We always keep the URL on the trace state, so we can access it in the propagator
  // `ATTR_URL_FULL` is the new attribute, but we still support the old one, `ATTR_HTTP_URL`, for now.
  // eslint-disable-next-line deprecation/deprecation
  const url = spanAttributes[SEMATTRS_HTTP_URL] || spanAttributes[ATTR_URL_FULL];
  if (url && typeof url === 'string') {
    traceState = traceState.set(SENTRY_TRACE_STATE_URL, url);
  }

  return traceState;
}

/**
 * If the active span is invalid, we want to ignore it as parent.
 * This aligns with how otel tracers and default samplers handle these cases.
 */
function getValidSpan(context) {
  const span = trace.getSpan(context);
  return span && isSpanContextValid(span.spanContext()) ? span : undefined;
}

export { SEMANTIC_ATTRIBUTE_SENTRY_GRAPHQL_OPERATION, SentryPropagator, SentrySampler, SentrySpanProcessor, continueTrace, enhanceDscWithOpenTelemetryRootSpanName, getActiveSpan, getRequestSpanData, getScopesFromContext, getSpanKind, getTraceContextForScope, isSentryRequestSpan, openTelemetrySetupCheck, setOpenTelemetryContextAsyncContextStrategy, setupEventContextTrace, shouldPropagateTraceForUrl, spanHasAttributes, spanHasEvents, spanHasKind, spanHasName, spanHasParentId, spanHasStatus, startInactiveSpan, startSpan, startSpanManual, suppressTracing, withActiveSpan, wrapClientClass, wrapContextManagerClass, wrapSamplingDecision };
//# sourceMappingURL=index.js.map
