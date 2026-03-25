Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const api = require('../api.js');
const dsn = require('../utils/dsn.js');
const envelope = require('../utils/envelope.js');

/**
 * Key used in event.extra to provide routing information for the multiplexed transport.
 * Should contain an array of `{ dsn: string, release?: string }` objects.
 */
const MULTIPLEXED_TRANSPORT_EXTRA_KEY = 'MULTIPLEXED_TRANSPORT_EXTRA_KEY';

/**
 * Gets an event from an envelope.
 *
 * This is only exported for use in the tests
 */
function eventFromEnvelope(env, types) {
  let event;

  envelope.forEachEnvelopeItem(env, (item, type) => {
    if (types.includes(type)) {
      event = Array.isArray(item) ? (item )[1] : undefined;
    }
    // bail out if we found an event
    return !!event;
  });

  return event;
}

/**
 * Creates a transport that overrides the release on all events.
 */
function makeOverrideReleaseTransport(
  createTransport,
  release,
) {
  return options => {
    const transport = createTransport(options);

    return {
      ...transport,
      send: async (envelope) => {
        const event = eventFromEnvelope(envelope, ['event', 'transaction', 'profile', 'replay_event']);

        if (event) {
          event.release = release;
        }
        return transport.send(envelope);
      },
    };
  };
}

/** Overrides the DSN in the envelope header  */
function overrideDsn(envelope$1, dsn) {
  return envelope.createEnvelope(
    dsn
      ? {
          ...envelope$1[0],
          dsn,
        }
      : envelope$1[0],
    envelope$1[1],
  );
}

/**
 * Creates a transport that can send events to different DSNs depending on the envelope contents.
 *
 * If no matcher is provided, the transport will look for routing information in
 * `event.extra[MULTIPLEXED_TRANSPORT_EXTRA_KEY]`, which should contain
 * an array of `{ dsn: string, release?: string }` objects.
 */
function makeMultiplexedTransport(
  createTransport,
  matcher,
) {
  return options => {
    const fallbackTransport = createTransport(options);
    const otherTransports = new Map();

    // Use provided matcher or default to simple multiplexed transport behavior
    const actualMatcher =
      matcher ||
      (args => {
        const event = args.getEvent();
        if (
          event?.extra?.[MULTIPLEXED_TRANSPORT_EXTRA_KEY] &&
          Array.isArray(event.extra[MULTIPLEXED_TRANSPORT_EXTRA_KEY])
        ) {
          return event.extra[MULTIPLEXED_TRANSPORT_EXTRA_KEY];
        }
        return [];
      });

    function getTransport(dsn$1, release) {
      // We create a transport for every unique dsn/release combination as there may be code from multiple releases in
      // use at the same time
      const key = release ? `${dsn$1}:${release}` : dsn$1;

      let transport = otherTransports.get(key);

      if (!transport) {
        const validatedDsn = dsn.dsnFromString(dsn$1);
        if (!validatedDsn) {
          return undefined;
        }
        const url = api.getEnvelopeEndpointWithUrlEncodedAuth(validatedDsn, options.tunnel);

        transport = release
          ? makeOverrideReleaseTransport(createTransport, release)({ ...options, url })
          : createTransport({ ...options, url });

        otherTransports.set(key, transport);
      }

      return [dsn$1, transport];
    }

    async function send(envelope) {
      function getEvent(types) {
        const eventTypes = types?.length ? types : ['event'];
        return eventFromEnvelope(envelope, eventTypes);
      }

      const transports = actualMatcher({ envelope, getEvent })
        .map(result => {
          if (typeof result === 'string') {
            return getTransport(result, undefined);
          } else {
            return getTransport(result.dsn, result.release);
          }
        })
        .filter((t) => !!t);

      // If we have no transports to send to, use the fallback transport
      // Don't override the DSN in the header for the fallback transport. '' is falsy
      const transportsWithFallback = transports.length ? transports : [['', fallbackTransport]];

      const results = (await Promise.all(
        transportsWithFallback.map(([dsn, transport]) => transport.send(overrideDsn(envelope, dsn))),
      )) ;

      return results[0];
    }

    async function flush(timeout) {
      const allTransports = [...otherTransports.values(), fallbackTransport];
      const results = await Promise.all(allTransports.map(transport => transport.flush(timeout)));
      return results.every(r => r);
    }

    return {
      send,
      flush,
    };
  };
}

exports.MULTIPLEXED_TRANSPORT_EXTRA_KEY = MULTIPLEXED_TRANSPORT_EXTRA_KEY;
exports.eventFromEnvelope = eventFromEnvelope;
exports.makeMultiplexedTransport = makeMultiplexedTransport;
//# sourceMappingURL=multiplexed.js.map
