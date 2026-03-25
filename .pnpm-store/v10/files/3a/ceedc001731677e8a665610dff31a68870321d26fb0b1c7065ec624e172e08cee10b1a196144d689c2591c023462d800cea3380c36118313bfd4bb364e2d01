import * as util from 'node:util';
import { defineIntegration } from '@sentry/core';

const INTEGRATION_NAME = 'NodeSystemError';

function isSystemError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  if (!('errno' in error) || typeof error.errno !== 'number') {
    return false;
  }

  // Appears this is the recommended way to check for Node.js SystemError
  // https://github.com/nodejs/node/issues/46869
  return util.getSystemErrorMap().has(error.errno);
}

/**
 * Captures context for Node.js SystemError errors.
 */
const systemErrorIntegration = defineIntegration((options = {}) => {
  return {
    name: INTEGRATION_NAME,
    processEvent: (event, hint, client) => {
      if (!isSystemError(hint.originalException)) {
        return event;
      }

      const error = hint.originalException;

      const errorContext = {
        ...error,
      };

      if (!client.getOptions().sendDefaultPii && options.includePaths !== true) {
        delete errorContext.path;
        delete errorContext.dest;
      }

      event.contexts = {
        ...event.contexts,
        node_system_error: errorContext,
      };

      for (const exception of event.exception?.values || []) {
        if (exception.value) {
          if (error.path && exception.value.includes(error.path)) {
            exception.value = exception.value.replace(`'${error.path}'`, '').trim();
          }
          if (error.dest && exception.value.includes(error.dest)) {
            exception.value = exception.value.replace(`'${error.dest}'`, '').trim();
          }
        }
      }

      return event;
    },
  };
});

export { systemErrorIntegration };
//# sourceMappingURL=systemError.js.map
