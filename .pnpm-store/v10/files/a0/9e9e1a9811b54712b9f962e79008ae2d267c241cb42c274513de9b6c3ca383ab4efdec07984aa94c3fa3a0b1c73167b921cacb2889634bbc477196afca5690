Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

const INTEGRATION_NAME = 'ProcessSession';

/**
 * Records a Session for the current process to track release health.
 */
const processSessionIntegration = core.defineIntegration(() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      core.startSession();

      // Emitted in the case of healthy sessions, error of `mechanism.handled: true` and unhandledrejections because
      // The 'beforeExit' event is not emitted for conditions causing explicit termination,
      // such as calling process.exit() or uncaught exceptions.
      // Ref: https://nodejs.org/api/process.html#process_event_beforeexit
      process.on('beforeExit', () => {
        const session = core.getIsolationScope().getSession();

        // Only call endSession, if the Session exists on Scope and SessionStatus is not a
        // Terminal Status i.e. Exited or Crashed because
        // "When a session is moved away from ok it must not be updated anymore."
        // Ref: https://develop.sentry.dev/sdk/sessions/
        if (session?.status !== 'ok') {
          core.endSession();
        }
      });
    },
  };
});

exports.processSessionIntegration = processSessionIntegration;
//# sourceMappingURL=processSession.js.map
