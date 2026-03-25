Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const client = require('./client.js');
const breadcrumbs = require('./integrations/breadcrumbs.js');
const browserapierrors = require('./integrations/browserapierrors.js');
const browsersession = require('./integrations/browsersession.js');
const globalhandlers = require('./integrations/globalhandlers.js');
const httpcontext = require('./integrations/httpcontext.js');
const linkederrors = require('./integrations/linkederrors.js');
const spotlight = require('./integrations/spotlight.js');
const stackParsers = require('./stack-parsers.js');
const fetch = require('./transports/fetch.js');
const detectBrowserExtension = require('./utils/detectBrowserExtension.js');

/** Get the default integrations for the browser SDK. */
function getDefaultIntegrations(_options) {
  /**
   * Note: Please make sure this stays in sync with Angular SDK, which re-exports
   * `getDefaultIntegrations` but with an adjusted set of integrations.
   */
  return [
    // TODO(v11): Replace with `eventFiltersIntegration` once we remove the deprecated `inboundFiltersIntegration`
    // eslint-disable-next-line deprecation/deprecation
    core.inboundFiltersIntegration(),
    core.functionToStringIntegration(),
    browserapierrors.browserApiErrorsIntegration(),
    breadcrumbs.breadcrumbsIntegration(),
    globalhandlers.globalHandlersIntegration(),
    linkederrors.linkedErrorsIntegration(),
    core.dedupeIntegration(),
    httpcontext.httpContextIntegration(),
    browsersession.browserSessionIntegration(),
  ];
}

/**
 * The Sentry Browser SDK Client.
 *
 * To use this SDK, call the {@link init} function as early as possible when
 * loading the web page. To set context information or send manual events, use
 * the provided methods.
 *
 * @example
 *
 * ```
 *
 * import { init } from '@sentry/browser';
 *
 * init({
 *   dsn: '__DSN__',
 *   // ...
 * });
 * ```
 *
 * @example
 * ```
 *
 * import { addBreadcrumb } from '@sentry/browser';
 * addBreadcrumb({
 *   message: 'My Breadcrumb',
 *   // ...
 * });
 * ```
 *
 * @example
 *
 * ```
 *
 * import * as Sentry from '@sentry/browser';
 * Sentry.captureMessage('Hello, world!');
 * Sentry.captureException(new Error('Good bye'));
 * Sentry.captureEvent({
 *   message: 'Manual',
 *   stacktrace: [
 *     // ...
 *   ],
 * });
 * ```
 *
 * @see {@link BrowserOptions} for documentation on configuration options.
 */
function init(options = {}) {
  const shouldDisableBecauseIsBrowserExtenstion =
    !options.skipBrowserExtensionCheck && detectBrowserExtension.checkAndWarnIfIsEmbeddedBrowserExtension();

  let defaultIntegrations =
    options.defaultIntegrations == null ? getDefaultIntegrations() : options.defaultIntegrations;

  /* rollup-include-development-only */
  if (options.spotlight) {
    if (!defaultIntegrations) {
      defaultIntegrations = [];
    }
    const args = typeof options.spotlight === 'string' ? { sidecarUrl: options.spotlight } : undefined;
    defaultIntegrations.push(spotlight.spotlightBrowserIntegration(args));
  }
  /* rollup-include-development-only-end */

  const clientOptions = {
    ...options,
    enabled: shouldDisableBecauseIsBrowserExtenstion ? false : options.enabled,
    stackParser: core.stackParserFromStackParserOptions(options.stackParser || stackParsers.defaultStackParser),
    integrations: core.getIntegrationsToSetup({
      integrations: options.integrations,
      defaultIntegrations,
    }),
    transport: options.transport || fetch.makeFetchTransport,
  };
  return core.initAndBind(client.BrowserClient, clientOptions);
}

/**
 * This function is here to be API compatible with the loader.
 * @hidden
 */
function forceLoad() {
  // Noop
}

/**
 * This function is here to be API compatible with the loader.
 * @hidden
 */
function onLoad(callback) {
  callback();
}

exports.forceLoad = forceLoad;
exports.getDefaultIntegrations = getDefaultIntegrations;
exports.init = init;
exports.onLoad = onLoad;
//# sourceMappingURL=sdk.js.map
