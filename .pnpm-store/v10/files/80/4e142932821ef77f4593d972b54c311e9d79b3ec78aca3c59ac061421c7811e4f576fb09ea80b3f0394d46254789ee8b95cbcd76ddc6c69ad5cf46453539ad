Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/** Adds an origin to an OTEL Span. */
function addOriginToSpan(span, origin) {
  span.setAttribute(core.SEMANTIC_ATTRIBUTE_SENTRY_ORIGIN, origin);
}

exports.addOriginToSpan = addOriginToSpan;
//# sourceMappingURL=addOriginToSpan.js.map
