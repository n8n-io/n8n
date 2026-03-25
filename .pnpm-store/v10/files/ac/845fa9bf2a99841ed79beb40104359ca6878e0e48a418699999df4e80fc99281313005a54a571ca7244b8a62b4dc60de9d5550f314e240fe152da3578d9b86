Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const debugBuild = require('../debug-build.js');
const helpers = require('../helpers.js');
const startProfileForSpan = require('./startProfileForSpan.js');
const UIProfiler = require('./UIProfiler.js');
const utils = require('./utils.js');

const INTEGRATION_NAME = 'BrowserProfiling';

const _browserProfilingIntegration = (() => {
  return {
    name: INTEGRATION_NAME,
    setup(client) {
      const options = client.getOptions() ;
      const profiler = new UIProfiler.UIProfiler();

      if (!utils.hasLegacyProfiling(options) && !options.profileLifecycle) {
        // Set default lifecycle mode
        options.profileLifecycle = 'manual';
      }

      // eslint-disable-next-line deprecation/deprecation
      if (utils.hasLegacyProfiling(options) && !options.profilesSampleRate) {
        debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] Profiling disabled, no profiling options found.');
        return;
      }

      const activeSpan = core.getActiveSpan();
      const rootSpan = activeSpan && core.getRootSpan(activeSpan);

      if (utils.hasLegacyProfiling(options) && options.profileSessionSampleRate !== undefined) {
        debugBuild.DEBUG_BUILD &&
          core.debug.warn(
            '[Profiling] Both legacy profiling (`profilesSampleRate`) and UI profiling settings are defined. `profileSessionSampleRate` has no effect when legacy profiling is enabled.',
          );
      }

      // UI PROFILING (Profiling V2)
      if (!utils.hasLegacyProfiling(options)) {
        const lifecycleMode = options.profileLifecycle;

        // Registering hooks in all lifecycle modes to be able to notify users in case they want to start/stop the profiler manually in `trace` mode
        client.on('startUIProfiler', () => profiler.start());
        client.on('stopUIProfiler', () => profiler.stop());

        if (lifecycleMode === 'manual') {
          profiler.initialize(client);
        } else if (lifecycleMode === 'trace') {
          if (!core.hasSpansEnabled(options)) {
            debugBuild.DEBUG_BUILD &&
              core.debug.warn(
                "[Profiling] `profileLifecycle` is 'trace' but tracing is disabled. Set a `tracesSampleRate` or `tracesSampler` to enable span tracing.",
              );
            return;
          }

          profiler.initialize(client);

          // If there is an active, sampled root span already, notify the profiler
          if (rootSpan) {
            profiler.notifyRootSpanActive(rootSpan);
          }

          // In case rootSpan is created slightly after setup -> schedule microtask to re-check and notify.
          helpers.WINDOW.setTimeout(() => {
            const laterActiveSpan = core.getActiveSpan();
            const laterRootSpan = laterActiveSpan && core.getRootSpan(laterActiveSpan);
            if (laterRootSpan) {
              profiler.notifyRootSpanActive(laterRootSpan);
            }
          }, 0);
        }
      } else {
        // LEGACY PROFILING (v1)
        if (rootSpan && utils.isAutomatedPageLoadSpan(rootSpan)) {
          if (utils.shouldProfileSpanLegacy(rootSpan)) {
            startProfileForSpan.startProfileForSpan(rootSpan);
          }
        }

        client.on('spanStart', (span) => {
          if (span === core.getRootSpan(span) && utils.shouldProfileSpanLegacy(span)) {
            startProfileForSpan.startProfileForSpan(span);
          }
        });

        client.on('beforeEnvelope', (envelope) => {
          // if not profiles are in queue, there is nothing to add to the envelope.
          if (!utils.getActiveProfilesCount()) {
            return;
          }

          const profiledTransactionEvents = utils.findProfiledTransactionsFromEnvelope(envelope);
          if (!profiledTransactionEvents.length) {
            return;
          }

          const profilesToAddToEnvelope = [];

          for (const profiledTransaction of profiledTransactionEvents) {
            const context = profiledTransaction?.contexts;
            const profile_id = context?.profile?.['profile_id'];
            const start_timestamp = context?.profile?.['start_timestamp'];

            if (typeof profile_id !== 'string') {
              debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] cannot find profile for a span without a profile context');
              continue;
            }

            if (!profile_id) {
              debugBuild.DEBUG_BUILD && core.debug.log('[Profiling] cannot find profile for a span without a profile context');
              continue;
            }

            // Remove the profile from the span context before sending, relay will take care of the rest.
            if (context?.profile) {
              delete context.profile;
            }

            const profile = utils.takeProfileFromGlobalCache(profile_id);
            if (!profile) {
              debugBuild.DEBUG_BUILD && core.debug.log(`[Profiling] Could not retrieve profile for span: ${profile_id}`);
              continue;
            }

            const profileEvent = utils.createProfilingEvent(
              profile_id,
              start_timestamp ,
              profile,
              profiledTransaction ,
            );
            if (profileEvent) {
              profilesToAddToEnvelope.push(profileEvent);
            }
          }

          utils.addProfilesToEnvelope(envelope , profilesToAddToEnvelope);
        });
      }
    },
    processEvent(event) {
      return utils.attachProfiledThreadToEvent(event);
    },
  };
}) ;

const browserProfilingIntegration = core.defineIntegration(_browserProfilingIntegration);

exports.browserProfilingIntegration = browserProfilingIntegration;
//# sourceMappingURL=integration.js.map
