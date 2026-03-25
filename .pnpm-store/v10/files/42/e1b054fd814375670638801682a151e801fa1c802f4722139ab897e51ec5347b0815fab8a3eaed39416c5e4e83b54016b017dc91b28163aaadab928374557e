Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');
const eventbuilder = require('../eventbuilder.js');

const DEFAULT_KEY = 'cause';
const DEFAULT_LIMIT = 5;

const INTEGRATION_NAME = 'LinkedErrors';

const _linkedErrorsIntegration = ((options = {}) => {
  const limit = options.limit || DEFAULT_LIMIT;
  const key = options.key || DEFAULT_KEY;

  return {
    name: INTEGRATION_NAME,
    preprocessEvent(event, hint, client) {
      const options = client.getOptions();

      core.applyAggregateErrorsToEvent(
        // This differs from the LinkedErrors integration in core by using a different exceptionFromError function
        eventbuilder.exceptionFromError,
        options.stackParser,
        key,
        limit,
        event,
        hint,
      );
    },
  };
}) ;

/**
 * Aggregrate linked errors in an event.
 */
const linkedErrorsIntegration = core.defineIntegration(_linkedErrorsIntegration);

exports.linkedErrorsIntegration = linkedErrorsIntegration;
//# sourceMappingURL=linkederrors.js.map
