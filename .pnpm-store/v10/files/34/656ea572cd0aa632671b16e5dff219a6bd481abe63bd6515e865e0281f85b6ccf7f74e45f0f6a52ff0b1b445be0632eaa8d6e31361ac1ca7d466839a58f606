import { defineIntegration, debug, serializeEnvelope } from '@sentry/core';
import { getNativeImplementation } from '@sentry-internal/browser-utils';
import { DEBUG_BUILD } from '../debug-build.js';

const INTEGRATION_NAME = 'SpotlightBrowser';

const _spotlightIntegration = ((options = {}) => {
  const sidecarUrl = options.sidecarUrl || 'http://localhost:8969/stream';

  return {
    name: INTEGRATION_NAME,
    setup: () => {
      DEBUG_BUILD && debug.log('Using Sidecar URL', sidecarUrl);
    },
    // We don't want to send interaction transactions/root spans created from
    // clicks within Spotlight to Sentry. Neither do we want them to be sent to
    // spotlight.
    processEvent: event => (isSpotlightInteraction(event) ? null : event),
    afterAllSetup: (client) => {
      setupSidecarForwarding(client, sidecarUrl);
    },
  };
}) ;

function setupSidecarForwarding(client, sidecarUrl) {
  const makeFetch = getNativeImplementation('fetch');
  let failCount = 0;

  client.on('beforeEnvelope', (envelope) => {
    if (failCount > 3) {
      debug.warn('[Spotlight] Disabled Sentry -> Spotlight integration due to too many failed requests:', failCount);
      return;
    }

    makeFetch(sidecarUrl, {
      method: 'POST',
      body: serializeEnvelope(envelope),
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      mode: 'cors',
    }).then(
      res => {
        if (res.status >= 200 && res.status < 400) {
          // Reset failed requests counter on success
          failCount = 0;
        }
      },
      err => {
        failCount++;
        debug.error(
          "Sentry SDK can't connect to Sidecar is it running? See: https://spotlightjs.com/sidecar/npx/",
          err,
        );
      },
    );
  });
}

/**
 * Use this integration to send errors and transactions to Spotlight.
 *
 * Learn more about spotlight at https://spotlightjs.com
 */
const spotlightBrowserIntegration = defineIntegration(_spotlightIntegration);

/**
 * Flags if the event is a transaction created from an interaction with the spotlight UI.
 */
function isSpotlightInteraction(event) {
  return Boolean(
    event.type === 'transaction' &&
      event.spans &&
      event.contexts?.trace &&
      event.contexts.trace.op === 'ui.action.click' &&
      event.spans.some(({ description }) => description?.includes('#sentry-spotlight')),
  );
}

export { INTEGRATION_NAME, isSpotlightInteraction, spotlightBrowserIntegration };
//# sourceMappingURL=spotlight.js.map
