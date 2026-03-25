Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const integration = require('../integration.js');
const metadata = require('../metadata.js');
const envelope = require('../utils/envelope.js');

/**
 * Adds module metadata to stack frames.
 *
 * Metadata can be injected by the Sentry bundler plugins using the `moduleMetadata` config option.
 *
 * When this integration is added, the metadata passed to the bundler plugin is added to the stack frames of all events
 * under the `module_metadata` property. This can be used to help in tagging or routing of events from different teams
 * our sources
 */
const moduleMetadataIntegration = integration.defineIntegration(() => {
  return {
    name: 'ModuleMetadata',
    setup(client) {
      // We need to strip metadata from stack frames before sending them to Sentry since these are client side only.
      client.on('beforeEnvelope', envelope$1 => {
        envelope.forEachEnvelopeItem(envelope$1, (item, type) => {
          if (type === 'event') {
            const event = Array.isArray(item) ? (item )[1] : undefined;

            if (event) {
              metadata.stripMetadataFromStackFrames(event);
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
        metadata.addMetadataToStackFrames(stackParser, event);
      });
    },
  };
});

exports.moduleMetadataIntegration = moduleMetadataIntegration;
//# sourceMappingURL=moduleMetadata.js.map
