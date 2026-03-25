import { context } from '@opentelemetry/api';
import { isTracingSuppressed } from '@opentelemetry/core';
import { InstrumentationBase } from '@opentelemetry/instrumentation';
import { SDK_VERSION, LRUMap, getClient, getTraceData, getBreadcrumbLogLevelFromHttpStatusCode, addBreadcrumb, parseUrl, getSanitizedUrlString } from '@sentry/core';
import { shouldPropagateTraceForUrl } from '@sentry/opentelemetry';
import * as diagch from 'diagnostics_channel';
import { NODE_MAJOR, NODE_MINOR } from '../../nodeVersion.js';
import { mergeBaggageHeaders } from '../../utils/baggage.js';

const SENTRY_TRACE_HEADER = 'sentry-trace';
const SENTRY_BAGGAGE_HEADER = 'baggage';

// For baggage, we make sure to merge this into a possibly existing header
const BAGGAGE_HEADER_REGEX = /baggage: (.*)\r\n/;

/**
 * This custom node-fetch instrumentation is used to instrument outgoing fetch requests.
 * It does not emit any spans.
 *
 * The reason this is isolated from the OpenTelemetry instrumentation is that users may overwrite this,
 * which would lead to Sentry not working as expected.
 *
 * This is heavily inspired & adapted from:
 * https://github.com/open-telemetry/opentelemetry-js-contrib/blob/28e209a9da36bc4e1f8c2b0db7360170ed46cb80/plugins/node/instrumentation-undici/src/undici.ts
 */
class SentryNodeFetchInstrumentation extends InstrumentationBase {
  // Keep ref to avoid https://github.com/nodejs/node/issues/42170 bug and for
  // unsubscribing.

   constructor(config = {}) {
    super('@sentry/instrumentation-node-fetch', SDK_VERSION, config);
    this._channelSubs = [];
    this._propagationDecisionMap = new LRUMap(100);
    this._ignoreOutgoingRequestsMap = new WeakMap();
  }

  /** No need to instrument files/modules. */
   init() {
    return undefined;
  }

  /** Disable the instrumentation. */
   disable() {
    super.disable();
    this._channelSubs.forEach(sub => sub.unsubscribe());
    this._channelSubs = [];
  }

  /** Enable the instrumentation. */
   enable() {
    // "enabled" handling is currently a bit messy with InstrumentationBase.
    // If constructed with `{enabled: false}`, this `.enable()` is still called,
    // and `this.getConfig().enabled !== this.isEnabled()`, creating confusion.
    //
    // For now, this class will setup for instrumenting if `.enable()` is
    // called, but use `this.getConfig().enabled` to determine if
    // instrumentation should be generated. This covers the more likely common
    // case of config being given a construction time, rather than later via
    // `instance.enable()`, `.disable()`, or `.setConfig()` calls.
    super.enable();

    // This method is called by the super-class constructor before ours is
    // called. So we need to ensure the property is initalized.
    this._channelSubs = this._channelSubs || [];

    // Avoid to duplicate subscriptions
    if (this._channelSubs.length > 0) {
      return;
    }

    this._subscribeToChannel('undici:request:create', this._onRequestCreated.bind(this));
    this._subscribeToChannel('undici:request:headers', this._onResponseHeaders.bind(this));
  }

  /**
   * This method is called when a request is created.
   * You can still mutate the request here before it is sent.
   */
  // eslint-disable-next-line complexity
   _onRequestCreated({ request }) {
    const config = this.getConfig();
    const enabled = config.enabled !== false;

    if (!enabled) {
      return;
    }

    const shouldIgnore = this._shouldIgnoreOutgoingRequest(request);
    // We store this decisision for later so we do not need to re-evaluate it
    // Additionally, the active context is not correct in _onResponseHeaders, so we need to make sure it is evaluated here
    this._ignoreOutgoingRequestsMap.set(request, shouldIgnore);

    if (shouldIgnore) {
      return;
    }

    const url = getAbsoluteUrl(request.origin, request.path);

    // Manually add the trace headers, if it applies
    // Note: We do not use `propagation.inject()` here, because our propagator relies on an active span
    // Which we do not have in this case
    // The propagator _may_ overwrite this, but this should be fine as it is the same data
    const { tracePropagationTargets, propagateTraceparent } = getClient()?.getOptions() || {};
    const addedHeaders = shouldPropagateTraceForUrl(url, tracePropagationTargets, this._propagationDecisionMap)
      ? getTraceData({ propagateTraceparent })
      : undefined;

    if (!addedHeaders) {
      return;
    }

    const { 'sentry-trace': sentryTrace, baggage, traceparent } = addedHeaders;

    // We do not want to overwrite existing headers here
    // If the core UndiciInstrumentation is registered, it will already have set the headers
    // We do not want to add any then
    if (Array.isArray(request.headers)) {
      const requestHeaders = request.headers;

      // We do not want to overwrite existing header here, if it was already set
      if (sentryTrace && !requestHeaders.includes(SENTRY_TRACE_HEADER)) {
        requestHeaders.push(SENTRY_TRACE_HEADER, sentryTrace);
      }

      if (traceparent && !requestHeaders.includes('traceparent')) {
        requestHeaders.push('traceparent', traceparent);
      }

      // For baggage, we make sure to merge this into a possibly existing header
      const existingBaggagePos = requestHeaders.findIndex(header => header === SENTRY_BAGGAGE_HEADER);
      if (baggage && existingBaggagePos === -1) {
        requestHeaders.push(SENTRY_BAGGAGE_HEADER, baggage);
      } else if (baggage) {
        const existingBaggage = requestHeaders[existingBaggagePos + 1];
        const merged = mergeBaggageHeaders(existingBaggage, baggage);
        if (merged) {
          requestHeaders[existingBaggagePos + 1] = merged;
        }
      }
    } else {
      const requestHeaders = request.headers;
      // We do not want to overwrite existing header here, if it was already set
      if (sentryTrace && !requestHeaders.includes(`${SENTRY_TRACE_HEADER}:`)) {
        request.headers += `${SENTRY_TRACE_HEADER}: ${sentryTrace}\r\n`;
      }

      if (traceparent && !requestHeaders.includes('traceparent:')) {
        request.headers += `traceparent: ${traceparent}\r\n`;
      }

      const existingBaggage = request.headers.match(BAGGAGE_HEADER_REGEX)?.[1];
      if (baggage && !existingBaggage) {
        request.headers += `${SENTRY_BAGGAGE_HEADER}: ${baggage}\r\n`;
      } else if (baggage) {
        const merged = mergeBaggageHeaders(existingBaggage, baggage);
        if (merged) {
          request.headers = request.headers.replace(BAGGAGE_HEADER_REGEX, `baggage: ${merged}\r\n`);
        }
      }
    }
  }

  /**
   * This method is called when a response is received.
   */
   _onResponseHeaders({ request, response }) {
    const config = this.getConfig();
    const enabled = config.enabled !== false;

    if (!enabled) {
      return;
    }

    const _breadcrumbs = config.breadcrumbs;
    const breadCrumbsEnabled = typeof _breadcrumbs === 'undefined' ? true : _breadcrumbs;

    const shouldIgnore = this._ignoreOutgoingRequestsMap.get(request);

    if (breadCrumbsEnabled && !shouldIgnore) {
      addRequestBreadcrumb(request, response);
    }
  }

  /** Subscribe to a diagnostics channel. */
   _subscribeToChannel(
    diagnosticChannel,
    onMessage,
  ) {
    // `diagnostics_channel` had a ref counting bug until v18.19.0.
    // https://github.com/nodejs/node/pull/47520
    const useNewSubscribe = NODE_MAJOR > 18 || (NODE_MAJOR === 18 && NODE_MINOR >= 19);

    let unsubscribe;
    if (useNewSubscribe) {
      diagch.subscribe?.(diagnosticChannel, onMessage);
      unsubscribe = () => diagch.unsubscribe?.(diagnosticChannel, onMessage);
    } else {
      const channel = diagch.channel(diagnosticChannel);
      channel.subscribe(onMessage);
      unsubscribe = () => channel.unsubscribe(onMessage);
    }

    this._channelSubs.push({
      name: diagnosticChannel,
      unsubscribe,
    });
  }

  /**
   * Check if the given outgoing request should be ignored.
   */
   _shouldIgnoreOutgoingRequest(request) {
    if (isTracingSuppressed(context.active())) {
      return true;
    }

    // Add trace propagation headers
    const url = getAbsoluteUrl(request.origin, request.path);
    const ignoreOutgoingRequests = this.getConfig().ignoreOutgoingRequests;

    if (typeof ignoreOutgoingRequests !== 'function' || !url) {
      return false;
    }

    return ignoreOutgoingRequests(url);
  }
}

/** Add a breadcrumb for outgoing requests. */
function addRequestBreadcrumb(request, response) {
  const data = getBreadcrumbData(request);

  const statusCode = response.statusCode;
  const level = getBreadcrumbLogLevelFromHttpStatusCode(statusCode);

  addBreadcrumb(
    {
      category: 'http',
      data: {
        status_code: statusCode,
        ...data,
      },
      type: 'http',
      level,
    },
    {
      event: 'response',
      request,
      response,
    },
  );
}

function getBreadcrumbData(request) {
  try {
    const url = getAbsoluteUrl(request.origin, request.path);
    const parsedUrl = parseUrl(url);

    const data = {
      url: getSanitizedUrlString(parsedUrl),
      'http.method': request.method || 'GET',
    };

    if (parsedUrl.search) {
      data['http.query'] = parsedUrl.search;
    }
    if (parsedUrl.hash) {
      data['http.fragment'] = parsedUrl.hash;
    }

    return data;
  } catch {
    return {};
  }
}

function getAbsoluteUrl(origin, path = '/') {
  try {
    const url = new URL(path, origin);
    return url.toString();
  } catch {
    // fallback: Construct it on our own
    const url = `${origin}`;

    if (url.endsWith('/') && path.startsWith('/')) {
      return `${url}${path.slice(1)}`;
    }

    if (!url.endsWith('/') && !path.startsWith('/')) {
      return `${url}/${path.slice(1)}`;
    }

    return `${url}${path}`;
  }
}

export { SentryNodeFetchInstrumentation };
//# sourceMappingURL=SentryNodeFetchInstrumentation.js.map
