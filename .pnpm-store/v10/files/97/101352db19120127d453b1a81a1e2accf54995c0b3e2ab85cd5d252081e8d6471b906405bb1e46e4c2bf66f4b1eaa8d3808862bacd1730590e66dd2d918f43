"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class JestAssertionError extends Error {
  constructor(result, callsite) {
    super(typeof result.message === 'function' ? result.message() : result.message);
    this.matcherResult = result;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, callsite);
    }
  }

}

const wrapMatcher = (matcher, customMessage, config) => {
  const newMatcher = (...args) => {
    try {
      const result = matcher(...args);

      if (result && typeof result.then === 'function') {
        return result.catch(rethrowWithMessage).catch(function handleError(error) {
          throw new JestAssertionError(error.matcherResult, handleError);
        });
      } else {
        return result;
      }
    } catch (e) {
      rethrowWithMessage(e);
    }

    function rethrowWithMessage(error) {
      if (!error.matcherResult) {
        throw error;
      }

      const {
        matcherResult
      } = error;

      if (typeof customMessage !== 'string' || customMessage.length < 1) {
        throw new JestAssertionError(matcherResult, newMatcher);
      }

      const matcherMessage = typeof error.matcherResult.message === 'function' ? error.matcherResult.message() : error.matcherResult.message;
      const messagePrefix = config.showPrefix ? 'Custom message:\n  ' : '';

      const message = () => messagePrefix + customMessage + (config.showMatcherMessage ? '\n\n' + matcherMessage : '');

      const e = new JestAssertionError({ ...matcherResult,
        message
      }, newMatcher);

      if (!config.showStack) {
        e.stack = null;
      }

      throw e;
    }
  };

  return newMatcher;
};

const wrapMatchers = (matchers, customMessage, config) => {
  return Object.keys(matchers).reduce((acc, name) => {
    const matcher = matchers[name];

    if (typeof matcher === 'function') {
      acc[name] = wrapMatcher(matcher, customMessage, config);
    } else {
      acc[name] = wrapMatchers(matcher, customMessage, config); // recurse on .not/.resolves/.rejects
    }

    return acc;
  }, {});
};

var _default = expect => {
  // proxy the expect function
  let expectProxy = Object.assign((actual, customMessage, options = {}) => {
    const config = {
      showMatcherMessage: typeof options.showMatcherMessage === 'boolean' ? options.showMatcherMessage : true,
      showPrefix: typeof options.showPrefix === 'boolean' ? options.showPrefix : true,
      showStack: typeof options.showStack === 'boolean' ? options.showStack : true
    };
    let matchers = expect(actual); // partially apply expect to get all matchers and chain them

    if (customMessage) {
      // only pay the cost of proxying matchers if we received a customMessage
      matchers = wrapMatchers(matchers, customMessage, config);
    }

    return matchers;
  }, expect // clone additional properties on expect
  );

  expectProxy.extend = o => {
    expect.extend(o); // add new matchers to expect

    expectProxy = Object.assign(expectProxy, expect); // clone new asymmetric matchers
  };

  return expectProxy;
};

exports.default = _default;