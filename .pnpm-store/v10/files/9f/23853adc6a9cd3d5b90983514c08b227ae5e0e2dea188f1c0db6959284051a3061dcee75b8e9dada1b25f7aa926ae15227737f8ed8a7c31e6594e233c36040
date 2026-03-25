import { DEBUG_BUILD } from '../debug-build.js';
import { debug } from '../utils/debug-logger.js';
import { envelopeContainsItemType } from '../utils/envelope.js';
import { parseRetryAfterHeader } from '../utils/ratelimit.js';

const MIN_DELAY = 100; // 100 ms
const START_DELAY = 5000; // 5 seconds
const MAX_DELAY = 3.6e6; // 1 hour

/**
 * Wraps a transport and stores and retries events when they fail to send.
 *
 * @param createTransport The transport to wrap.
 */
function makeOfflineTransport(
  createTransport,
) {
  function log(...args) {
    DEBUG_BUILD && debug.log('[Offline]:', ...args);
  }

  return options => {
    const transport = createTransport(options);

    if (!options.createStore) {
      throw new Error('No `createStore` function was provided');
    }

    const store = options.createStore(options);

    let retryDelay = START_DELAY;
    let flushTimer;

    function shouldQueue(env, error, retryDelay) {
      // We want to drop client reports because they can be generated when we retry sending events while offline.
      if (envelopeContainsItemType(env, ['client_report'])) {
        return false;
      }

      if (options.shouldStore) {
        return options.shouldStore(env, error, retryDelay);
      }

      return true;
    }

    function flushIn(delay) {
      if (flushTimer) {
        clearTimeout(flushTimer );
      }

      flushTimer = setTimeout(async () => {
        flushTimer = undefined;

        const found = await store.shift();
        if (found) {
          log('Attempting to send previously queued event');

          // We should to update the sent_at timestamp to the current time.
          found[0].sent_at = new Date().toISOString();

          void send(found, true).catch(e => {
            log('Failed to retry sending', e);
          });
        }
      }, delay) ;

      // We need to unref the timer in node.js, otherwise the node process never exit.
      if (typeof flushTimer !== 'number' && flushTimer.unref) {
        flushTimer.unref();
      }
    }

    function flushWithBackOff() {
      if (flushTimer) {
        return;
      }

      flushIn(retryDelay);

      retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
    }

    async function send(envelope, isRetry = false) {
      // We queue all replay envelopes to avoid multiple replay envelopes being sent at the same time. If one fails, we
      // need to retry them in order.
      if (!isRetry && envelopeContainsItemType(envelope, ['replay_event', 'replay_recording'])) {
        await store.push(envelope);
        flushIn(MIN_DELAY);
        return {};
      }

      try {
        if (options.shouldSend && (await options.shouldSend(envelope)) === false) {
          throw new Error('Envelope not sent because `shouldSend` callback returned false');
        }

        const result = await transport.send(envelope);

        let delay = MIN_DELAY;

        if (result) {
          // If there's a retry-after header, use that as the next delay.
          if (result.headers?.['retry-after']) {
            delay = parseRetryAfterHeader(result.headers['retry-after']);
          } else if (result.headers?.['x-sentry-rate-limits']) {
            delay = 60000; // 60 seconds
          } // If we have a server error, return now so we don't flush the queue.
          else if ((result.statusCode || 0) >= 400) {
            return result;
          }
        }

        flushIn(delay);
        retryDelay = START_DELAY;
        return result;
      } catch (e) {
        if (await shouldQueue(envelope, e , retryDelay)) {
          // If this envelope was a retry, we want to add it to the front of the queue so it's retried again first.
          if (isRetry) {
            await store.unshift(envelope);
          } else {
            await store.push(envelope);
          }
          flushWithBackOff();
          log('Error sending. Event queued.', e );
          return {};
        } else {
          throw e;
        }
      }
    }

    if (options.flushAtStartup) {
      flushWithBackOff();
    }

    return {
      send,
      flush: timeout => {
        // If there's no timeout, we should attempt to flush the offline queue.
        if (timeout === undefined) {
          retryDelay = START_DELAY;
          flushIn(MIN_DELAY);
        }

        return transport.flush(timeout);
      },
    };
  };
}

export { MIN_DELAY, START_DELAY, makeOfflineTransport };
//# sourceMappingURL=offline.js.map
