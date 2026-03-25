import { DEBUG_BUILD } from '../debug-build.js';
import { defineIntegration } from '../integration.js';
import { debug } from '../utils/debug-logger.js';
import { isError, isPlainObject } from '../utils/is.js';
import { normalize } from '../utils/normalize.js';
import { addNonEnumerableProperty } from '../utils/object.js';
import { truncate } from '../utils/string.js';

const INTEGRATION_NAME = 'ExtraErrorData';

/**
 * Extract additional data for from original exceptions.
 */
const _extraErrorDataIntegration = ((options = {}) => {
  const { depth = 3, captureErrorCause = true } = options;
  return {
    name: INTEGRATION_NAME,
    processEvent(event, hint, client) {
      const { maxValueLength } = client.getOptions();
      return _enhanceEventWithErrorData(event, hint, depth, captureErrorCause, maxValueLength);
    },
  };
}) ;

const extraErrorDataIntegration = defineIntegration(_extraErrorDataIntegration);

function _enhanceEventWithErrorData(
  event,
  hint = {},
  depth,
  captureErrorCause,
  maxValueLength,
) {
  if (!hint.originalException || !isError(hint.originalException)) {
    return event;
  }
  const exceptionName = (hint.originalException ).name || hint.originalException.constructor.name;

  const errorData = _extractErrorData(hint.originalException , captureErrorCause, maxValueLength);

  if (errorData) {
    const contexts = {
      ...event.contexts,
    };

    const normalizedErrorData = normalize(errorData, depth);

    if (isPlainObject(normalizedErrorData)) {
      // We mark the error data as "already normalized" here, because we don't want other normalization procedures to
      // potentially truncate the data we just already normalized, with a certain depth setting.
      addNonEnumerableProperty(normalizedErrorData, '__sentry_skip_normalization__', true);
      contexts[exceptionName] = normalizedErrorData;
    }

    return {
      ...event,
      contexts,
    };
  }

  return event;
}

/**
 * Extract extra information from the Error object
 */
function _extractErrorData(
  error,
  captureErrorCause,
  maxValueLength,
) {
  // We are trying to enhance already existing event, so no harm done if it won't succeed
  try {
    const nativeKeys = [
      'name',
      'message',
      'stack',
      'line',
      'column',
      'fileName',
      'lineNumber',
      'columnNumber',
      'toJSON',
    ];

    const extraErrorInfo = {};

    // We want only enumerable properties, thus `getOwnPropertyNames` is redundant here, as we filter keys anyway.
    for (const key of Object.keys(error)) {
      if (nativeKeys.indexOf(key) !== -1) {
        continue;
      }
      const value = error[key];
      extraErrorInfo[key] =
        isError(value) || typeof value === 'string'
          ? maxValueLength
            ? truncate(`${value}`, maxValueLength)
            : `${value}`
          : value;
    }

    // Error.cause is a standard property that is non enumerable, we therefore need to access it separately.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause
    if (captureErrorCause && error.cause !== undefined) {
      if (isError(error.cause)) {
        const errorName = error.cause.name || error.cause.constructor.name;
        extraErrorInfo.cause = { [errorName]: _extractErrorData(error.cause , false, maxValueLength) };
      } else {
        extraErrorInfo.cause = error.cause;
      }
    }

    // Check if someone attached `toJSON` method to grab even more properties (eg. axios is doing that)
    if (typeof error.toJSON === 'function') {
      const serializedError = error.toJSON() ;

      for (const key of Object.keys(serializedError)) {
        const value = serializedError[key];
        extraErrorInfo[key] = isError(value) ? value.toString() : value;
      }
    }

    return extraErrorInfo;
  } catch (oO) {
    DEBUG_BUILD && debug.error('Unable to extract extra data from the Error object:', oO);
  }

  return null;
}

export { extraErrorDataIntegration };
//# sourceMappingURL=extraerrordata.js.map
