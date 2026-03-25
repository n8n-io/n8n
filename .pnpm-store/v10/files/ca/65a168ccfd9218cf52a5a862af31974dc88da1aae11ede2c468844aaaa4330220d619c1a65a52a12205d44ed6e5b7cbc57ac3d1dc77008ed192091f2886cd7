Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../debug-build.js');
const debugLogger = require('./debug-logger.js');
const string = require('./string.js');

function logIgnoredSpan(droppedSpan) {
  debugLogger.debug.log(`Ignoring span ${droppedSpan.op} - ${droppedSpan.description} because it matches \`ignoreSpans\`.`);
}

/**
 * Check if a span should be ignored based on the ignoreSpans configuration.
 */
function shouldIgnoreSpan(
  span,
  ignoreSpans,
) {
  if (!ignoreSpans?.length || !span.description) {
    return false;
  }

  for (const pattern of ignoreSpans) {
    if (isStringOrRegExp(pattern)) {
      if (string.isMatchingPattern(span.description, pattern)) {
        debugBuild.DEBUG_BUILD && logIgnoredSpan(span);
        return true;
      }
      continue;
    }

    if (!pattern.name && !pattern.op) {
      continue;
    }

    const nameMatches = pattern.name ? string.isMatchingPattern(span.description, pattern.name) : true;
    const opMatches = pattern.op ? span.op && string.isMatchingPattern(span.op, pattern.op) : true;

    // This check here is only correct because we can guarantee that we ran `isMatchingPattern`
    // for at least one of `nameMatches` and `opMatches`. So in contrary to how this looks,
    // not both op and name actually have to match. This is the most efficient way to check
    // for all combinations of name and op patterns.
    if (nameMatches && opMatches) {
      debugBuild.DEBUG_BUILD && logIgnoredSpan(span);
      return true;
    }
  }

  return false;
}

/**
 * Takes a list of spans, and a span that was dropped, and re-parents the child spans of the dropped span to the parent of the dropped span, if possible.
 * This mutates the spans array in place!
 */
function reparentChildSpans(spans, dropSpan) {
  const droppedSpanParentId = dropSpan.parent_span_id;
  const droppedSpanId = dropSpan.span_id;

  // This should generally not happen, as we do not apply this on root spans
  // but to be safe, we just bail in this case
  if (!droppedSpanParentId) {
    return;
  }

  for (const span of spans) {
    if (span.parent_span_id === droppedSpanId) {
      span.parent_span_id = droppedSpanParentId;
    }
  }
}

function isStringOrRegExp(value) {
  return typeof value === 'string' || value instanceof RegExp;
}

exports.reparentChildSpans = reparentChildSpans;
exports.shouldIgnoreSpan = shouldIgnoreSpan;
//# sourceMappingURL=should-ignore-span.js.map
