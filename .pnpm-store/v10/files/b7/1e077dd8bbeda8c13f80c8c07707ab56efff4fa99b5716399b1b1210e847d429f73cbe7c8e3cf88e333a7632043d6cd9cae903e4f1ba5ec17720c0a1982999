Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('./debug-build.js');
const helpers = require('./helpers.js');

/**
 * Present the user with a report dialog.
 *
 * @param options Everything is optional, we try to fetch all info need from the current scope.
 */
function showReportDialog(options = {}) {
  const optionalDocument = helpers.WINDOW.document ;
  const injectionPoint = optionalDocument?.head || optionalDocument?.body;

  // doesn't work without a document (React Native)
  if (!injectionPoint) {
    debugBuild.DEBUG_BUILD && core.debug.error('[showReportDialog] Global document not defined');
    return;
  }

  const scope = core.getCurrentScope();
  const client = core.getClient();
  const dsn = client?.getDsn();

  if (!dsn) {
    debugBuild.DEBUG_BUILD && core.debug.error('[showReportDialog] DSN not configured');
    return;
  }

  const mergedOptions = {
    ...options,
    user: {
      ...scope.getUser(),
      ...options.user,
    },
    eventId: options.eventId || core.lastEventId(),
  };

  const script = helpers.WINDOW.document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = core.getReportDialogEndpoint(dsn, mergedOptions);

  const { onLoad, onClose } = mergedOptions;

  if (onLoad) {
    script.onload = onLoad;
  }

  if (onClose) {
    const reportDialogClosedMessageHandler = (event) => {
      if (event.data === '__sentry_reportdialog_closed__') {
        try {
          onClose();
        } finally {
          helpers.WINDOW.removeEventListener('message', reportDialogClosedMessageHandler);
        }
      }
    };
    helpers.WINDOW.addEventListener('message', reportDialogClosedMessageHandler);
  }

  injectionPoint.appendChild(script);
}

exports.showReportDialog = showReportDialog;
//# sourceMappingURL=report-dialog.js.map
