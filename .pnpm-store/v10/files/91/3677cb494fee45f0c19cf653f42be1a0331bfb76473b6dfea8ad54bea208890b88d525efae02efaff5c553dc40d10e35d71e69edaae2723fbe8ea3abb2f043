Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const misc = require('./misc.js');

/**
 * Generate a random, valid trace ID.
 */
function generateTraceId() {
  return misc.uuid4();
}

/**
 * Generate a random, valid span ID.
 */
function generateSpanId() {
  return misc.uuid4().substring(16);
}

exports.generateSpanId = generateSpanId;
exports.generateTraceId = generateTraceId;
//# sourceMappingURL=propagationContext.js.map
