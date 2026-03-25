Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const is = require('./is.js');
const misc = require('./misc.js');
const normalize = require('./normalize.js');
const object = require('./object.js');

/**
 * Extracts stack frames from the error.stack string
 */
function parseStackFrames(stackParser, error) {
  return stackParser(error.stack || '', 1);
}

function hasSentryFetchUrlHost(error) {
  return is.isError(error) && '__sentry_fetch_url_host__' in error && typeof error.__sentry_fetch_url_host__ === 'string';
}

/**
 * Enhances the error message with the hostname for better Sentry error reporting.
 * This allows third-party packages to still match on the original error message,
 * while Sentry gets the enhanced version with context.
 *
 * Only used internally
 * @hidden
 */
function _enhanceErrorWithSentryInfo(error) {
  // If the error has a __sentry_fetch_url_host__ property (added by fetch instrumentation),
  // enhance the error message with the hostname.
  if (hasSentryFetchUrlHost(error)) {
    return `${error.message} (${error.__sentry_fetch_url_host__})`;
  }

  return error.message;
}

/**
 * Extracts stack frames from the error and builds a Sentry Exception
 */
function exceptionFromError(stackParser, error) {
  const exception = {
    type: error.name || error.constructor.name,
    value: _enhanceErrorWithSentryInfo(error),
  };

  const frames = parseStackFrames(stackParser, error);
  if (frames.length) {
    exception.stacktrace = { frames };
  }

  return exception;
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

function getMessageForObject(exception) {
  if ('name' in exception && typeof exception.name === 'string') {
    let message = `'${exception.name}' captured as exception`;

    if ('message' in exception && typeof exception.message === 'string') {
      message += ` with message '${exception.message}'`;
    }

    return message;
  } else if ('message' in exception && typeof exception.message === 'string') {
    return exception.message;
  }

  const keys = object.extractExceptionKeysForMessage(exception);

  // Some ErrorEvent instances do not have an `error` property, which is why they are not handled before
  // We still want to try to get a decent message for these cases
  if (is.isErrorEvent(exception)) {
    return `Event \`ErrorEvent\` captured as exception with message \`${exception.message}\``;
  }

  const className = getObjectClassName(exception);

  return `${
    className && className !== 'Object' ? `'${className}'` : 'Object'
  } captured as exception with keys: ${keys}`;
}

function getObjectClassName(obj) {
  try {
    const prototype = Object.getPrototypeOf(obj);
    return prototype ? prototype.constructor.name : undefined;
  } catch {
    // ignore errors here
  }
}

function getException(
  client,
  mechanism,
  exception,
  hint,
) {
  if (is.isError(exception)) {
    return [exception, undefined];
  }

  // Mutate this!
  mechanism.synthetic = true;

  if (is.isPlainObject(exception)) {
    const normalizeDepth = client?.getOptions().normalizeDepth;
    const extras = { ['__serialized__']: normalize.normalizeToSize(exception, normalizeDepth) };

    const errorFromProp = getErrorPropertyFromObject(exception);
    if (errorFromProp) {
      return [errorFromProp, extras];
    }

    const message = getMessageForObject(exception);
    const ex = hint?.syntheticException || new Error(message);
    ex.message = message;

    return [ex, extras];
  }

  // This handles when someone does: `throw "something awesome";`
  // We use synthesized Error here so we can extract a (rough) stack trace.
  const ex = hint?.syntheticException || new Error(exception );
  ex.message = `${exception}`;

  return [ex, undefined];
}

/**
 * Builds and Event from a Exception
 * @hidden
 */
function eventFromUnknownInput(
  client,
  stackParser,
  exception,
  hint,
) {
  const providedMechanism = hint?.data && (hint.data ).mechanism;
  const mechanism = providedMechanism || {
    handled: true,
    type: 'generic',
  };

  const [ex, extras] = getException(client, mechanism, exception, hint);

  const event = {
    exception: {
      values: [exceptionFromError(stackParser, ex)],
    },
  };

  if (extras) {
    event.extra = extras;
  }

  misc.addExceptionTypeValue(event, undefined, undefined);
  misc.addExceptionMechanism(event, mechanism);

  return {
    ...event,
    event_id: hint?.event_id,
  };
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
  const event = {
    event_id: hint?.event_id,
    level,
  };

  if (attachStacktrace && hint?.syntheticException) {
    const frames = parseStackFrames(stackParser, hint.syntheticException);
    if (frames.length) {
      event.exception = {
        values: [
          {
            value: message,
            stacktrace: { frames },
          },
        ],
      };
      misc.addExceptionMechanism(event, { synthetic: true });
    }
  }

  if (is.isParameterizedString(message)) {
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

exports._enhanceErrorWithSentryInfo = _enhanceErrorWithSentryInfo;
exports.eventFromMessage = eventFromMessage;
exports.eventFromUnknownInput = eventFromUnknownInput;
exports.exceptionFromError = exceptionFromError;
exports.parseStackFrames = parseStackFrames;
//# sourceMappingURL=eventbuilder.js.map
