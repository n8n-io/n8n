import { defineIntegration } from '../integration.js';
import { addMetadataToStackFrames, stripMetadataFromStackFrames } from '../metadata.js';
import { forEachEnvelopeItem } from '../utils/envelope.js';

/**
 * Adds module metadata to stack frames.
 *
 * Metadata can be injected by the Sentry bundler plugins using the `moduleMetadata` config option.
 *
 * When this integration is added, the metadata passed to the bundler plugin is added to the stack frames of all events
 * under the `module_metadata` property. This can be used to help in tagging or routing of events from different teams
 * our sources
 */
const moduleMetadataIntegration = defineIntegration(() => {
  return {
    name: 'ModuleMetadata',
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
  };
});

export { moduleMetadataIntegration };
//# sourceMappingURL=moduleMetadata.js.map
