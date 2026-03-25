import { timestampInSeconds, debug, spanToJSON, uuid4, getCurrentScope } from '@sentry/core';
import { DEBUG_BUILD } from '../debug-build.js';
import { WINDOW } from '../helpers.js';
import { isAutomatedPageLoadSpan, startJSSelfProfile, MAX_PROFILE_DURATION_MS, addProfileToGlobalCache } from './utils.js';

/**
 * Wraps startTransaction and stopTransaction with profiling related logic.
 * startProfileForTransaction is called after the call to startTransaction in order to avoid our own code from
 * being profiled. Because of that same reason, stopProfiling is called before the call to stopTransaction.
 */
function startProfileForSpan(span) {
  // Start the profiler and get the profiler instance.
  let startTimestamp;
  if (isAutomatedPageLoadSpan(span)) {
    startTimestamp = timestampInSeconds() * 1000;
  }

  const profiler = startJSSelfProfile();

  // We failed to construct the profiler, so we skip.
  // No need to log anything as this has already been logged in startProfile.
  if (!profiler) {
    return;
  }

  if (DEBUG_BUILD) {
    debug.log(`[Profiling] started profiling span: ${spanToJSON(span).description}`);
  }

  // We create "unique" span names to avoid concurrent spans with same names
  // from being ignored by the profiler. From here on, only this span name should be used when
  // calling the profiler methods. Note: we log the original name to the user to avoid confusion.
  const profileId = uuid4();

  // A couple of important things to note here:
  // `CpuProfilerBindings.stopProfiling` will be scheduled to run in 30seconds in order to exceed max profile duration.
  // Whichever of the two (span.finish/timeout) is first to run, the profiling will be stopped and the gathered profile
  // will be processed when the original span is finished. Since onProfileHandler can be invoked multiple times in the
  // event of an error or user mistake (calling span.finish multiple times), it is important that the behavior of onProfileHandler
  // is idempotent as we do not want any timings or profiles to be overridden by the last call to onProfileHandler.
  // After the original finish method is called, the event will be reported through the integration and delegated to transport.
  let processedProfile = null;

  getCurrentScope().setContext('profile', {
    profile_id: profileId,
    start_timestamp: startTimestamp,
  });

  /**
   * Idempotent handler for profile stop
   */
  async function onProfileHandler() {
    // Check if the profile exists and return it the behavior has to be idempotent as users may call span.finish multiple times.
    if (!span) {
      return;
    }
    // Satisfy the type checker, but profiler will always be defined here.
    if (!profiler) {
      return;
    }
    if (processedProfile) {
      if (DEBUG_BUILD) {
        debug.log('[Profiling] profile for:', spanToJSON(span).description, 'already exists, returning early');
      }
      return;
    }

    return profiler
      .stop()
      .then((profile) => {
        if (maxDurationTimeoutID) {
          WINDOW.clearTimeout(maxDurationTimeoutID);
          maxDurationTimeoutID = undefined;
        }

        if (DEBUG_BUILD) {
          debug.log(`[Profiling] stopped profiling of span: ${spanToJSON(span).description}`);
        }

        // In case of an overlapping span, stopProfiling may return null and silently ignore the overlapping profile.
        if (!profile) {
          if (DEBUG_BUILD) {
            debug.log(
              `[Profiling] profiler returned null profile for: ${spanToJSON(span).description}`,
              'this may indicate an overlapping span or a call to stopProfiling with a profile title that was never started',
            );
          }
          return;
        }

        processedProfile = profile;
        addProfileToGlobalCache(profileId, profile);
      })
      .catch(error => {
        if (DEBUG_BUILD) {
          debug.log('[Profiling] error while stopping profiler:', error);
        }
      });
  }

  // Enqueue a timeout to prevent profiles from running over max duration.
  let maxDurationTimeoutID = WINDOW.setTimeout(() => {
    if (DEBUG_BUILD) {
      debug.log('[Profiling] max profile duration elapsed, stopping profiling for:', spanToJSON(span).description);
    }
    // If the timeout exceeds, we want to stop profiling, but not finish the span
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    onProfileHandler();
  }, MAX_PROFILE_DURATION_MS);

  // We need to reference the original end call to avoid creating an infinite loop
  const originalEnd = span.end.bind(span);

  /**
   * Wraps span `end()` with profiling related logic.
   * startProfiling is called after the call to spanStart in order to avoid our own code from
   * being profiled. Because of that same reason, stopProfiling is called before the call to spanEnd.
   */
  function profilingWrappedSpanEnd() {
    if (!span) {
      return originalEnd();
    }
    // onProfileHandler should always return the same profile even if this is called multiple times.
    // Always call onProfileHandler to ensure stopProfiling is called and the timeout is cleared.
    void onProfileHandler().then(
      () => {
        originalEnd();
      },
      () => {
        // If onProfileHandler fails, we still want to call the original finish method.
        originalEnd();
      },
    );

    return span;
  }

  span.end = profilingWrappedSpanEnd;
}

export { startProfileForSpan };
//# sourceMappingURL=startProfileForSpan.js.map
