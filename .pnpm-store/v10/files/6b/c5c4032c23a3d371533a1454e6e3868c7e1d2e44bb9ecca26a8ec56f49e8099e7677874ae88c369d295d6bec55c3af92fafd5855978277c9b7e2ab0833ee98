Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const instrumentation = require('@opentelemetry/instrumentation');

/** Exported only for tests. */
const INSTRUMENTED = {};

/**
 * Instrument an OpenTelemetry instrumentation once.
 * This will skip running instrumentation again if it was already instrumented.
 */
function generateInstrumentOnce(
  name,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  creatorOrClass,
  optionsCallback,
) {
  if (optionsCallback) {
    return _generateInstrumentOnceWithOptions(
      name,
      creatorOrClass ,
      optionsCallback,
    );
  }

  return _generateInstrumentOnce(name, creatorOrClass );
}

// The plain version without handling of options
// Should not be used with custom options that are mutated in the creator!
function _generateInstrumentOnce(
  name,
  creator,
) {
  return Object.assign(
    (options) => {
      const instrumented = INSTRUMENTED[name] ;
      if (instrumented) {
        // If options are provided, ensure we update them
        if (options) {
          instrumented.setConfig(options);
        }
        return instrumented;
      }

      const instrumentation$1 = creator(options);
      INSTRUMENTED[name] = instrumentation$1;

      instrumentation.registerInstrumentations({
        instrumentations: [instrumentation$1],
      });

      return instrumentation$1;
    },
    { id: name },
  );
}

// This version handles options properly
function _generateInstrumentOnceWithOptions

(
  name,
  instrumentationClass,
  optionsCallback,
) {
  return Object.assign(
    (_options) => {
      const options = optionsCallback(_options);

      const instrumented = INSTRUMENTED[name] ;
      if (instrumented) {
        // Ensure we update options
        instrumented.setConfig(options);
        return instrumented;
      }

      const instrumentation$1 = new instrumentationClass(options) ;
      INSTRUMENTED[name] = instrumentation$1;

      instrumentation.registerInstrumentations({
        instrumentations: [instrumentation$1],
      });

      return instrumentation$1;
    },
    { id: name },
  );
}

/**
 * Ensure a given callback is called when the instrumentation is actually wrapping something.
 * This can be used to ensure some logic is only called when the instrumentation is actually active.
 *
 * This function returns a function that can be invoked with a callback.
 * This callback will either be invoked immediately
 * (e.g. if the instrumentation was already wrapped, or if _wrap could not be patched),
 * or once the instrumentation is actually wrapping something.
 *
 * Make sure to call this function right after adding the instrumentation, otherwise it may be too late!
 * The returned callback can be used any time, and also multiple times.
 */
function instrumentWhenWrapped(instrumentation) {
  let isWrapped = false;
  let callbacks = [];

  if (!hasWrap(instrumentation)) {
    isWrapped = true;
  } else {
    const originalWrap = instrumentation['_wrap'];

    instrumentation['_wrap'] = (...args) => {
      isWrapped = true;
      callbacks.forEach(callback => callback());
      callbacks = [];
      return originalWrap(...args);
    };
  }

  const registerCallback = (callback) => {
    if (isWrapped) {
      callback();
    } else {
      callbacks.push(callback);
    }
  };

  return registerCallback;
}

function hasWrap(
  instrumentation,
) {
  return typeof (instrumentation )['_wrap'] === 'function';
}

exports.INSTRUMENTED = INSTRUMENTED;
exports.generateInstrumentOnce = generateInstrumentOnce;
exports.instrumentWhenWrapped = instrumentWhenWrapped;
//# sourceMappingURL=instrument.js.map
