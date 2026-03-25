import { format } from 'node:util';
import { _INTERNAL_captureLog } from '@sentry/core';

/**
 * Additional metadata to capture the log with.
 */

/**
 * Capture a log with the given level.
 *
 * @param level - The level of the log.
 * @param message - The message to log.
 * @param attributes - Arbitrary structured data that stores information about the log - e.g., userId: 100.
 */
function captureLog(level, ...args) {
  const [messageOrMessageTemplate, paramsOrAttributes, maybeAttributesOrMetadata, maybeMetadata] = args;
  if (Array.isArray(paramsOrAttributes)) {
    // type-casting here because from the type definitions we know that `maybeAttributesOrMetadata` is an attributes object (or undefined)
    const attributes = { ...(maybeAttributesOrMetadata ) };
    attributes['sentry.message.template'] = messageOrMessageTemplate;
    paramsOrAttributes.forEach((param, index) => {
      attributes[`sentry.message.parameter.${index}`] = param;
    });
    const message = format(messageOrMessageTemplate, ...paramsOrAttributes);
    _INTERNAL_captureLog({ level, message, attributes }, maybeMetadata?.scope);
  } else {
    _INTERNAL_captureLog(
      { level, message: messageOrMessageTemplate, attributes: paramsOrAttributes },
      // type-casting here because from the type definitions we know that `maybeAttributesOrMetadata` is a metadata object (or undefined)
      (maybeAttributesOrMetadata )?.scope ?? maybeMetadata?.scope,
    );
  }
}

export { captureLog };
//# sourceMappingURL=capture.js.map
