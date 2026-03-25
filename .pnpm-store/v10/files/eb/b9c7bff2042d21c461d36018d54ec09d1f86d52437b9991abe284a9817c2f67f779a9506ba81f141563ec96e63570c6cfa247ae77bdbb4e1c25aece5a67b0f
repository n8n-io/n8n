import { defineIntegration } from '@sentry/core';
import { WINDOW, getHttpRequestData } from '../helpers.js';

/**
 * Collects information about HTTP request headers and
 * attaches them to the event.
 */
const httpContextIntegration = defineIntegration(() => {
  return {
    name: 'HttpContext',
    preprocessEvent(event) {
      // if none of the information we want exists, don't bother
      if (!WINDOW.navigator && !WINDOW.location && !WINDOW.document) {
        return;
      }

      const reqData = getHttpRequestData();
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

export { httpContextIntegration };
//# sourceMappingURL=httpcontext.js.map
