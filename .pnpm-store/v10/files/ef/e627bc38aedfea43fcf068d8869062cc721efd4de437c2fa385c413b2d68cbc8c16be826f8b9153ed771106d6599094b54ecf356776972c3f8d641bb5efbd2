import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis';
import { defineIntegration, SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, spanToJSON, SEMANTIC_ATTRIBUTE_CACHE_ITEM_SIZE, SEMANTIC_ATTRIBUTE_CACHE_HIT, SEMANTIC_ATTRIBUTE_CACHE_KEY, SEMANTIC_ATTRIBUTE_SENTRY_OP, truncate } from '@sentry/core';
import { generateInstrumentOnce } from '@sentry/node-core';
import { getCacheKeySafely, getCacheOperation, shouldConsiderForCache, calculateCacheItemSize, isInCommands, GET_COMMANDS } from '../../utils/redisCache.js';

const INTEGRATION_NAME = 'Redis';

/* Only exported for testing purposes */
let _redisOptions = {};

/* Only exported for testing purposes */
const cacheResponseHook = (
  span,
  redisCommand,
  cmdArgs,
  response,
) => {
  span.setAttribute(SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.redis');

  const safeKey = getCacheKeySafely(redisCommand, cmdArgs);
  const cacheOperation = getCacheOperation(redisCommand);

  if (
    !safeKey ||
    !cacheOperation ||
    !_redisOptions.cachePrefixes ||
    !shouldConsiderForCache(redisCommand, safeKey, _redisOptions.cachePrefixes)
  ) {
    // not relevant for cache
    return;
  }

  // otel/ioredis seems to be using the old standard, as there was a change to those params: https://github.com/open-telemetry/opentelemetry-specification/issues/3199
  // We are using params based on the docs: https://opentelemetry.io/docs/specs/semconv/attributes-registry/network/
  const networkPeerAddress = spanToJSON(span).data['net.peer.name'];
  const networkPeerPort = spanToJSON(span).data['net.peer.port'];
  if (networkPeerPort && networkPeerAddress) {
    span.setAttributes({ 'network.peer.address': networkPeerAddress, 'network.peer.port': networkPeerPort });
  }

  const cacheItemSize = calculateCacheItemSize(response);

  if (cacheItemSize) {
    span.setAttribute(SEMANTIC_ATTRIBUTE_CACHE_ITEM_SIZE, cacheItemSize);
  }

  if (isInCommands(GET_COMMANDS, redisCommand) && cacheItemSize !== undefined) {
    span.setAttribute(SEMANTIC_ATTRIBUTE_CACHE_HIT, cacheItemSize > 0);
  }

  span.setAttributes({
    [SEMANTIC_ATTRIBUTE_SENTRY_OP]: cacheOperation,
    [SEMANTIC_ATTRIBUTE_CACHE_KEY]: safeKey,
  });

  // todo: change to string[] once EAP supports it
  const spanDescription = safeKey.join(', ');

  span.updateName(
    _redisOptions.maxCacheKeyLength ? truncate(spanDescription, _redisOptions.maxCacheKeyLength) : spanDescription,
  );
};

const instrumentIORedis = generateInstrumentOnce(`${INTEGRATION_NAME}.IORedis`, () => {
  return new IORedisInstrumentation({
    responseHook: cacheResponseHook,
  });
});

const instrumentRedisModule = generateInstrumentOnce(`${INTEGRATION_NAME}.Redis`, () => {
  return new RedisInstrumentation({
    responseHook: cacheResponseHook,
  });
});

/** To be able to preload all Redis OTel instrumentations with just one ID ("Redis"), all the instrumentations are generated in this one function  */
const instrumentRedis = Object.assign(
  () => {
    instrumentIORedis();
    instrumentRedisModule();

    // todo: implement them gradually
    // new LegacyRedisInstrumentation({}),
  },
  { id: INTEGRATION_NAME },
);

const _redisIntegration = ((options = {}) => {
  return {
    name: INTEGRATION_NAME,
    setupOnce() {
      _redisOptions = options;
      instrumentRedis();
    },
  };
}) ;

/**
 * Adds Sentry tracing instrumentation for the [redis](https://www.npmjs.com/package/redis) and
 * [ioredis](https://www.npmjs.com/package/ioredis) libraries.
 *
 * For more information, see the [`redisIntegration` documentation](https://docs.sentry.io/platforms/javascript/guides/node/configuration/integrations/redis/).
 *
 * @example
 * ```javascript
 * const Sentry = require('@sentry/node');
 *
 * Sentry.init({
 *  integrations: [Sentry.redisIntegration()],
 * });
 * ```
 */
const redisIntegration = defineIntegration(_redisIntegration);

export { _redisOptions, cacheResponseHook, instrumentRedis, redisIntegration };
//# sourceMappingURL=redis.js.map
