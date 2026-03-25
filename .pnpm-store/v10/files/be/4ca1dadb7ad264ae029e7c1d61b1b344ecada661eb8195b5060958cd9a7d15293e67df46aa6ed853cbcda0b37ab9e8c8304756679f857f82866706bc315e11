Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * Merge two baggage headers into one, where the existing one takes precedence.
 * The order of the existing baggage will be preserved, and new entries will be added to the end.
 */
function mergeBaggageHeaders(
  existing,
  baggage,
) {
  if (!existing) {
    return baggage;
  }

  const existingBaggageEntries = core.parseBaggageHeader(existing);
  const newBaggageEntries = core.parseBaggageHeader(baggage);

  if (!newBaggageEntries) {
    return existing;
  }

  // Existing entries take precedence, ensuring order remains stable for minimal changes
  const mergedBaggageEntries = { ...existingBaggageEntries };
  Object.entries(newBaggageEntries).forEach(([key, value]) => {
    if (!mergedBaggageEntries[key]) {
      mergedBaggageEntries[key] = value;
    }
  });

  return core.objectToBaggageHeader(mergedBaggageEntries);
}

exports.mergeBaggageHeaders = mergeBaggageHeaders;
//# sourceMappingURL=baggage.js.map
