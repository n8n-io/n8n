Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

/**
 * Determine a breadcrumb's log level (only `warning` or `error`) based on an HTTP status code.
 */
function getBreadcrumbLogLevelFromHttpStatusCode(statusCode) {
  // NOTE: undefined defaults to 'info' in Sentry
  if (statusCode === undefined) {
    return undefined;
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'warning';
  } else if (statusCode >= 500) {
    return 'error';
  } else {
    return undefined;
  }
}

exports.getBreadcrumbLogLevelFromHttpStatusCode = getBreadcrumbLogLevelFromHttpStatusCode;
//# sourceMappingURL=breadcrumb-log-level.js.map
