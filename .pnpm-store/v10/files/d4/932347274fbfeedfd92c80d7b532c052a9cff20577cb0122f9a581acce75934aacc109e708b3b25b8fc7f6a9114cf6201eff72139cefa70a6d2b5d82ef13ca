Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentationIoredis = require('@opentelemetry/instrumentation-ioredis');
const instrumentationRedis = require('@opentelemetry/instrumentation-redis');
const core = require('@sentry/core');
const nodeCore = require('@sentry/node-core');
const redisCache = require('../../utils/redisCache.js');

const INTEGRATION_NAME = 'Redis';

/* Only exported for testing purposes */
exports._redisOptions = {};

/* Only exported for testing purposes */
const cacheResponseHook = (
  span,
  redisCommand,
  cmdArgs,
  response,
) => {
  span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, 'auto.db.otel.redis');

  const safeKey = redisCache.getCacheKeySafely(redisCommand, cmdArgs);
  const cacheOperation = redisCache.getCacheOperation(redisCommand);

  if (
    !safeKey ||
    !cacheOperation ||
    !exports._redisOptions.cachePrefixes ||
    !redisCache.shouldConsiderForCache(redisCommand, safeKey, exports._redisOptions.cachePrefixes)
  ) {
    // not relevant for cache
    return;
  }

  // otel/ioredis seems to be using the old standard, as there was a change to those params: https://github.com/open-telemetry/opentelemetry-specification/issues/3199
  // We are using params based on the docs: https://opentelemetry.io/docs/specs/semconv/attributes-registry/network/
  const networkPeerAddress = core.spanToJSON(span).data['net.peer.name'];
  const networkPeerPort = core.spanToJSON(span).data['net.peer.port'];
  if (networkPeerPort && networkPeerAddress) {
    span.setAttributes({ 'network.peer.address': networkPeerAddress, 'network.peer.port': networkPeerPort });
  }

  const cacheItemSize = redisCache.calculateCacheItemSize(response);

  if (cacheItemSize) {
    span.setAttribute(core.SEMANTIC_ATTRIBUTE_CACHE_ITEM_SIZE, cacheItemSize);
  }

  if (redisCache.isInCommands(redisCache.GET_COMMANDS, redisCommand) && cacheItemSize !== undefined) {
    span.setAttribute(core.SEMANTIC_ATTRIBUTE_CACHE_HIT, cacheItemSize > 0);
  }

  span.setAttributes({
    [core.SEMANTIC_ATTRIBUTE_SENTRY_OP]: cacheOperation,
    [core.SEMANTIC_ATTRIBUTE_CACHE_KEY]: safeKey,
  });

  // todo: change to string[] once EAP supports it
  const spanDescription = safeKey.join(', ');

  span.updateName(
    exports._redisOptions.maxCacheKeyLength ? core.truncate(spanDescription, exports._redisOptions.maxCacheKeyLength) : spanDescription,
  );
};

const instrumentIORedis = nodeCore.generateInstrumentOnce(`${INTEGRATION_NAME}.IORedis`, () => {
  return new instrumentationIoredis.IORedisInstrumentation({
    responseHook: cacheResponseHook,
  });
});

const instrumentRedisModule = nodeCore.generateInstrumentOnce(`${INTEGRATION_NAME}.Redis`, () => {
  return new instrumentationRedis.RedisInstrumentation({
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
      exports._redisOptions = options;
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
const redisIntegration = core.defineIntegration(_redisIntegration);

exports.cacheResponseHook = cacheResponseHook;
exports.instrumentRedis = instrumentRedis;
exports.redisIntegration = redisIntegration;
//# sourceMappingURL=redis.js.map
