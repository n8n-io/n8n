import { getClient, withScope } from '../currentScopes.js';
import { captureException } from '../exports.js';
import { addConsoleInstrumentationHandler } from '../instrument/console.js';
import { defineIntegration } from '../integration.js';
import { CONSOLE_LEVELS } from '../utils/debug-logger.js';
import { addExceptionMechanism } from '../utils/misc.js';
import { severityLevelFromString } from '../utils/severity.js';
import { safeJoin } from '../utils/string.js';
import { GLOBAL_OBJ } from '../utils/worldwide.js';

const INTEGRATION_NAME = 'CaptureConsole';

const _captureConsoleIntegration = ((options = {}) => {
  const levels = options.levels || CONSOLE_LEVELS;
  const handled = options.handled ?? true;

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      if (!('console' in GLOBAL_OBJ)) {
        return;
      }

      addConsoleInstrumentationHandler(({ args, level }) => {
        if (getClient() !== client || !levels.includes(level)) {
          return;
        }

        consoleHandler(args, level, handled);
      });
    },
  };
}) ;

/**
 * Send Console API calls as Sentry Events.
 */
const captureConsoleIntegration = defineIntegration(_captureConsoleIntegration);

function consoleHandler(args, level, handled) {
  const severityLevel = severityLevelFromString(level);

  /*
    We create this error here already to attach a stack trace to captured messages,
    if users set `attachStackTrace` to `true` in Sentry.init.
    We do this here already because we want to minimize the number of Sentry SDK stack frames
    within the error. Technically, Client.captureMessage will also do it but this happens several
    stack frames deeper.
  */
  const syntheticException = new Error();

  const captureContext = {
    level: severityLevelFromString(level),
    extra: {
      arguments: args,
    },
  };

  withScope(scope => {
    scope.addEventProcessor(event => {
      event.logger = 'console';

      addExceptionMechanism(event, {
        handled,
        type: 'auto.core.capture_console',
      });

      return event;
    });

    if (level === 'assert') {
      if (!args[0]) {
        const message = `Assertion failed: ${safeJoin(args.slice(1), ' ') || 'console.assert'}`;
        scope.setExtra('arguments', args.slice(1));
        scope.captureMessage(message, severityLevel, { captureContext, syntheticException });
      }
      return;
    }

    const error = args.find(arg => arg instanceof Error);
    if (error) {
      captureException(error, captureContext);
      return;
    }

    const message = safeJoin(args, ' ');
    scope.captureMessage(message, severityLevel, { captureContext, syntheticException });
  });
}

export { captureConsoleIntegration };
//# sourceMappingURL=captureconsole.js.map
