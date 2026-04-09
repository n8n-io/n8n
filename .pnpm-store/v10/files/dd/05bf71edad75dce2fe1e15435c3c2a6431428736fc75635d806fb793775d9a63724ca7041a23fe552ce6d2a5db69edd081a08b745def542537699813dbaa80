Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../debug-build.js');
const debugLogger = require('../utils/debug-logger.js');
const envelope = require('../utils/envelope.js');
const promisebuffer = require('../utils/promisebuffer.js');
const ratelimit = require('../utils/ratelimit.js');

const DEFAULT_TRANSPORT_BUFFER_SIZE = 64;

/**
 * Creates an instance of a Sentry `Transport`
 *
 * @param options
 * @param makeRequest
 */
function createTransport(
  options,
  makeRequest,
  buffer = promisebuffer.makePromiseBuffer(
    options.bufferSize || DEFAULT_TRANSPORT_BUFFER_SIZE,
  ),
) {
  let rateLimits = {};
  const flush = (timeout) => buffer.drain(timeout);

  function send(envelope$1) {
    const filteredEnvelopeItems = [];

    // Drop rate limited items from envelope
    envelope.forEachEnvelopeItem(envelope$1, (item, type) => {
      const dataCategory = envelope.envelopeItemTypeToDataCategory(type);
      if (ratelimit.isRateLimited(rateLimits, dataCategory)) {
        options.recordDroppedEvent('ratelimit_backoff', dataCategory);
      } else {
        filteredEnvelopeItems.push(item);
      }
    });

    // Skip sending if envelope is empty after filtering out rate limited events
    if (filteredEnvelopeItems.length === 0) {
      return Promise.resolve({});
    }

    const filteredEnvelope = envelope.createEnvelope(envelope$1[0], filteredEnvelopeItems );

    // Creates client report for each item in an envelope
    const recordEnvelopeLoss = (reason) => {
      // Don't record outcomes for client reports - we don't want to create a feedback loop if client reports themselves fail to send
      if (envelope.envelopeContainsItemType(filteredEnvelope, ['client_report'])) {
        debugBuild.DEBUG_BUILD && debugLogger.debug.warn(`Dropping client report. Will not send outcomes (reason: ${reason}).`);
        return;
      }
      envelope.forEachEnvelopeItem(filteredEnvelope, (item, type) => {
        options.recordDroppedEvent(reason, envelope.envelopeItemTypeToDataCategory(type));
      });
    };

    const requestTask = () =>
      makeRequest({ body: envelope.serializeEnvelope(filteredEnvelope) }).then(
        response => {
          // Handle 413 Content Too Large
          // Loss of envelope content is expected so we record a send_error client report
          // https://develop.sentry.dev/sdk/expected-features/#dealing-with-network-failures
          if (response.statusCode === 413) {
            debugBuild.DEBUG_BUILD &&
              debugLogger.debug.error(
                'Sentry responded with status code 413. Envelope was discarded due to exceeding size limits.',
              );
            recordEnvelopeLoss('send_error');
            return response;
          }

          // We don't want to throw on NOK responses, but we want to at least log them
          if (
            debugBuild.DEBUG_BUILD &&
            response.statusCode !== undefined &&
            (response.statusCode < 200 || response.statusCode >= 300)
          ) {
            debugLogger.debug.warn(`Sentry responded with status code ${response.statusCode} to sent event.`);
          }

          rateLimits = ratelimit.updateRateLimits(rateLimits, response);
          return response;
        },
        error => {
          recordEnvelopeLoss('network_error');
          debugBuild.DEBUG_BUILD && debugLogger.debug.error('Encountered error running transport request:', error);
          throw error;
        },
      );

    return buffer.add(requestTask).then(
      result => result,
      error => {
        if (error === promisebuffer.SENTRY_BUFFER_FULL_ERROR) {
          debugBuild.DEBUG_BUILD && debugLogger.debug.error('Skipped sending event because buffer is full.');
          recordEnvelopeLoss('queue_overflow');
          return Promise.resolve({});
        } else {
          throw error;
        }
      },
    );
  }

  return {
    send,
    flush,
  };
}

exports.DEFAULT_TRANSPORT_BUFFER_SIZE = DEFAULT_TRANSPORT_BUFFER_SIZE;
exports.createTransport = createTransport;
//# sourceMappingURL=base.js.map
