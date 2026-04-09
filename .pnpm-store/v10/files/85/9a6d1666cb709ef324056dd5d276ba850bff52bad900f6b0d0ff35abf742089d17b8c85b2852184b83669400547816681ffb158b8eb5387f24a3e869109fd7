import { isInstanceOf } from './is.js';

/**
 * Creates exceptions inside `event.exception.values` for errors that are nested on properties based on the `key` parameter.
 */
function applyAggregateErrorsToEvent(
  exceptionFromErrorImplementation,
  parser,
  key,
  limit,
  event,
  hint,
) {
  if (!event.exception?.values || !hint || !isInstanceOf(hint.originalException, Error)) {
    return;
  }

  // Generally speaking the last item in `event.exception.values` is the exception originating from the original Error
  const originalException =
    event.exception.values.length > 0 ? event.exception.values[event.exception.values.length - 1] : undefined;

  // We only create exception grouping if there is an exception in the event.
  if (originalException) {
    event.exception.values = aggregateExceptionsFromError(
      exceptionFromErrorImplementation,
      parser,
      limit,
      hint.originalException ,
      key,
      event.exception.values,
      originalException,
      0,
    );
  }
}

function aggregateExceptionsFromError(
  exceptionFromErrorImplementation,
  parser,
  limit,
  error,
  key,
  prevExceptions,
  exception,
  exceptionId,
) {
  if (prevExceptions.length >= limit + 1) {
    return prevExceptions;
  }

  let newExceptions = [...prevExceptions];

  // Recursively call this function in order to walk down a chain of errors
  if (isInstanceOf(error[key], Error)) {
    applyExceptionGroupFieldsForParentException(exception, exceptionId, error);
    const newException = exceptionFromErrorImplementation(parser, error[key] );
    const newExceptionId = newExceptions.length;
    applyExceptionGroupFieldsForChildException(newException, key, newExceptionId, exceptionId);
    newExceptions = aggregateExceptionsFromError(
      exceptionFromErrorImplementation,
      parser,
      limit,
      error[key] ,
      key,
      [newException, ...newExceptions],
      newException,
      newExceptionId,
    );
  }

  // This will create exception grouping for AggregateErrors
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AggregateError
  if (isExceptionGroup(error)) {
    error.errors.forEach((childError, i) => {
      if (isInstanceOf(childError, Error)) {
        applyExceptionGroupFieldsForParentException(exception, exceptionId, error);
        const newException = exceptionFromErrorImplementation(parser, childError );
        const newExceptionId = newExceptions.length;
        applyExceptionGroupFieldsForChildException(newException, `errors[${i}]`, newExceptionId, exceptionId);
        newExceptions = aggregateExceptionsFromError(
          exceptionFromErrorImplementation,
          parser,
          limit,
          childError ,
          key,
          [newException, ...newExceptions],
          newException,
          newExceptionId,
        );
      }
    });
  }

  return newExceptions;
}

function isExceptionGroup(error) {
  return Array.isArray(error.errors);
}

function applyExceptionGroupFieldsForParentException(
  exception,
  exceptionId,
  error,
) {
  exception.mechanism = {
    handled: true,
    type: 'auto.core.linked_errors',
    ...(isExceptionGroup(error) && { is_exception_group: true }),
    ...exception.mechanism,
    exception_id: exceptionId,
  };
}

function applyExceptionGroupFieldsForChildException(
  exception,
  source,
  exceptionId,
  parentId,
) {
  exception.mechanism = {
    handled: true,
    ...exception.mechanism,
    type: 'chained',
    source,
    exception_id: exceptionId,
    parent_id: parentId,
  };
}

export { applyAggregateErrorsToEvent };
//# sourceMappingURL=aggregate-errors.js.map
