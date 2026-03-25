import { defineIntegration, supportsReportingObserver, GLOBAL_OBJ, getClient, withScope, captureMessage } from '@sentry/core';

const WINDOW = GLOBAL_OBJ ;

const INTEGRATION_NAME = 'ReportingObserver';

const SETUP_CLIENTS = new WeakMap();

const _reportingObserverIntegration = ((options = {}) => {
  const types = options.types || ['crash', 'deprecation', 'intervention'];

  /** Handler for the reporting observer. */
  function handler(reports) {
    if (!SETUP_CLIENTS.has(getClient() )) {
      return;
    }

    for (const report of reports) {
      withScope(scope => {
        scope.setExtra('url', report.url);

        const label = `ReportingObserver [${report.type}]`;
        let details = 'No details available';

        if (report.body) {
          // Object.keys doesn't work on ReportBody, as all properties are inherited
          const plainBody

 = {};

          // eslint-disable-next-line guard-for-in
          for (const prop in report.body) {
            plainBody[prop] = report.body[prop];
          }

          scope.setExtra('body', plainBody);

          if (report.type === 'crash') {
            const body = report.body ;
            // A fancy way to create a message out of crashId OR reason OR both OR fallback
            details = [body.crashId || '', body.reason || ''].join(' ').trim() || details;
          } else {
            const body = report.body ;
            details = body.message || details;
          }
        }

        captureMessage(`${label}: ${details}`);
      });
    }
  }

  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      if (!supportsReportingObserver()) {
        return;
      }

      const observer = new (WINDOW ).ReportingObserver(
        handler,
        {
          buffered: true,
          types,
        },
      );

      observer.observe();
    },

    setup(client) {
      SETUP_CLIENTS.set(client, true);
    },
  };
}) ;

/**
 * Reporting API integration - https://w3c.github.io/reporting/
 */
const reportingObserverIntegration = defineIntegration(_reportingObserverIntegration);

export { reportingObserverIntegration };
//# sourceMappingURL=reportingobserver.js.map
