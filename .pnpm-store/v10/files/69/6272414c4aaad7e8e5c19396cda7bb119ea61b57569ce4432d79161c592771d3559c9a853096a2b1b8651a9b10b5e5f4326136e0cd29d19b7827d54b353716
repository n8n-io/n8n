import { defineIntegration } from '../integration.js';
import { stripMetadataFromStackFrames, addMetadataToStackFrames } from '../metadata.js';
import { forEachEnvelopeItem } from '../utils/envelope.js';
import { getFramesFromEvent } from '../utils/stacktrace.js';

/**
 * This integration allows you to filter out, or tag error events that do not come from user code marked with a bundle key via the Sentry bundler plugins.
 */
const thirdPartyErrorFilterIntegration = defineIntegration((options) => {
  return {
    name: 'ThirdPartyErrorsFilter',
    setup(client) {
      // We need to strip metadata from stack frames before sending them to Sentry since these are client side only.
      client.on('beforeEnvelope', envelope => {
        forEachEnvelopeItem(envelope, (item, type) => {
          if (type === 'event') {
            const event = Array.isArray(item) ? (item )[1] : undefined;

            if (event) {
              stripMetadataFromStackFrames(event);
              item[1] = event;
            }
          }
        });
      });

      client.on('applyFrameMetadata', event => {
        // Only apply stack frame metadata to error events
        if (event.type) {
          return;
        }

        const stackParser = client.getOptions().stackParser;
        addMetadataToStackFrames(stackParser, event);
      });
    },

    processEvent(event) {
      const frameKeys = getBundleKeysForAllFramesWithFilenames(event, options.ignoreSentryInternalFrames);

      if (frameKeys) {
        const arrayMethod =
          options.behaviour === 'drop-error-if-contains-third-party-frames' ||
          options.behaviour === 'apply-tag-if-contains-third-party-frames'
            ? 'some'
            : 'every';

        const behaviourApplies = frameKeys[arrayMethod](keys => !keys.some(key => options.filterKeys.includes(key)));

        if (behaviourApplies) {
          const shouldDrop =
            options.behaviour === 'drop-error-if-contains-third-party-frames' ||
            options.behaviour === 'drop-error-if-exclusively-contains-third-party-frames';
          if (shouldDrop) {
            return null;
          } else {
            event.tags = {
              ...event.tags,
              third_party_code: true,
            };
          }
        }
      }

      return event;
    },
  };
});

/**
 * Checks if a stack frame is a Sentry internal frame by strictly matching:
 * 1. The frame must be the last frame in the stack
 * 2. The filename must indicate the internal helpers file
 * 3. The context_line must contain the exact pattern "fn.apply(this, wrappedArguments)"
 * 4. The comment pattern "Attempt to invoke user-land function" must be present in pre_context
 *
 */
function isSentryInternalFrame(frame, frameIndex) {
  // Only match the last frame (index 0 in reversed stack)
  if (frameIndex !== 0 || !frame.context_line || !frame.filename) {
    return false;
  }

  if (
    !frame.filename.includes('sentry') ||
    !frame.filename.includes('helpers') || // Filename would look something like this: 'node_modules/@sentry/browser/build/npm/esm/helpers.js'
    !frame.context_line.includes(SENTRY_INTERNAL_FN_APPLY) // Must have context_line with the exact fn.apply pattern
  ) {
    return false;
  }

  // Check pre_context array for comment pattern
  if (frame.pre_context) {
    const len = frame.pre_context.length;
    for (let i = 0; i < len; i++) {
      if (frame.pre_context[i]?.includes(SENTRY_INTERNAL_COMMENT)) {
        return true;
      }
    }
  }

  return false;
}

function getBundleKeysForAllFramesWithFilenames(
  event,
  ignoreSentryInternalFrames,
) {
  const frames = getFramesFromEvent(event);

  if (!frames) {
    return undefined;
  }

  return frames
    .filter((frame, index) => {
      // Exclude frames without a filename
      if (!frame.filename) {
        return false;
      }
      // Exclude frames without location info, since these are likely native code or built-ins.
      // JS frames have lineno/colno, WASM frames have instruction_addr instead.
      if (frame.lineno == null && frame.colno == null && frame.instruction_addr == null) {
        return false;
      }
      // Optionally ignore Sentry internal frames
      return !ignoreSentryInternalFrames || !isSentryInternalFrame(frame, index);
    })
    .map(frame => {
      if (!frame.module_metadata) {
        return [];
      }
      return Object.keys(frame.module_metadata)
        .filter(key => key.startsWith(BUNDLER_PLUGIN_APP_KEY_PREFIX))
        .map(key => key.slice(BUNDLER_PLUGIN_APP_KEY_PREFIX.length));
    });
}

const BUNDLER_PLUGIN_APP_KEY_PREFIX = '_sentryBundlerPluginAppKey:';
const SENTRY_INTERNAL_COMMENT = 'Attempt to invoke user-land function';
const SENTRY_INTERNAL_FN_APPLY = 'fn.apply(this, wrappedArguments)';

export { thirdPartyErrorFilterIntegration };
//# sourceMappingURL=third-party-errors-filter.js.map
