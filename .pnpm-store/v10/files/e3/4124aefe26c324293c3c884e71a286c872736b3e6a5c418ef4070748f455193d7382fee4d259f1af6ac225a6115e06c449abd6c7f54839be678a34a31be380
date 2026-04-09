Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const helpers = require('../helpers.js');

const INTEGRATION_NAME = 'CultureContext';

const _cultureContextIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    preprocessEvent(event) {
      const culture = getCultureContext();

      if (culture) {
        event.contexts = {
          ...event.contexts,
          culture: { ...culture, ...event.contexts?.culture },
        };
      }
    },
  };
}) ;

/**
 * Captures culture context from the browser.
 *
 * Enabled by default.
 *
 * @example
 * ```js
 * import * as Sentry from '@sentry/browser';
 *
 * Sentry.init({
 *   integrations: [Sentry.cultureContextIntegration()],
 * });
 * ```
 */
const cultureContextIntegration = core.defineIntegration(_cultureContextIntegration);

/**
 * Returns the culture context from the browser's Intl API.
 */
function getCultureContext() {
  try {
    const intl = (helpers.WINDOW ).Intl;
    if (!intl) {
      return undefined;
    }

    const options = intl.DateTimeFormat().resolvedOptions();

    return {
      locale: options.locale,
      timezone: options.timeZone,
      calendar: options.calendar,
    };
  } catch {
    // Ignore errors
    return undefined;
  }
}

exports.cultureContextIntegration = cultureContextIntegration;
//# sourceMappingURL=culturecontext.js.map
