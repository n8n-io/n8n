Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const worker_threads = require('worker_threads');
const debugBuild = require('../debug-build.js');
const errorhandling = require('../utils/errorhandling.js');

const INTEGRATION_NAME = 'OnUncaughtException';

/**
 * Add a global exception handler.
 */
const onUncaughtExceptionIntegration = core.defineIntegration((options = {}) => {
  const optionsWithDefaults = {
    exitEvenIfOtherHandlersAreRegistered: false,
    ...options,
  };

  return {
    name: INTEGRATION_NAME,
    setup(client) {
      // errors in worker threads are already handled by the childProcessIntegration
      // also we don't want to exit the Node process on worker thread errors
      if (!worker_threads.isMainThread) {
        return;
      }

      global.process.on('uncaughtException', makeErrorHandler(client, optionsWithDefaults));
    },
  };
});

/** Exported only for tests */
function makeErrorHandler(client, options) {
  const timeout = 2000;
  let caughtFirstError = false;
  let caughtSecondError = false;
  let calledFatalError = false;
  let firstError;

  const clientOptions = client.getOptions();

  return Object.assign(
    (error) => {
      let onFatalError = errorhandling.logAndExitProcess;

      if (options.onFatalError) {
        onFatalError = options.onFatalError;
      } else if (clientOptions.onFatalError) {
        onFatalError = clientOptions.onFatalError ;
      }

      // Attaching a listener to `uncaughtException` will prevent the node process from exiting. We generally do not
      // want to alter this behaviour so we check for other listeners that users may have attached themselves and adjust
      // exit behaviour of the SDK accordingly:
      // - If other listeners are attached, do not exit.
      // - If the only listener attached is ours, exit.
      const userProvidedListenersCount = (global.process.listeners('uncaughtException') ).filter(
        listener => {
          // There are 3 listeners we ignore:
          return (
            // as soon as we're using domains this listener is attached by node itself
            listener.name !== 'domainUncaughtExceptionClear' &&
            // the handler we register for tracing
            listener.tag !== 'sentry_tracingErrorCallback' &&
            // the handler we register in this integration
            (listener )._errorHandler !== true
          );
        },
      ).length;

      const processWouldExit = userProvidedListenersCount === 0;
      const shouldApplyFatalHandlingLogic = options.exitEvenIfOtherHandlersAreRegistered || processWouldExit;

      if (!caughtFirstError) {
        // this is the first uncaught error and the ultimate reason for shutting down
        // we want to do absolutely everything possible to ensure it gets captured
        // also we want to make sure we don't go recursion crazy if more errors happen after this one
        firstError = error;
        caughtFirstError = true;

        if (core.getClient() === client) {
          core.captureException(error, {
            originalException: error,
            captureContext: {
              level: 'fatal',
            },
            mechanism: {
              handled: false,
              type: 'auto.node.onuncaughtexception',
            },
          });
        }

        if (!calledFatalError && shouldApplyFatalHandlingLogic) {
          calledFatalError = true;
          onFatalError(error);
        }
      } else {
        if (shouldApplyFatalHandlingLogic) {
          if (calledFatalError) {
            // we hit an error *after* calling onFatalError - pretty boned at this point, just shut it down
            debugBuild.DEBUG_BUILD &&
              core.debug.warn(
                'uncaught exception after calling fatal error shutdown callback - this is bad! forcing shutdown',
              );
            errorhandling.logAndExitProcess(error);
          } else if (!caughtSecondError) {
            // two cases for how we can hit this branch:
            //   - capturing of first error blew up and we just caught the exception from that
            //     - quit trying to capture, proceed with shutdown
            //   - a second independent error happened while waiting for first error to capture
            //     - want to avoid causing premature shutdown before first error capture finishes
            // it's hard to immediately tell case 1 from case 2 without doing some fancy/questionable domain stuff
            // so let's instead just delay a bit before we proceed with our action here
            // in case 1, we just wait a bit unnecessarily but ultimately do the same thing
            // in case 2, the delay hopefully made us wait long enough for the capture to finish
            // two potential nonideal outcomes:
            //   nonideal case 1: capturing fails fast, we sit around for a few seconds unnecessarily before proceeding correctly by calling onFatalError
            //   nonideal case 2: case 2 happens, 1st error is captured but slowly, timeout completes before capture and we treat second error as the sendErr of (nonexistent) failure from trying to capture first error
            // note that after hitting this branch, we might catch more errors where (caughtSecondError && !calledFatalError)
            //   we ignore them - they don't matter to us, we're just waiting for the second error timeout to finish
            caughtSecondError = true;
            setTimeout(() => {
              if (!calledFatalError) {
                // it was probably case 1, let's treat err as the sendErr and call onFatalError
                calledFatalError = true;
                onFatalError(firstError, error);
              }
            }, timeout); // capturing could take at least sendTimeout to fail, plus an arbitrary second for how long it takes to collect surrounding source etc
          }
        }
      }
    },
    { _errorHandler: true },
  );
}

exports.makeErrorHandler = makeErrorHandler;
exports.onUncaughtExceptionIntegration = onUncaughtExceptionIntegration;
//# sourceMappingURL=onuncaughtexception.js.map
