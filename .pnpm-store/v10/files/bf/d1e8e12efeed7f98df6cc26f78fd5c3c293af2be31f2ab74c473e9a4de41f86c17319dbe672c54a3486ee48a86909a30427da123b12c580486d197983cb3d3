Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const core = require('@sentry/core');

/**
 * This function creates an exception from a JavaScript Error
 */
function exceptionFromError(stackParser, ex) {
  // Get the frames first since Opera can lose the stack if we touch anything else first
  const frames = parseStackFrames(stackParser, ex);

  const exception = {
    type: extractType(ex),
    value: extractMessage(ex),
  };

  if (frames.length) {
    exception.stacktrace = { frames };
  }

  if (exception.type === undefined && exception.value === '') {
    exception.value = 'Unrecoverable error caught';
  }

  return exception;
}

function eventFromPlainObject(
  stackParser,
  exception,
  syntheticException,
  isUnhandledRejection,
) {
  const client = core.getClient();
  const normalizeDepth = client?.getOptions().normalizeDepth;

  // If we can, we extract an exception from the object properties
  const errorFromProp = getErrorPropertyFromObject(exception);

  const extra = {
    __serialized__: core.normalizeToSize(exception, normalizeDepth),
  };

  if (errorFromProp) {
    return {
      exception: {
        values: [exceptionFromError(stackParser, errorFromProp)],
      },
      extra,
    };
  }

  const event = {
    exception: {
      values: [
        {
          type: core.isEvent(exception) ? exception.constructor.name : isUnhandledRejection ? 'UnhandledRejection' : 'Error',
          value: getNonErrorObjectExceptionValue(exception, { isUnhandledRejection }),
        } ,
      ],
    },
    extra,
  } ;

  if (syntheticException) {
    const frames = parseStackFrames(stackParser, syntheticException);
    if (frames.length) {
      // event.exception.values[0] has been set above
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      event.exception.values[0].stacktrace = { frames };
    }
  }

  return event;
}

function eventFromError(stackParser, ex) {
  return {
    exception: {
      values: [exceptionFromError(stackParser, ex)],
    },
  };
}

/** Parses stack frames from an error */
function parseStackFrames(
  stackParser,
  ex,
) {
  // Access and store the stacktrace property before doing ANYTHING
  // else to it because Opera is not very good at providing it
  // reliably in other circumstances.
  const stacktrace = ex.stacktrace || ex.stack || '';

  const skipLines = getSkipFirstStackStringLines(ex);
  const framesToPop = getPopFirstTopFrames(ex);

  try {
    return stackParser(stacktrace, skipLines, framesToPop);
  } catch {
    // no-empty
  }

  return [];
}

// Based on our own mapping pattern - https://github.com/getsentry/sentry/blob/9f08305e09866c8bd6d0c24f5b0aabdd7dd6c59c/src/sentry/lang/javascript/errormapping.py#L83-L108
const reactMinifiedRegexp = /Minified React error #\d+;/i;

/**
 * Certain known React errors contain links that would be falsely
 * parsed as frames. This function check for these errors and
 * returns number of the stack string lines to skip.
 */
function getSkipFirstStackStringLines(ex) {
  if (ex && reactMinifiedRegexp.test(ex.message)) {
    return 1;
  }

  return 0;
}

/**
 * If error has `framesToPop` property, it means that the
 * creator tells us the first x frames will be useless
 * and should be discarded. Typically error from wrapper function
 * which don't point to the actual location in the developer's code.
 *
 * Example: https://github.com/zertosh/invariant/blob/master/invariant.js#L46
 */
function getPopFirstTopFrames(ex) {
  if (typeof ex.framesToPop === 'number') {
    return ex.framesToPop;
  }

  return 0;
}

// https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Exception
// @ts-expect-error - WebAssembly.Exception is a valid class
function isWebAssemblyException(exception) {
  // Check for support
  // @ts-expect-error - WebAssembly.Exception is a valid class
  if (typeof WebAssembly !== 'undefined' && typeof WebAssembly.Exception !== 'undefined') {
    // @ts-expect-error - WebAssembly.Exception is a valid class
    return exception instanceof WebAssembly.Exception;
  } else {
    return false;
  }
}

/**
 * Extracts from errors what we use as the exception `type` in error events.
 *
 * Usually, this is the `name` property on Error objects but WASM errors need to be treated differently.
 */
function extractType(ex) {
  const name = ex?.name;

  // The name for WebAssembly.Exception Errors needs to be extracted differently.
  // Context: https://github.com/getsentry/sentry-javascript/issues/13787
  if (!name && isWebAssemblyException(ex)) {
    // Emscripten sets array[type, message] to the "message" property on the WebAssembly.Exception object
    const hasTypeInMessage = ex.message && Array.isArray(ex.message) && ex.message.length == 2;
    return hasTypeInMessage ? ex.message[0] : 'WebAssembly.Exception';
  }

  return name;
}

/**
 * There are cases where stacktrace.message is an Event object
 * https://github.com/getsentry/sentry-javascript/issues/1949
 * In this specific case we try to extract stacktrace.message.error.message
 */
function extractMessage(ex) {
  const message = ex?.message;

  if (isWebAssemblyException(ex)) {
    // For Node 18, Emscripten sets array[type, message] to the "message" property on the WebAssembly.Exception object
    if (Array.isArray(ex.message) && ex.message.length == 2) {
      return ex.message[1];
    }
    return 'wasm exception';
  }

  if (!message) {
    return 'No error message';
  }

  if (message.error && typeof message.error.message === 'string') {
    return core._INTERNAL_enhanceErrorWithSentryInfo(message.error);
  }

  return core._INTERNAL_enhanceErrorWithSentryInfo(ex);
}

/**
 * Creates an {@link Event} from all inputs to `captureException` and non-primitive inputs to `captureMessage`.
 * @hidden
 */
function eventFromException(
  stackParser,
  exception,
  hint,
  attachStacktrace,
) {
  const syntheticException = hint?.syntheticException || undefined;
  const event = eventFromUnknownInput(stackParser, exception, syntheticException, attachStacktrace);
  core.addExceptionMechanism(event); // defaults to { type: 'generic', handled: true }
  event.level = 'error';
  if (hint?.event_id) {
    event.event_id = hint.event_id;
  }
  return core.resolvedSyncPromise(event);
}

/**
 * Builds and Event from a Message
 * @hidden
 */
function eventFromMessage(
  stackParser,
  message,
  level = 'info',
  hint,
  attachStacktrace,
) {
  const syntheticException = hint?.syntheticException || undefined;
  const event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
  event.level = level;
  if (hint?.event_id) {
    event.event_id = hint.event_id;
  }
  return core.resolvedSyncPromise(event);
}

/**
 * @hidden
 */
function eventFromUnknownInput(
  stackParser,
  exception,
  syntheticException,
  attachStacktrace,
  isUnhandledRejection,
) {
  let event;

  if (core.isErrorEvent(exception ) && (exception ).error) {
    // If it is an ErrorEvent with `error` property, extract it to get actual Error
    const errorEvent = exception ;
    return eventFromError(stackParser, errorEvent.error );
  }

  // If it is a `DOMError` (which is a legacy API, but still supported in some browsers) then we just extract the name
  // and message, as it doesn't provide anything else. According to the spec, all `DOMExceptions` should also be
  // `Error`s, but that's not the case in IE11, so in that case we treat it the same as we do a `DOMError`.
  //
  // https://developer.mozilla.org/en-US/docs/Web/API/DOMError
  // https://developer.mozilla.org/en-US/docs/Web/API/DOMException
  // https://webidl.spec.whatwg.org/#es-DOMException-specialness
  if (core.isDOMError(exception) || core.isDOMException(exception )) {
    const domException = exception ;

    if ('stack' in (exception )) {
      event = eventFromError(stackParser, exception );
    } else {
      const name = domException.name || (core.isDOMError(domException) ? 'DOMError' : 'DOMException');
      const message = domException.message ? `${name}: ${domException.message}` : name;
      event = eventFromString(stackParser, message, syntheticException, attachStacktrace);
      core.addExceptionTypeValue(event, message);
    }
    if ('code' in domException) {
      // eslint-disable-next-line deprecation/deprecation
      event.tags = { ...event.tags, 'DOMException.code': `${domException.code}` };
    }

    return event;
  }
  if (core.isError(exception)) {
    // we have a real Error object, do nothing
    return eventFromError(stackParser, exception);
  }
  if (core.isPlainObject(exception) || core.isEvent(exception)) {
    // If it's a plain object or an instance of `Event` (the built-in JS kind, not this SDK's `Event` type), serialize
    // it manually. This will allow us to group events based on top-level keys which is much better than creating a new
    // group on any key/value change.
    const objectException = exception;
    event = eventFromPlainObject(stackParser, objectException, syntheticException, isUnhandledRejection);
    core.addExceptionMechanism(event, {
      synthetic: true,
    });
    return event;
  }

  // If none of previous checks were valid, then it means that it's not:
  // - an instance of DOMError
  // - an instance of DOMException
  // - an instance of Event
  // - an instance of Error
  // - a valid ErrorEvent (one with an error property)
  // - a plain Object
  //
  // So bail out and capture it as a simple message:
  event = eventFromString(stackParser, exception , syntheticException, attachStacktrace);
  core.addExceptionTypeValue(event, `${exception}`, undefined);
  core.addExceptionMechanism(event, {
    synthetic: true,
  });

  return event;
}

function eventFromString(
  stackParser,
  message,
  syntheticException,
  attachStacktrace,
) {
  const event = {};

  if (attachStacktrace && syntheticException) {
    const frames = parseStackFrames(stackParser, syntheticException);
    if (frames.length) {
      event.exception = {
        values: [{ value: message, stacktrace: { frames } }],
      };
    }
    core.addExceptionMechanism(event, { synthetic: true });
  }

  if (core.isParameterizedString(message)) {
    const { __sentry_template_string__, __sentry_template_values__ } = message;

    event.logentry = {
      message: __sentry_template_string__,
      params: __sentry_template_values__,
    };
    return event;
  }

  event.message = message;
  return event;
}

function getNonErrorObjectExceptionValue(
  exception,
  { isUnhandledRejection },
) {
  const keys = core.extractExceptionKeysForMessage(exception);
  const captureType = isUnhandledRejection ? 'promise rejection' : 'exception';

  // Some ErrorEvent instances do not have an `error` property, which is why they are not handled before
  // We still want to try to get a decent message for these cases
  if (core.isErrorEvent(exception)) {
    return `Event \`ErrorEvent\` captured as ${captureType} with message \`${exception.message}\``;
  }

  if (core.isEvent(exception)) {
    const className = getObjectClassName(exception);
    return `Event \`${className}\` (type=${exception.type}) captured as ${captureType}`;
  }

  return `Object captured as ${captureType} with keys: ${keys}`;
}

function getObjectClassName(obj) {
  try {
    const prototype = Object.getPrototypeOf(obj);
    return prototype ? prototype.constructor.name : undefined;
  } catch {
    // ignore errors here
  }
}

/** If a plain object has a property that is an `Error`, return this error. */
function getErrorPropertyFromObject(obj) {
  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      const value = obj[prop];
      if (value instanceof Error) {
        return value;
      }
    }
  }

  return undefined;
}

exports.eventFromException = eventFromException;
exports.eventFromMessage = eventFromMessage;
exports.eventFromUnknownInput = eventFromUnknownInput;
exports.exceptionFromError = exceptionFromError;
exports.extractMessage = extractMessage;
exports.extractType = extractType;
//# sourceMappingURL=eventbuilder.js.map
