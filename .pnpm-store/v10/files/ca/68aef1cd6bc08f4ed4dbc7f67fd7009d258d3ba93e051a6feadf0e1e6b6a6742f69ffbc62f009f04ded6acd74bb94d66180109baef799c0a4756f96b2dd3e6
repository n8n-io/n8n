Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const browserUtils = require('@sentry-internal/browser-utils');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');

/** maxStringLength gets capped to prevent 100 breadcrumbs exceeding 1MB event payload size */
const MAX_ALLOWED_STRING_LENGTH = 1024;

const INTEGRATION_NAME = 'Breadcrumbs';

const _breadcrumbsIntegration = ((options = {}) => {
  const _options = {
    console: true,
    dom: true,
    fetch: true,
    history: true,
    sentry: true,
    xhr: true,
    ...options,
  };

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      // TODO(v11): Remove this functionality and use `consoleIntegration` from @sentry/core instead.
      if (_options.console) {
        core.addConsoleInstrumentationHandler(_getConsoleBreadcrumbHandler(client));
      }
      if (_options.dom) {
        browserUtils.addClickKeypressInstrumentationHandler(_getDomBreadcrumbHandler(client, _options.dom));
      }
      if (_options.xhr) {
        browserUtils.addXhrInstrumentationHandler(_getXhrBreadcrumbHandler(client));
      }
      if (_options.fetch) {
        core.addFetchInstrumentationHandler(_getFetchBreadcrumbHandler(client));
      }
      if (_options.history) {
        browserUtils.addHistoryInstrumentationHandler(_getHistoryBreadcrumbHandler(client));
      }
      if (_options.sentry) {
        client.on('beforeSendEvent', _getSentryBreadcrumbHandler(client));
      }
    },
  };
}) ;

const breadcrumbsIntegration = core.defineIntegration(_breadcrumbsIntegration);

/**
 * Adds a breadcrumb for Sentry events or transactions if this option is enabled.
 */
function _getSentryBreadcrumbHandler(client) {
  return function addSentryBreadcrumb(event) {
    if (core.getClient() !== client) {
      return;
    }

    core.addBreadcrumb(
      {
        category: `sentry.${event.type === 'transaction' ? 'transaction' : 'event'}`,
        event_id: event.event_id,
        level: event.level,
        message: core.getEventDescription(event),
      },
      {
        event,
      },
    );
  };
}

/**
 * A HOC that creates a function that creates breadcrumbs from DOM API calls.
 * This is a HOC so that we get access to dom options in the closure.
 */
function _getDomBreadcrumbHandler(
  client,
  dom,
) {
  return function _innerDomBreadcrumb(handlerData) {
    if (core.getClient() !== client) {
      return;
    }

    let target;
    let componentName;
    let keyAttrs = typeof dom === 'object' ? dom.serializeAttribute : undefined;

    let maxStringLength =
      typeof dom === 'object' && typeof dom.maxStringLength === 'number' ? dom.maxStringLength : undefined;
    if (maxStringLength && maxStringLength > MAX_ALLOWED_STRING_LENGTH) {
      debugBuild.DEBUG_BUILD &&
        core.debug.warn(
          `\`dom.maxStringLength\` cannot exceed ${MAX_ALLOWED_STRING_LENGTH}, but a value of ${maxStringLength} was configured. Sentry will use ${MAX_ALLOWED_STRING_LENGTH} instead.`,
        );
      maxStringLength = MAX_ALLOWED_STRING_LENGTH;
    }

    if (typeof keyAttrs === 'string') {
      keyAttrs = [keyAttrs];
    }

    // Accessing event.target can throw (see getsentry/raven-js#838, #768)
    try {
      const event = handlerData.event ;
      const element = _isEvent(event) ? event.target : event;

      target = core.htmlTreeAsString(element, { keyAttrs, maxStringLength });
      componentName = core.getComponentName(element);
    } catch {
      target = '<unknown>';
    }

    if (target.length === 0) {
      return;
    }

    const breadcrumb = {
      category: `ui.${handlerData.name}`,
      message: target,
    };

    if (componentName) {
      breadcrumb.data = { 'ui.component_name': componentName };
    }

    core.addBreadcrumb(breadcrumb, {
      event: handlerData.event,
      name: handlerData.name,
      global: handlerData.global,
    });
  };
}

/**
 * Creates breadcrumbs from console API calls
 */
function _getConsoleBreadcrumbHandler(client) {
  return function _consoleBreadcrumb(handlerData) {
    if (core.getClient() !== client) {
      return;
    }

    const breadcrumb = {
      category: 'console',
      data: {
        arguments: handlerData.args,
        logger: 'console',
      },
      level: core.severityLevelFromString(handlerData.level),
      message: core.safeJoin(handlerData.args, ' '),
    };

    if (handlerData.level === 'assert') {
      if (handlerData.args[0] === false) {
        breadcrumb.message = `Assertion failed: ${core.safeJoin(handlerData.args.slice(1), ' ') || 'console.assert'}`;
        breadcrumb.data.arguments = handlerData.args.slice(1);
      } else {
        // Don't capture a breadcrumb for passed assertions
        return;
      }
    }

    core.addBreadcrumb(breadcrumb, {
      input: handlerData.args,
      level: handlerData.level,
    });
  };
}

/**
 * Creates breadcrumbs from XHR API calls
 */
function _getXhrBreadcrumbHandler(client) {
  return function _xhrBreadcrumb(handlerData) {
    if (core.getClient() !== client) {
      return;
    }

    const { startTimestamp, endTimestamp } = handlerData;

    const sentryXhrData = handlerData.xhr[browserUtils.SENTRY_XHR_DATA_KEY];

    // We only capture complete, non-sentry requests
    if (!startTimestamp || !endTimestamp || !sentryXhrData) {
      return;
    }

    const { method, url, status_code, body } = sentryXhrData;

    const data = {
      method,
      url,
      status_code,
    };

    const hint = {
      xhr: handlerData.xhr,
      input: body,
      startTimestamp,
      endTimestamp,
    };

    const breadcrumb = {
      category: 'xhr',
      data,
      type: 'http',
      level: core.getBreadcrumbLogLevelFromHttpStatusCode(status_code),
    };

    client.emit('beforeOutgoingRequestBreadcrumb', breadcrumb, hint );

    core.addBreadcrumb(breadcrumb, hint);
  };
}

/**
 * Creates breadcrumbs from fetch API calls
 */
function _getFetchBreadcrumbHandler(client) {
  return function _fetchBreadcrumb(handlerData) {
    if (core.getClient() !== client) {
      return;
    }

    const { startTimestamp, endTimestamp } = handlerData;

    // We only capture complete fetch requests
    if (!endTimestamp) {
      return;
    }

    if (handlerData.fetchData.url.match(/sentry_key/) && handlerData.fetchData.method === 'POST') {
      // We will not create breadcrumbs for fetch requests that contain `sentry_key` (internal sentry requests)
      return;
    }

    ({
      method: handlerData.fetchData.method,
      url: handlerData.fetchData.url,
    });

    if (handlerData.error) {
      const data = handlerData.fetchData;
      const hint = {
        data: handlerData.error,
        input: handlerData.args,
        startTimestamp,
        endTimestamp,
      };

      const breadcrumb = {
        category: 'fetch',
        data,
        level: 'error',
        type: 'http',
      } ;

      client.emit('beforeOutgoingRequestBreadcrumb', breadcrumb, hint );

      core.addBreadcrumb(breadcrumb, hint);
    } else {
      const response = handlerData.response ;
      const data = {
        ...handlerData.fetchData,
        status_code: response?.status,
      };

      handlerData.fetchData.request_body_size;
      handlerData.fetchData.response_body_size;
      response?.status;

      const hint = {
        input: handlerData.args,
        response,
        startTimestamp,
        endTimestamp,
      };

      const breadcrumb = {
        category: 'fetch',
        data,
        type: 'http',
        level: core.getBreadcrumbLogLevelFromHttpStatusCode(data.status_code),
      };

      client.emit('beforeOutgoingRequestBreadcrumb', breadcrumb, hint );

      core.addBreadcrumb(breadcrumb, hint);
    }
  };
}

/**
 * Creates breadcrumbs from history API calls
 */
function _getHistoryBreadcrumbHandler(client) {
  return function _historyBreadcrumb(handlerData) {
    if (core.getClient() !== client) {
      return;
    }

    let from = handlerData.from;
    let to = handlerData.to;
    const parsedLoc = core.parseUrl(helpers.WINDOW.location.href);
    let parsedFrom = from ? core.parseUrl(from) : undefined;
    const parsedTo = core.parseUrl(to);

    // Initial pushState doesn't provide `from` information
    if (!parsedFrom?.path) {
      parsedFrom = parsedLoc;
    }

    // Use only the path component of the URL if the URL matches the current
    // document (almost all the time when using pushState)
    if (parsedLoc.protocol === parsedTo.protocol && parsedLoc.host === parsedTo.host) {
      to = parsedTo.relative;
    }
    if (parsedLoc.protocol === parsedFrom.protocol && parsedLoc.host === parsedFrom.host) {
      from = parsedFrom.relative;
    }

    core.addBreadcrumb({
      category: 'navigation',
      data: {
        from,
        to,
      },
    });
  };
}

function _isEvent(event) {
  return !!event && !!(event ).target;
}

exports.breadcrumbsIntegration = breadcrumbsIntegration;
//# sourceMappingURL=breadcrumbs.js.map
