Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const currentScopes = require('../currentScopes.js');
const debugBuild = require('../debug-build.js');
const debugLogger = require('./debug-logger.js');
const spanUtils = require('./spanUtils.js');

/**
 * Ordered LRU cache for storing feature flags in the scope context. The name
 * of each flag in the buffer is unique, and the output of getAll() is ordered
 * from oldest to newest.
 */

/**
 * Max size of the LRU flag buffer stored in Sentry scope and event contexts.
 */
const _INTERNAL_FLAG_BUFFER_SIZE = 100;

/**
 * Max number of flag evaluations to record per span.
 */
const _INTERNAL_MAX_FLAGS_PER_SPAN = 10;

const SPAN_FLAG_ATTRIBUTE_PREFIX = 'flag.evaluation.';

/**
 * Copies feature flags that are in current scope context to the event context
 */
function _INTERNAL_copyFlagsFromScopeToEvent(event) {
  const scope = currentScopes.getCurrentScope();
  const flagContext = scope.getScopeData().contexts.flags;
  const flagBuffer = flagContext ? flagContext.values : [];

  if (!flagBuffer.length) {
    return event;
  }

  if (event.contexts === undefined) {
    event.contexts = {};
  }
  event.contexts.flags = { values: [...flagBuffer] };
  return event;
}

/**
 * Inserts a flag into the current scope's context while maintaining ordered LRU properties.
 * Not thread-safe. After inserting:
 * - The flag buffer is sorted in order of recency, with the newest evaluation at the end.
 * - The names in the buffer are always unique.
 * - The length of the buffer never exceeds `maxSize`.
 *
 * @param name     Name of the feature flag to insert.
 * @param value    Value of the feature flag.
 * @param maxSize  Max number of flags the buffer should store. Default value should always be used in production.
 */
function _INTERNAL_insertFlagToScope(
  name,
  value,
  maxSize = _INTERNAL_FLAG_BUFFER_SIZE,
) {
  const scopeContexts = currentScopes.getCurrentScope().getScopeData().contexts;
  if (!scopeContexts.flags) {
    scopeContexts.flags = { values: [] };
  }
  const flags = scopeContexts.flags.values;
  _INTERNAL_insertToFlagBuffer(flags, name, value, maxSize);
}

/**
 * Exported for tests only. Currently only accepts boolean values (otherwise no-op).
 * Inserts a flag into a FeatureFlag array while maintaining the following properties:
 * - Flags are sorted in order of recency, with the newest evaluation at the end.
 * - The flag names are always unique.
 * - The length of the array never exceeds `maxSize`.
 *
 * @param flags      The buffer to insert the flag into.
 * @param name       Name of the feature flag to insert.
 * @param value      Value of the feature flag.
 * @param maxSize    Max number of flags the buffer should store. Default value should always be used in production.
 */
function _INTERNAL_insertToFlagBuffer(
  flags,
  name,
  value,
  maxSize,
) {
  if (typeof value !== 'boolean') {
    return;
  }

  if (flags.length > maxSize) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.error(`[Feature Flags] insertToFlagBuffer called on a buffer larger than maxSize=${maxSize}`);
    return;
  }

  // Check if the flag is already in the buffer - O(n)
  const index = flags.findIndex(f => f.flag === name);

  if (index !== -1) {
    // The flag was found, remove it from its current position - O(n)
    flags.splice(index, 1);
  }

  if (flags.length === maxSize) {
    // If at capacity, pop the earliest flag - O(n)
    flags.shift();
  }

  // Push the flag to the end - O(1)
  flags.push({
    flag: name,
    result: value,
  });
}

/**
 * Records a feature flag evaluation for the active span. This is a no-op for non-boolean values.
 * The flag and its value is stored in span attributes with the `flag.evaluation` prefix. Once the
 * unique flags for a span reaches maxFlagsPerSpan, subsequent flags are dropped.
 *
 * @param name             Name of the feature flag.
 * @param value            Value of the feature flag. Non-boolean values are ignored.
 * @param maxFlagsPerSpan  Max number of flags a buffer should store. Default value should always be used in production.
 */
function _INTERNAL_addFeatureFlagToActiveSpan(
  name,
  value,
  maxFlagsPerSpan = _INTERNAL_MAX_FLAGS_PER_SPAN,
) {
  if (typeof value !== 'boolean') {
    return;
  }

  const span = spanUtils.getActiveSpan();
  if (!span) {
    return;
  }

  const attributes = spanUtils.spanToJSON(span).data;

  // If the flag already exists, always update it
  if (`${SPAN_FLAG_ATTRIBUTE_PREFIX}${name}` in attributes) {
    span.setAttribute(`${SPAN_FLAG_ATTRIBUTE_PREFIX}${name}`, value);
    return;
  }

  // Else, add the flag to the span if we have not reached the max number of flags
  const numOfAddedFlags = Object.keys(attributes).filter(key => key.startsWith(SPAN_FLAG_ATTRIBUTE_PREFIX)).length;
  if (numOfAddedFlags < maxFlagsPerSpan) {
    span.setAttribute(`${SPAN_FLAG_ATTRIBUTE_PREFIX}${name}`, value);
  }
}

exports._INTERNAL_FLAG_BUFFER_SIZE = _INTERNAL_FLAG_BUFFER_SIZE;
exports._INTERNAL_MAX_FLAGS_PER_SPAN = _INTERNAL_MAX_FLAGS_PER_SPAN;
exports._INTERNAL_addFeatureFlagToActiveSpan = _INTERNAL_addFeatureFlagToActiveSpan;
exports._INTERNAL_copyFlagsFromScopeToEvent = _INTERNAL_copyFlagsFromScopeToEvent;
exports._INTERNAL_insertFlagToScope = _INTERNAL_insertFlagToScope;
exports._INTERNAL_insertToFlagBuffer = _INTERNAL_insertToFlagBuffer;
//# sourceMappingURL=featureFlags.js.map
