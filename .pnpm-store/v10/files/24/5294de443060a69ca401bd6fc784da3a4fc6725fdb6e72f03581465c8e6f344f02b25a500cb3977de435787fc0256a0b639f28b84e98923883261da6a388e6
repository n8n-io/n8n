Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const helpers = require('../helpers.js');

/**
 * Collects information about HTTP request headers and
 * attaches them to the event.
 */
const httpContextIntegration = core.defineIntegration(() => {
  return {
    name: 'HttpContext',
    preprocessEvent(event) {
      // if none of the information we want exists, don't bother
      if (!helpers.WINDOW.navigator && !helpers.WINDOW.location && !helpers.WINDOW.document) {
        return;
      }

      const reqData = helpers.getHttpRequestData();
      const headers = {
        ...reqData.headers,
        ...event.request?.headers,
      };

      event.request = {
        ...reqData,
        ...event.request,
        headers,
      };
    },
  };
});

exports.httpContextIntegration = httpContextIntegration;
//# sourceMappingURL=httpcontext.js.map
