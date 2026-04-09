Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const SEQUENCE_ATTR_KEY = 'sentry.timestamp.sequence';

let _sequenceNumber = 0;
let _previousTimestampMs;

/**
 * Returns the `sentry.timestamp.sequence` attribute entry for a serialized telemetry item.
 *
 * The sequence number starts at 0 and increments by 1 for each item captured.
 * It resets to 0 when the current item's integer millisecond timestamp differs
 * from the previous item's integer millisecond timestamp.
 *
 * @param timestampInSeconds - The timestamp of the telemetry item in seconds.
 */
function getSequenceAttribute(timestampInSeconds)

 {
  const nowMs = Math.floor(timestampInSeconds * 1000);

  if (_previousTimestampMs !== undefined && nowMs !== _previousTimestampMs) {
    _sequenceNumber = 0;
  }

  const value = _sequenceNumber;
  _sequenceNumber++;
  _previousTimestampMs = nowMs;

  return {
    key: SEQUENCE_ATTR_KEY,
    value: { value, type: 'integer' },
  };
}

exports.getSequenceAttribute = getSequenceAttribute;
//# sourceMappingURL=timestampSequence.js.map
