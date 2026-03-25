Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../debug-build.js');
const debugLogger = require('../utils/debug-logger.js');
const spanUtils = require('../utils/spanUtils.js');

/**
 * Print a log message for a started span.
 */
function logSpanStart(span) {
  if (!debugBuild.DEBUG_BUILD) return;

  const { description = '< unknown name >', op = '< unknown op >', parent_span_id: parentSpanId } = spanUtils.spanToJSON(span);
  const { spanId } = span.spanContext();

  const sampled = spanUtils.spanIsSampled(span);
  const rootSpan = spanUtils.getRootSpan(span);
  const isRootSpan = rootSpan === span;

  const header = `[Tracing] Starting ${sampled ? 'sampled' : 'unsampled'} ${isRootSpan ? 'root ' : ''}span`;

  const infoParts = [`op: ${op}`, `name: ${description}`, `ID: ${spanId}`];

  if (parentSpanId) {
    infoParts.push(`parent ID: ${parentSpanId}`);
  }

  if (!isRootSpan) {
    const { op, description } = spanUtils.spanToJSON(rootSpan);
    infoParts.push(`root ID: ${rootSpan.spanContext().spanId}`);
    if (op) {
      infoParts.push(`root op: ${op}`);
    }
    if (description) {
      infoParts.push(`root description: ${description}`);
    }
  }

  debugLogger.debug.log(`${header}
  ${infoParts.join('\n  ')}`);
}

/**
 * Print a log message for an ended span.
 */
function logSpanEnd(span) {
  if (!debugBuild.DEBUG_BUILD) return;

  const { description = '< unknown name >', op = '< unknown op >' } = spanUtils.spanToJSON(span);
  const { spanId } = span.spanContext();
  const rootSpan = spanUtils.getRootSpan(span);
  const isRootSpan = rootSpan === span;

  const msg = `[Tracing] Finishing "${op}" ${isRootSpan ? 'root ' : ''}span "${description}" with ID ${spanId}`;
  debugLogger.debug.log(msg);
}

exports.logSpanEnd = logSpanEnd;
exports.logSpanStart = logSpanStart;
//# sourceMappingURL=logSpans.js.map
