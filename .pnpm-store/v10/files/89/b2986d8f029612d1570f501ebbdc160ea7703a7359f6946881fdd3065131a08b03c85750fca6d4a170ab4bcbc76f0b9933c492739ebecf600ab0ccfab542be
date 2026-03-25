import { DEBUG_BUILD } from '../debug-build.js';
import { debug } from '../utils/debug-logger.js';
import { forEachEnvelopeItem, envelopeItemTypeToDataCategory, createEnvelope, serializeEnvelope, envelopeContainsItemType } from '../utils/envelope.js';
import { makePromiseBuffer, SENTRY_BUFFER_FULL_ERROR } from '../utils/promisebuffer.js';
import { isRateLimited, updateRateLimits } from '../utils/ratelimit.js';

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
  buffer = makePromiseBuffer(
    options.bufferSize || DEFAULT_TRANSPORT_BUFFER_SIZE,
  ),
) {
  let rateLimits = {};
  const flush = (timeout) => buffer.drain(timeout);

  function send(envelope) {
    const filteredEnvelopeItems = [];

    // Drop rate limited items from envelope
    forEachEnvelopeItem(envelope, (item, type) => {
      const dataCategory = envelopeItemTypeToDataCategory(type);
      if (isRateLimited(rateLimits, dataCategory)) {
        options.recordDroppedEvent('ratelimit_backoff', dataCategory);
      } else {
        filteredEnvelopeItems.push(item);
      }
    });

    // Skip sending if envelope is empty after filtering out rate limited events
    if (filteredEnvelopeItems.length === 0) {
      return Promise.resolve({});
    }

    const filteredEnvelope = createEnvelope(envelope[0], filteredEnvelopeItems );

    // Creates client report for each item in an envelope
    const recordEnvelopeLoss = (reason) => {
      // Don't record outcomes for client reports - we don't want to create a feedback loop if client reports themselves fail to send
      if (envelopeContainsItemType(filteredEnvelope, ['client_report'])) {
        DEBUG_BUILD && debug.warn(`Dropping client report. Will not send outcomes (reason: ${reason}).`);
        return;
      }
      forEachEnvelopeItem(filteredEnvelope, (item, type) => {
        options.recordDroppedEvent(reason, envelopeItemTypeToDataCategory(type));
      });
    };

    const requestTask = () =>
      makeRequest({ body: serializeEnvelope(filteredEnvelope) }).then(
        response => {
          // We don't want to throw on NOK responses, but we want to at least log them
          if (response.statusCode !== undefined && (response.statusCode < 200 || response.statusCode >= 300)) {
            DEBUG_BUILD && debug.warn(`Sentry responded with status code ${response.statusCode} to sent event.`);
          }

          rateLimits = updateRateLimits(rateLimits, response);
          return response;
        },
        error => {
          recordEnvelopeLoss('network_error');
          DEBUG_BUILD && debug.error('Encountered error running transport request:', error);
          throw error;
        },
      );

    return buffer.add(requestTask).then(
      result => result,
      error => {
        if (error === SENTRY_BUFFER_FULL_ERROR) {
          DEBUG_BUILD && debug.error('Skipped sending event because buffer is full.');
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

export { DEFAULT_TRANSPORT_BUFFER_SIZE, createTransport };
//# sourceMappingURL=base.js.map
