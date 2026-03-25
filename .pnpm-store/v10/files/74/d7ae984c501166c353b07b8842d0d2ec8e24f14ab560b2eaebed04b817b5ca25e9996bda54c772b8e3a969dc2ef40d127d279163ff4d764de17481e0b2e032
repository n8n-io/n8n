/**
 * Parse a sample rate from a given value.
 * This will either return a boolean or number sample rate, if the sample rate is valid (between 0 and 1).
 * If a string is passed, we try to convert it to a number.
 *
 * Any invalid sample rate will return `undefined`.
 */
function parseSampleRate(sampleRate) {
  if (typeof sampleRate === 'boolean') {
    return Number(sampleRate);
  }

  const rate = typeof sampleRate === 'string' ? parseFloat(sampleRate) : sampleRate;
  if (typeof rate !== 'number' || isNaN(rate) || rate < 0 || rate > 1) {
    return undefined;
  }

  return rate;
}

export { parseSampleRate };
//# sourceMappingURL=parseSampleRate.js.map
