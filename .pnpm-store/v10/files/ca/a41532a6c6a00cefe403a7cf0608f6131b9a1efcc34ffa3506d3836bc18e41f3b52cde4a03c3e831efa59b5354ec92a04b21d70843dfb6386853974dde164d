Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const browserUtils = require('@sentry-internal/browser-utils');
const debugBuild = require('../debug-build.js');

const INTEGRATION_NAME = 'SpotlightBrowser';

const _spotlightIntegration = ((options = {}) => {
  const sidecarUrl = options.sidecarUrl || 'http://localhost:8969/stream';

  return {
    name: INTEGRATION_NAME,
    setup: () => {
      debugBuild.DEBUG_BUILD && core.debug.log('Using Sidecar URL', sidecarUrl);
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
  const makeFetch = browserUtils.getNativeImplementation('fetch');
  let failCount = 0;

  client.on('beforeEnvelope', (envelope) => {
    if (failCount > 3) {
      core.debug.warn('[Spotlight] Disabled Sentry -> Spotlight integration due to too many failed requests:', failCount);
      return;
    }

    makeFetch(sidecarUrl, {
      method: 'POST',
      body: core.serializeEnvelope(envelope),
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
        core.debug.error(
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
const spotlightBrowserIntegration = core.defineIntegration(_spotlightIntegration);

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

exports.INTEGRATION_NAME = INTEGRATION_NAME;
exports.isSpotlightInteraction = isSpotlightInteraction;
exports.spotlightBrowserIntegration = spotlightBrowserIntegration;
//# sourceMappingURL=spotlight.js.map
