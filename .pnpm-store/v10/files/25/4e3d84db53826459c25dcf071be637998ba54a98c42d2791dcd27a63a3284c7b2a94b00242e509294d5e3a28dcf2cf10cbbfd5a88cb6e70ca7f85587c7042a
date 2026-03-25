Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const debugBuild = require('../debug-build.js');
const semanticAttributes = require('../semanticAttributes.js');
const debugLogger = require('../utils/debug-logger.js');
const spanUtils = require('../utils/spanUtils.js');

/**
 * Adds a measurement to the active transaction on the current global scope. You can optionally pass in a different span
 * as the 4th parameter.
 */
function setMeasurement(name, value, unit, activeSpan = spanUtils.getActiveSpan()) {
  const rootSpan = activeSpan && spanUtils.getRootSpan(activeSpan);

  if (rootSpan) {
    debugBuild.DEBUG_BUILD && debugLogger.debug.log(`[Measurement] Setting measurement on root span: ${name} = ${value} ${unit}`);
    rootSpan.addEvent(name, {
      [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE]: value,
      [semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT]: unit ,
    });
  }
}

/**
 * Convert timed events to measurements.
 */
function timedEventsToMeasurements(events) {
  if (!events || events.length === 0) {
    return undefined;
  }

  const measurements = {};
  events.forEach(event => {
    const attributes = event.attributes || {};
    const unit = attributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_UNIT] ;
    const value = attributes[semanticAttributes.SEMANTIC_ATTRIBUTE_SENTRY_MEASUREMENT_VALUE] ;

    if (typeof unit === 'string' && typeof value === 'number') {
      measurements[event.name] = { value, unit };
    }
  });

  return measurements;
}

exports.setMeasurement = setMeasurement;
exports.timedEventsToMeasurements = timedEventsToMeasurements;
//# sourceMappingURL=measurement.js.map
