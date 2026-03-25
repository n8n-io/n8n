import { inboundFiltersIntegration, functionToStringIntegration, dedupeIntegration, getIntegrationsToSetup, stackParserFromStackParserOptions, initAndBind } from '@sentry/core';
import { BrowserClient } from './client.js';
import { breadcrumbsIntegration } from './integrations/breadcrumbs.js';
import { browserApiErrorsIntegration } from './integrations/browserapierrors.js';
import { browserSessionIntegration } from './integrations/browsersession.js';
import { globalHandlersIntegration } from './integrations/globalhandlers.js';
import { httpContextIntegration } from './integrations/httpcontext.js';
import { linkedErrorsIntegration } from './integrations/linkederrors.js';
import { spotlightBrowserIntegration } from './integrations/spotlight.js';
import { defaultStackParser } from './stack-parsers.js';
import { makeFetchTransport } from './transports/fetch.js';
import { checkAndWarnIfIsEmbeddedBrowserExtension } from './utils/detectBrowserExtension.js';

/** Get the default integrations for the browser SDK. */
function getDefaultIntegrations(_options) {
  /**
   * Note: Please make sure this stays in sync with Angular SDK, which re-exports
   * `getDefaultIntegrations` but with an adjusted set of integrations.
   */
  return [
    // TODO(v11): Replace with `eventFiltersIntegration` once we remove the deprecated `inboundFiltersIntegration`
    // eslint-disable-next-line deprecation/deprecation
    inboundFiltersIntegration(),
    functionToStringIntegration(),
    browserApiErrorsIntegration(),
    breadcrumbsIntegration(),
    globalHandlersIntegration(),
    linkedErrorsIntegration(),
    dedupeIntegration(),
    httpContextIntegration(),
    browserSessionIntegration(),
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
    !options.skipBrowserExtensionCheck && checkAndWarnIfIsEmbeddedBrowserExtension();

  let defaultIntegrations =
    options.defaultIntegrations == null ? getDefaultIntegrations() : options.defaultIntegrations;

  /* rollup-include-development-only */
  if (options.spotlight) {
    if (!defaultIntegrations) {
      defaultIntegrations = [];
    }
    const args = typeof options.spotlight === 'string' ? { sidecarUrl: options.spotlight } : undefined;
    defaultIntegrations.push(spotlightBrowserIntegration(args));
  }
  /* rollup-include-development-only-end */

  const clientOptions = {
    ...options,
    enabled: shouldDisableBecauseIsBrowserExtenstion ? false : options.enabled,
    stackParser: stackParserFromStackParserOptions(options.stackParser || defaultStackParser),
    integrations: getIntegrationsToSetup({
      integrations: options.integrations,
      defaultIntegrations,
    }),
    transport: options.transport || makeFetchTransport,
  };
  return initAndBind(BrowserClient, clientOptions);
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

export { forceLoad, getDefaultIntegrations, init, onLoad };
//# sourceMappingURL=sdk.js.map
