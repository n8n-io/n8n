import { defineIntegration, getClient, withActiveSpan, captureException, consoleSandbox, isMatchingPattern } from '@sentry/core';
import { logAndExitProcess } from '../utils/errorhandling.js';

const INTEGRATION_NAME = 'OnUnhandledRejection';

const DEFAULT_IGNORES = [
  {
    name: 'AI_NoOutputGeneratedError', // When stream aborts in Vercel AI SDK, Vercel flush() fails with an error
  },
];

const _onUnhandledRejectionIntegration = ((options = {}) => {
  const opts = {
    mode: options.mode ?? 'warn',
    ignore: [...DEFAULT_IGNORES, ...(options.ignore ?? [])],
  };

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      global.process.on('unhandledRejection', makeUnhandledPromiseHandler(client, opts));
    },
  };
}) ;

const onUnhandledRejectionIntegration = defineIntegration(_onUnhandledRejectionIntegration);

/** Extract error info safely */
function extractErrorInfo(reason) {
  // Check if reason is an object (including Error instances, not just plain objects)
  if (typeof reason !== 'object' || reason === null) {
    return { name: '', message: String(reason ?? '') };
  }

  const errorLike = reason ;
  const name = typeof errorLike.name === 'string' ? errorLike.name : '';
  const message = typeof errorLike.message === 'string' ? errorLike.message : String(reason);

  return { name, message };
}

/** Check if a matcher matches the reason */
function isMatchingReason(matcher, errorInfo) {
  // name/message matcher
  const nameMatches = matcher.name === undefined || isMatchingPattern(errorInfo.name, matcher.name, true);

  const messageMatches = matcher.message === undefined || isMatchingPattern(errorInfo.message, matcher.message);

  return nameMatches && messageMatches;
}

/** Match helper */
function matchesIgnore(list, reason) {
  const errorInfo = extractErrorInfo(reason);
  return list.some(matcher => isMatchingReason(matcher, errorInfo));
}

/** Core handler */
function makeUnhandledPromiseHandler(
  client,
  options,
) {
  return function sendUnhandledPromise(reason, promise) {
    // Only handle for the active client
    if (getClient() !== client) {
      return;
    }

    // Skip if configured to ignore
    if (matchesIgnore(options.ignore ?? [], reason)) {
      return;
    }

    const level = options.mode === 'strict' ? 'fatal' : 'error';

    // this can be set in places where we cannot reliably get access to the active span/error
    // when the error bubbles up to this handler, we can use this to set the active span
    const activeSpanForError =
      reason && typeof reason === 'object' ? (reason )._sentry_active_span : undefined;

    const activeSpanWrapper = activeSpanForError
      ? (fn) => withActiveSpan(activeSpanForError, fn)
      : (fn) => fn();

    activeSpanWrapper(() => {
      captureException(reason, {
        originalException: promise,
        captureContext: {
          extra: { unhandledPromiseRejection: true },
          level,
        },
        mechanism: {
          handled: false,
          type: 'auto.node.onunhandledrejection',
        },
      });
    });

    handleRejection(reason, options.mode);
  };
}

/**
 * Handler for `mode` option
 */
function handleRejection(reason, mode) {
  // https://github.com/nodejs/node/blob/7cf6f9e964aa00772965391c23acda6d71972a9a/lib/internal/process/promises.js#L234-L240
  const rejectionWarning =
    'This error originated either by ' +
    'throwing inside of an async function without a catch block, ' +
    'or by rejecting a promise which was not handled with .catch().' +
    ' The promise rejected with the reason:';

  /* eslint-disable no-console */
  if (mode === 'warn') {
    consoleSandbox(() => {
      console.warn(rejectionWarning);
      console.error(reason && typeof reason === 'object' && 'stack' in reason ? reason.stack : reason);
    });
  } else if (mode === 'strict') {
    consoleSandbox(() => {
      console.warn(rejectionWarning);
    });
    logAndExitProcess(reason);
  }
  /* eslint-enable no-console */
}

export { makeUnhandledPromiseHandler, onUnhandledRejectionIntegration };
//# sourceMappingURL=onunhandledrejection.js.map
