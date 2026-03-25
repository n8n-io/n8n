import { defineIntegration, startSession, getIsolationScope, endSession } from '@sentry/core';

const INTEGRATION_NAME = 'ProcessSession';

/**
 * Records a Session for the current process to track release health.
 */
const processSessionIntegration = defineIntegration(() => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      startSession();

      // Emitted in the case of healthy sessions, error of `mechanism.handled: true` and unhandledrejections because
      // The 'beforeExit' event is not emitted for conditions causing explicit termination,
      // such as calling process.exit() or uncaught exceptions.
      // Ref: https://nodejs.org/api/process.html#process_event_beforeexit
      process.on('beforeExit', () => {
        const session = getIsolationScope().getSession();

        // Only call endSession, if the Session exists on Scope and SessionStatus is not a
        // Terminal Status i.e. Exited or Crashed because
        // "When a session is moved away from ok it must not be updated anymore."
        // Ref: https://develop.sentry.dev/sdk/sessions/
        if (session?.status !== 'ok') {
          endSession();
        }
      });
    },
  };
});

export { processSessionIntegration };
//# sourceMappingURL=processSession.js.map
