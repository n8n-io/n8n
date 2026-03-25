'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var getType = _interopDefault(require('should-type'));
var eql = _interopDefault(require('should-equal'));
var sformat = _interopDefault(require('should-format'));
var shouldTypeAdaptors = require('should-type-adaptors');
var shouldUtil = require('should-util');

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */
function isWrapperType(obj) {
  return obj instanceof Number || obj instanceof String || obj instanceof Boolean;
}

// XXX make it more strict: numbers, strings, symbols - and nothing else
function convertPropertyName(name) {
  return typeof name === "symbol" ? name : String(name);
}

var functionName = sformat.functionName;

function isPlainObject(obj) {
  if (typeof obj == "object" && obj !== null) {
    var proto = Object.getPrototypeOf(obj);
    return proto === Object.prototype || proto === null;
  }

  return false;
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

var config = {
  typeAdaptors: shouldTypeAdaptors.defaultTypeAdaptorStorage,

  getFormatter: function(opts) {
    return new sformat.Formatter(opts || config);
  }
};

function format(value, opts) {
  return config.getFormatter(opts).format(value);
}

function formatProp(value) {
  var formatter = config.getFormatter();
  return sformat.formatPlainObjectKey.call(formatter, value);
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */
/**
 * should AssertionError
 * @param {Object} options
 * @constructor
 * @memberOf should
 * @static
 */
function AssertionError(options) {
  shouldUtil.merge(this, options);

  if (!options.message) {
    Object.defineProperty(this, "message", {
      get: function() {
        if (!this._message) {
          this._message = this.generateMessage();
          this.generatedMessage = true;
        }
        return this._message;
      },
      configurable: true,
      enumerable: false
    });
  }

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.stackStartFunction);
  } else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      if (this.stackStartFunction) {
        // try to strip useless frames
        var fn_name = functionName(this.stackStartFunction);
        var idx = out.indexOf("\n" + fn_name);
        if (idx >= 0) {
          // once we have located the function frame
          // we need to strip out everything before it (and its line)
          var next_line = out.indexOf("\n", idx + 1);
          out = out.substring(next_line + 1);
        }
      }

      this.stack = out;
    }
  }
}

var indent = "    ";
function prependIndent(line) {
  return indent + line;
}

function indentLines(text) {
  return text
    .split("\n")
    .map(prependIndent)
    .join("\n");
}

// assert.AssertionError instanceof Error
AssertionError.prototype = Object.create(Error.prototype, {
  name: {
    value: "AssertionError"
  },

  generateMessage: {
    value: function() {
      if (!this.operator && this.previous) {
        return this.previous.message;
      }
      var actual = format(this.actual);
      var expected = "expected" in this ? " " + format(this.expected) : "";
      var details =
        "details" in this && this.details ? " (" + this.details + ")" : "";

      var previous = this.previous
        ? "\n" + indentLines(this.previous.message)
        : "";

      return (
        "expected " +
        actual +
        (this.negate ? " not " : " ") +
        this.operator +
        expected +
        details +
        previous
      );
    }
  }
});

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

// a bit hacky way how to get error to do not have stack
function LightAssertionError(options) {
  shouldUtil.merge(this, options);

  if (!options.message) {
    Object.defineProperty(this, "message", {
      get: function() {
        if (!this._message) {
          this._message = this.generateMessage();
          this.generatedMessage = true;
        }
        return this._message;
      }
    });
  }
}

LightAssertionError.prototype = {
  generateMessage: AssertionError.prototype.generateMessage
};

/**
 * should Assertion
 * @param {*} obj Given object for assertion
 * @constructor
 * @memberOf should
 * @static
 */
function Assertion(obj) {
  this.obj = obj;

  this.anyOne = false;
  this.negate = false;

  this.params = { actual: obj };
}

Assertion.prototype = {
  constructor: Assertion,

  /**
   * Base method for assertions.
   *
   * Before calling this method need to fill Assertion#params object. This method usually called from other assertion methods.
   * `Assertion#params` can contain such properties:
   * * `operator` - required string containing description of this assertion
   * * `obj` - optional replacement for this.obj, it is useful if you prepare more clear object then given
   * * `message` - if this property filled with string any others will be ignored and this one used as assertion message
   * * `expected` - any object used when you need to assert relation between given object and expected. Like given == expected (== is a relation)
   * * `details` - additional string with details to generated message
   *
   * @memberOf Assertion
   * @category assertion
   * @param {*} expr Any expression that will be used as a condition for asserting.
   * @example
   *
   * var a = new should.Assertion(42);
   *
   * a.params = {
   *  operator: 'to be magic number',
   * }
   *
   * a.assert(false);
   * //throws AssertionError: expected 42 to be magic number
   */
  assert: function(expr) {
    if (expr) {
      return this;
    }

    var params = this.params;

    if ("obj" in params && !("actual" in params)) {
      params.actual = params.obj;
    } else if (!("obj" in params) && !("actual" in params)) {
      params.actual = this.obj;
    }

    params.stackStartFunction = params.stackStartFunction || this.assert;
    params.negate = this.negate;

    params.assertion = this;

    if (this.light) {
      throw new LightAssertionError(params);
    } else {
      throw new AssertionError(params);
    }
  },

  /**
   * Shortcut for `Assertion#assert(false)`.
   *
   * @memberOf Assertion
   * @category assertion
   * @example
   *
   * var a = new should.Assertion(42);
   *
   * a.params = {
   *  operator: 'to be magic number',
   * }
   *
   * a.fail();
   * //throws AssertionError: expected 42 to be magic number
   */
  fail: function() {
    return this.assert(false);
  },

  assertZeroArguments: function(args) {
    if (args.length !== 0) {
      throw new TypeError("This assertion does not expect any arguments. You may need to check your code");
    }
  }
};

/**
 * Assertion used to delegate calls of Assertion methods inside of Promise.
 * It has almost all methods of Assertion.prototype
 *
 * @param {Promise} obj
 */
function PromisedAssertion(/* obj */) {
  Assertion.apply(this, arguments);
}

/**
 * Make PromisedAssertion to look like promise. Delegate resolve and reject to given promise.
 *
 * @private
 * @returns {Promise}
 */
PromisedAssertion.prototype.then = function(resolve, reject) {
  return this.obj.then(resolve, reject);
};

/**
 * Way to extend Assertion function. It uses some logic
 * to define only positive assertions and itself rule with negative assertion.
 *
 * All actions happen in subcontext and this method take care about negation.
 * Potentially we can add some more modifiers that does not depends from state of assertion.
 *
 * @memberOf Assertion
 * @static
 * @param {String} name Name of assertion. It will be used for defining method or getter on Assertion.prototype
 * @param {Function} func Function that will be called on executing assertion
 * @example
 *
 * Assertion.add('asset', function() {
 *      this.params = { operator: 'to be asset' }
 *
 *      this.obj.should.have.property('id').which.is.a.Number()
 *      this.obj.should.have.property('path')
 * })
 */
Assertion.add = function(name, func) {
  Object.defineProperty(Assertion.prototype, name, {
    enumerable: true,
    configurable: true,
    value: function() {
      var context = new Assertion(this.obj, this, name);
      context.anyOne = this.anyOne;
      context.onlyThis = this.onlyThis;
      // hack
      context.light = true;

      try {
        func.apply(context, arguments);
      } catch (e) {
        // check for fail
        if (e instanceof AssertionError || e instanceof LightAssertionError) {
          // negative fail
          if (this.negate) {
            this.obj = context.obj;
            this.negate = false;
            return this;
          }

          if (context !== e.assertion) {
            context.params.previous = e;
          }

          // positive fail
          context.negate = false;
          // hack
          context.light = false;
          context.fail();
        }
        // throw if it is another exception
        throw e;
      }

      // negative pass
      if (this.negate) {
        context.negate = true; // because .fail will set negate
        context.params.details = "false negative fail";
        // hack
        context.light = false;
        context.fail();
      }

      // positive pass
      if (!this.params.operator) {
        this.params = context.params; // shortcut
      }
      this.obj = context.obj;
      this.negate = false;
      return this;
    }
  });

  Object.defineProperty(PromisedAssertion.prototype, name, {
    enumerable: true,
    configurable: true,
    value: function() {
      var args = arguments;
      this.obj = this.obj.then(function(a) {
        return a[name].apply(a, args);
      });

      return this;
    }
  });
};

/**
 * Add chaining getter to Assertion like .a, .which etc
 *
 * @memberOf Assertion
 * @static
 * @param  {string} name   name of getter
 * @param  {function} [onCall] optional function to call
 */
Assertion.addChain = function(name, onCall) {
  onCall = onCall || function() {};
  Object.defineProperty(Assertion.prototype, name, {
    get: function() {
      onCall.call(this);
      return this;
    },
    enumerable: true
  });

  Object.defineProperty(PromisedAssertion.prototype, name, {
    enumerable: true,
    configurable: true,
    get: function() {
      this.obj = this.obj.then(function(a) {
        return a[name];
      });

      return this;
    }
  });
};

/**
 * Create alias for some `Assertion` property
 *
 * @memberOf Assertion
 * @static
 * @param {String} from Name of to map
 * @param {String} to Name of alias
 * @example
 *
 * Assertion.alias('true', 'True')
 */
Assertion.alias = function(from, to) {
  var desc = Object.getOwnPropertyDescriptor(Assertion.prototype, from);
  if (!desc) {
    throw new Error("Alias " + from + " -> " + to + " could not be created as " + from + " not defined");
  }
  Object.defineProperty(Assertion.prototype, to, desc);

  var desc2 = Object.getOwnPropertyDescriptor(PromisedAssertion.prototype, from);
  if (desc2) {
    Object.defineProperty(PromisedAssertion.prototype, to, desc2);
  }
};
/**
 * Negation modifier. Current assertion chain become negated. Each call invert negation on current assertion.
 *
 * @name not
 * @property
 * @memberOf Assertion
 * @category assertion
 */
Assertion.addChain("not", function() {
  this.negate = !this.negate;
});

/**
 * Any modifier - it affect on execution of sequenced assertion to do not `check all`, but `check any of`.
 *
 * @name any
 * @property
 * @memberOf Assertion
 * @category assertion
 */
Assertion.addChain("any", function() {
  this.anyOne = true;
});

/**
 * Only modifier - currently used with .keys to check if object contains only exactly this .keys
 *
 * @name only
 * @property
 * @memberOf Assertion
 * @category assertion
 */
Assertion.addChain("only", function() {
  this.onlyThis = true;
});

// implement assert interface using already written peaces of should.js

// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var pSlice = Array.prototype.slice;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = ok;
// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.
/**
 * Node.js standard [`assert.fail`](http://nodejs.org/api/assert.html#assert_assert_fail_actual_expected_message_operator).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual Actual object
 * @param {*} expected Expected object
 * @param {string} message Message for assertion
 * @param {string} operator Operator text
 */
function fail(actual, expected, message, operator, stackStartFunction) {
  var a = new Assertion(actual);
  a.params = {
    operator: operator,
    expected: expected,
    message: message,
    stackStartFunction: stackStartFunction || fail
  };

  a.fail();
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.
/**
 * Node.js standard [`assert.ok`](http://nodejs.org/api/assert.html#assert_assert_value_message_assert_ok_value_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} value
 * @param {string} [message]
 */
function ok(value, message) {
  if (!value) {
    fail(value, true, message, "==", assert.ok);
  }
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

/**
 * Node.js standard [`assert.equal`](http://nodejs.org/api/assert.html#assert_assert_equal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.equal = function equal(actual, expected, message) {
  if (actual != expected) {
    fail(actual, expected, message, "==", assert.equal);
  }
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.notEqual`](http://nodejs.org/api/assert.html#assert_assert_notequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, "!=", assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.deepEqual`](http://nodejs.org/api/assert.html#assert_assert_deepequal_actual_expected_message).
 * But uses should.js .eql implementation instead of Node.js own deepEqual.
 *
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.deepEqual = function deepEqual(actual, expected, message) {
  if (eql(actual, expected).length !== 0) {
    fail(actual, expected, message, "deepEqual", assert.deepEqual);
  }
};

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.notDeepEqual`](http://nodejs.org/api/assert.html#assert_assert_notdeepequal_actual_expected_message).
 * But uses should.js .eql implementation instead of Node.js own deepEqual.
 *
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (eql(actual, expected).result) {
    fail(actual, expected, message, "notDeepEqual", assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.strictEqual`](http://nodejs.org/api/assert.html#assert_assert_strictequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, "===", assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);
/**
 * Node.js standard [`assert.notStrictEqual`](http://nodejs.org/api/assert.html#assert_assert_notstrictequal_actual_expected_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {*} actual
 * @param {*} expected
 * @param {string} [message]
 */
assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, "!==", assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == "[object RegExp]") {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (typeof expected == "string") {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message =
    (expected && expected.name ? " (" + expected.name + ")" : ".") +
    (message ? " " + message : ".");

  if (shouldThrow && !actual) {
    fail(actual, expected, "Missing expected exception" + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, "Got unwanted exception" + message);
  }

  if (
    (shouldThrow &&
      actual &&
      expected &&
      !expectedException(actual, expected)) ||
    (!shouldThrow && actual)
  ) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);
/**
 * Node.js standard [`assert.throws`](http://nodejs.org/api/assert.html#assert_assert_throws_block_error_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {Function} block
 * @param {Function} [error]
 * @param {String} [message]
 */
assert.throws = function(/*block, error, message*/) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
/**
 * Node.js standard [`assert.doesNotThrow`](http://nodejs.org/api/assert.html#assert_assert_doesnotthrow_block_message).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {Function} block
 * @param {String} [message]
 */
assert.doesNotThrow = function(/*block, message*/) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

/**
 * Node.js standard [`assert.ifError`](http://nodejs.org/api/assert.html#assert_assert_iferror_value).
 * @static
 * @memberOf should
 * @category assertion assert
 * @param {Error} err
 */
assert.ifError = function(err) {
  if (err) {
    throw err;
  }
};

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function assertExtensions(should) {
  var i = should.format;

  /*
   * Expose assert to should
   *
   * This allows you to do things like below
   * without require()ing the assert module.
   *
   *    should.equal(foo.bar, undefined);
   *
   */
  shouldUtil.merge(should, assert);

  /**
   * Assert _obj_ exists, with optional message.
   *
   * @static
   * @memberOf should
   * @category assertion assert
   * @alias should.exists
   * @param {*} obj
   * @param {String} [msg]
   * @example
   *
   * should.exist(1);
   * should.exist(new Date());
   */
  should.exist = should.exists = function(obj, msg) {
    if (null == obj) {
      throw new AssertionError({
        message: msg || "expected " + i(obj) + " to exist",
        stackStartFunction: should.exist
      });
    }
  };

  should.not = {};
  /**
   * Asserts _obj_ does not exist, with optional message.
   *
   * @name not.exist
   * @static
   * @memberOf should
   * @category assertion assert
   * @alias should.not.exists
   * @param {*} obj
   * @param {String} [msg]
   * @example
   *
   * should.not.exist(null);
   * should.not.exist(void 0);
   */
  should.not.exist = should.not.exists = function(obj, msg) {
    if (null != obj) {
      throw new AssertionError({
        message: msg || "expected " + i(obj) + " to not exist",
        stackStartFunction: should.not.exist
      });
    }
  };
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function chainAssertions(should, Assertion) {
  /**
   * Simple chaining to improve readability. Does nothing.
   *
   * @memberOf Assertion
   * @name be
   * @property {should.Assertion} be
   * @alias Assertion#an
   * @alias Assertion#of
   * @alias Assertion#a
   * @alias Assertion#and
   * @alias Assertion#been
   * @alias Assertion#have
   * @alias Assertion#has
   * @alias Assertion#with
   * @alias Assertion#is
   * @alias Assertion#which
   * @alias Assertion#the
   * @alias Assertion#it
   * @category assertion chaining
   */
  [
    "an",
    "of",
    "a",
    "and",
    "be",
    "been",
    "has",
    "have",
    "with",
    "is",
    "which",
    "the",
    "it"
  ].forEach(function(name) {
    Assertion.addChain(name);
  });
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function booleanAssertions(should, Assertion) {
  /**
   * Assert given object is exactly `true`.
   *
   * @name true
   * @memberOf Assertion
   * @category assertion bool
   * @alias Assertion#True
   * @param {string} [message] Optional message
   * @example
   *
   * (true).should.be.true();
   * false.should.not.be.true();
   *
   * ({ a: 10}).should.not.be.true();
   */
  Assertion.add("true", function(message) {
    this.is.exactly(true, message);
  });

  Assertion.alias("true", "True");

  /**
   * Assert given object is exactly `false`.
   *
   * @name false
   * @memberOf Assertion
   * @category assertion bool
   * @alias Assertion#False
   * @param {string} [message] Optional message
   * @example
   *
   * (true).should.not.be.false();
   * false.should.be.false();
   */
  Assertion.add("false", function(message) {
    this.is.exactly(false, message);
  });

  Assertion.alias("false", "False");

  /**
   * Assert given object is truthy according javascript type conversions.
   *
   * @name ok
   * @memberOf Assertion
   * @category assertion bool
   * @example
   *
   * (true).should.be.ok();
   * ''.should.not.be.ok();
   * should(null).not.be.ok();
   * should(void 0).not.be.ok();
   *
   * (10).should.be.ok();
   * (0).should.not.be.ok();
   */
  Assertion.add("ok", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be truthy" };

    this.assert(this.obj);
  });
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function numberAssertions(should, Assertion) {
  /**
   * Assert given object is NaN
   * @name NaN
   * @memberOf Assertion
   * @category assertion numbers
   * @example
   *
   * (10).should.not.be.NaN();
   * NaN.should.be.NaN();
   */
  Assertion.add("NaN", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be NaN" };

    this.assert(this.obj !== this.obj);
  });

  /**
   * Assert given object is not finite (positive or negative)
   *
   * @name Infinity
   * @memberOf Assertion
   * @category assertion numbers
   * @example
   *
   * (10).should.not.be.Infinity();
   * NaN.should.not.be.Infinity();
   */
  Assertion.add("Infinity", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be Infinity" };

    this.is.a
      .Number()
      .and.not.a.NaN()
      .and.assert(!isFinite(this.obj));
  });

  /**
   * Assert given number between `start` and `finish` or equal one of them.
   *
   * @name within
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} start Start number
   * @param {number} finish Finish number
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.within(0, 20);
   */
  Assertion.add("within", function(start, finish, description) {
    this.params = {
      operator: "to be within " + start + ".." + finish,
      message: description
    };

    this.assert(this.obj >= start && this.obj <= finish);
  });

  /**
   * Assert given number near some other `value` within `delta`
   *
   * @name approximately
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} value Center number
   * @param {number} delta Radius
   * @param {string} [description] Optional message
   * @example
   *
   * (9.99).should.be.approximately(10, 0.1);
   */
  Assertion.add("approximately", function(value, delta, description) {
    this.params = {
      operator: "to be approximately " + value + " ±" + delta,
      message: description
    };

    this.assert(Math.abs(this.obj - value) <= delta);
  });

  /**
   * Assert given number above `n`.
   *
   * @name above
   * @alias Assertion#greaterThan
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.above(0);
   */
  Assertion.add("above", function(n, description) {
    this.params = { operator: "to be above " + n, message: description };

    this.assert(this.obj > n);
  });

  /**
   * Assert given number below `n`.
   *
   * @name below
   * @alias Assertion#lessThan
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (0).should.be.below(10);
   */
  Assertion.add("below", function(n, description) {
    this.params = { operator: "to be below " + n, message: description };

    this.assert(this.obj < n);
  });

  Assertion.alias("above", "greaterThan");
  Assertion.alias("below", "lessThan");

  /**
   * Assert given number above `n`.
   *
   * @name aboveOrEqual
   * @alias Assertion#greaterThanOrEqual
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.aboveOrEqual(0);
   * (10).should.be.aboveOrEqual(10);
   */
  Assertion.add("aboveOrEqual", function(n, description) {
    this.params = {
      operator: "to be above or equal " + n,
      message: description
    };

    this.assert(this.obj >= n);
  });

  /**
   * Assert given number below `n`.
   *
   * @name belowOrEqual
   * @alias Assertion#lessThanOrEqual
   * @memberOf Assertion
   * @category assertion numbers
   * @param {number} n Margin number
   * @param {string} [description] Optional message
   * @example
   *
   * (0).should.be.belowOrEqual(10);
   * (0).should.be.belowOrEqual(0);
   */
  Assertion.add("belowOrEqual", function(n, description) {
    this.params = {
      operator: "to be below or equal " + n,
      message: description
    };

    this.assert(this.obj <= n);
  });

  Assertion.alias("aboveOrEqual", "greaterThanOrEqual");
  Assertion.alias("belowOrEqual", "lessThanOrEqual");
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function typeAssertions(should, Assertion) {
  /**
   * Assert given object is number
   * @name Number
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Number", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be a number" };

    this.have.type("number");
  });

  /**
   * Assert given object is arguments
   * @name arguments
   * @alias Assertion#Arguments
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("arguments", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be arguments" };

    this.have.class("Arguments");
  });

  Assertion.alias("arguments", "Arguments");

  /**
   * Assert given object has some type using `typeof`
   * @name type
   * @memberOf Assertion
   * @param {string} type Type name
   * @param {string} [description] Optional message
   * @category assertion types
   */
  Assertion.add("type", function(type, description) {
    this.params = { operator: "to have type " + type, message: description };

    should(typeof this.obj).be.exactly(type);
  });

  /**
   * Assert given object is instance of `constructor`
   * @name instanceof
   * @alias Assertion#instanceOf
   * @memberOf Assertion
   * @param {Function} constructor Constructor function
   * @param {string} [description] Optional message
   * @category assertion types
   */
  Assertion.add("instanceof", function(constructor, description) {
    this.params = {
      operator: "to be an instance of " + functionName(constructor),
      message: description
    };

    this.assert(Object(this.obj) instanceof constructor);
  });

  Assertion.alias("instanceof", "instanceOf");

  /**
   * Assert given object is function
   * @name Function
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Function", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be a function" };

    this.have.type("function");
  });

  /**
   * Assert given object is object
   * @name Object
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Object", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be an object" };

    this.is.not.null().and.have.type("object");
  });

  /**
   * Assert given object is string
   * @name String
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("String", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be a string" };

    this.have.type("string");
  });

  /**
   * Assert given object is array
   * @name Array
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Array", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be an array" };

    this.have.class("Array");
  });

  /**
   * Assert given object is boolean
   * @name Boolean
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Boolean", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be a boolean" };

    this.have.type("boolean");
  });

  /**
   * Assert given object is error
   * @name Error
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Error", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be an error" };

    this.have.instanceOf(Error);
  });

  /**
   * Assert given object is a date
   * @name Date
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("Date", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be a date" };

    this.have.instanceOf(Date);
  });

  /**
   * Assert given object is null
   * @name null
   * @alias Assertion#Null
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("null", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be null" };

    this.assert(this.obj === null);
  });

  Assertion.alias("null", "Null");

  /**
   * Assert given object has some internal [[Class]], via Object.prototype.toString call
   * @name class
   * @alias Assertion#Class
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("class", function(cls) {
    this.params = { operator: "to have [[Class]] " + cls };

    this.assert(Object.prototype.toString.call(this.obj) === "[object " + cls + "]");
  });

  Assertion.alias("class", "Class");

  /**
   * Assert given object is undefined
   * @name undefined
   * @alias Assertion#Undefined
   * @memberOf Assertion
   * @category assertion types
   */
  Assertion.add("undefined", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be undefined" };

    this.assert(this.obj === void 0);
  });

  Assertion.alias("undefined", "Undefined");

  /**
   * Assert given object supports es6 iterable protocol (just check
   * that object has property Symbol.iterator, which is a function)
   * @name iterable
   * @memberOf Assertion
   * @category assertion es6
   */
  Assertion.add("iterable", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be iterable" };

    should(this.obj)
      .have.property(Symbol.iterator)
      .which.is.a.Function();
  });

  /**
   * Assert given object supports es6 iterator protocol (just check
   * that object has property next, which is a function)
   * @name iterator
   * @memberOf Assertion
   * @category assertion es6
   */
  Assertion.add("iterator", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be iterator" };

    should(this.obj)
      .have.property("next")
      .which.is.a.Function();
  });

  /**
   * Assert given object is a generator object
   * @name generator
   * @memberOf Assertion
   * @category assertion es6
   */
  Assertion.add("generator", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be generator" };

    should(this.obj).be.iterable.and.iterator.and.it.is.equal(this.obj[Symbol.iterator]());
  });
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function formatEqlResult(r, a, b) {
  return ((r.path.length > 0
    ? "at " + r.path.map(formatProp).join(" -> ")
    : "") +
    (r.a === a ? "" : ", A has " + format(r.a)) +
    (r.b === b ? "" : " and B has " + format(r.b)) +
    (r.showReason ? " because " + r.reason : "")).trim();
}

function equalityAssertions(should, Assertion) {
  /**
   * Deep object equality comparison. For full spec see [`should-equal tests`](https://github.com/shouldjs/equal/blob/master/test.js).
   *
   * @name eql
   * @memberOf Assertion
   * @category assertion equality
   * @alias Assertion#eqls
   * @alias Assertion#deepEqual
   * @param {*} val Expected value
   * @param {string} [description] Optional message
   * @example
   *
   * (10).should.be.eql(10);
   * ('10').should.not.be.eql(10);
   * (-0).should.not.be.eql(+0);
   *
   * NaN.should.be.eql(NaN);
   *
   * ({ a: 10}).should.be.eql({ a: 10 });
   * [ 'a' ].should.not.be.eql({ '0': 'a' });
   */
  Assertion.add("eql", function(val, description) {
    this.params = { operator: "to equal", expected: val, message: description };
    var obj = this.obj;
    var fails = eql(this.obj, val, should.config);
    this.params.details = fails
      .map(function(fail) {
        return formatEqlResult(fail, obj, val);
      })
      .join(", ");

    this.params.showDiff = eql(getType(obj), getType(val)).length === 0;

    this.assert(fails.length === 0);
  });

  /**
   * Exact comparison using ===.
   *
   * @name equal
   * @memberOf Assertion
   * @category assertion equality
   * @alias Assertion#equals
   * @alias Assertion#exactly
   * @param {*} val Expected value
   * @param {string} [description] Optional message
   * @example
   *
   * 10.should.be.equal(10);
   * 'a'.should.be.exactly('a');
   *
   * should(null).be.exactly(null);
   */
  Assertion.add("equal", function(val, description) {
    this.params = { operator: "to be", expected: val, message: description };

    this.params.showDiff = eql(getType(this.obj), getType(val)).length === 0;

    this.assert(val === this.obj);
  });

  Assertion.alias("equal", "equals");
  Assertion.alias("equal", "exactly");
  Assertion.alias("eql", "eqls");
  Assertion.alias("eql", "deepEqual");

  function addOneOf(name, message, method) {
    Assertion.add(name, function(vals) {
      if (arguments.length !== 1) {
        vals = Array.prototype.slice.call(arguments);
      } else {
        should(vals).be.Array();
      }

      this.params = { operator: message, expected: vals };

      var obj = this.obj;
      var found = false;

      shouldTypeAdaptors.forEach(vals, function(val) {
        try {
          should(val)[method](obj);
          found = true;
          return false;
        } catch (e) {
          if (e instanceof should.AssertionError) {
            return; //do nothing
          }
          throw e;
        }
      });

      this.assert(found);
    });
  }

  /**
   * Exact comparison using === to be one of supplied objects.
   *
   * @name equalOneOf
   * @memberOf Assertion
   * @category assertion equality
   * @param {Array|*} vals Expected values
   * @example
   *
   * 'ab'.should.be.equalOneOf('a', 10, 'ab');
   * 'ab'.should.be.equalOneOf(['a', 10, 'ab']);
   */
  addOneOf("equalOneOf", "to be equals one of", "equal");

  /**
   * Exact comparison using .eql to be one of supplied objects.
   *
   * @name oneOf
   * @memberOf Assertion
   * @category assertion equality
   * @param {Array|*} vals Expected values
   * @example
   *
   * ({a: 10}).should.be.oneOf('a', 10, 'ab', {a: 10});
   * ({a: 10}).should.be.oneOf(['a', 10, 'ab', {a: 10}]);
   */
  addOneOf("oneOf", "to be one of", "eql");
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function promiseAssertions(should, Assertion$$1) {
  /**
   * Assert given object is a Promise
   *
   * @name Promise
   * @memberOf Assertion
   * @category assertion promises
   * @example
   *
   * promise.should.be.Promise()
   * (new Promise(function(resolve, reject) { resolve(10); })).should.be.a.Promise()
   * (10).should.not.be.a.Promise()
   */
  Assertion$$1.add("Promise", function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be promise" };

    var obj = this.obj;

    should(obj)
      .have.property("then")
      .which.is.a.Function();
  });

  /**
   * Assert given promise will be fulfilled. Result of assertion is still .thenable and should be handled accordingly.
   *
   * @name fulfilled
   * @memberOf Assertion
   * @alias Assertion#resolved
   * @returns {Promise}
   * @category assertion promises
   * @example
   *
   * // don't forget to handle async nature
   * (new Promise(function(resolve, reject) { resolve(10); })).should.be.fulfilled();
   *
   * // test example with mocha it is possible to return promise
   * it('is async', () => {
   *    return new Promise(resolve => resolve(10))
   *      .should.be.fulfilled();
   * });
   */
  Assertion$$1.prototype.fulfilled = function Assertion$fulfilled() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be fulfilled" };

    should(this.obj).be.a.Promise();

    var that = this;
    return this.obj.then(
      function next$onResolve(value) {
        if (that.negate) {
          that.fail();
        }
        return value;
      },
      function next$onReject(err) {
        if (!that.negate) {
          that.params.operator += ", but it was rejected with " + should.format(err);
          that.fail();
        }
        return err;
      }
    );
  };

  Assertion$$1.prototype.resolved = Assertion$$1.prototype.fulfilled;

  /**
   * Assert given promise will be rejected. Result of assertion is still .thenable and should be handled accordingly.
   *
   * @name rejected
   * @memberOf Assertion
   * @category assertion promises
   * @returns {Promise}
   * @example
   *
   * // don't forget to handle async nature
   * (new Promise(function(resolve, reject) { resolve(10); }))
   *    .should.not.be.rejected();
   *
   * // test example with mocha it is possible to return promise
   * it('is async', () => {
   *    return new Promise((resolve, reject) => reject(new Error('boom')))
   *      .should.be.rejected();
   * });
   */
  Assertion$$1.prototype.rejected = function() {
    this.assertZeroArguments(arguments);
    this.params = { operator: "to be rejected" };

    should(this.obj).be.a.Promise();

    var that = this;
    return this.obj.then(
      function(value) {
        if (!that.negate) {
          that.params.operator += ", but it was fulfilled";
          if (arguments.length != 0) {
            that.params.operator += " with " + should.format(value);
          }
          that.fail();
        }
        return value;
      },
      function next$onError(err) {
        if (that.negate) {
          that.fail();
        }
        return err;
      }
    );
  };

  /**
   * Assert given promise will be fulfilled with some expected value (value compared using .eql).
   * Result of assertion is still .thenable and should be handled accordingly.
   *
   * @name fulfilledWith
   * @memberOf Assertion
   * @alias Assertion#resolvedWith
   * @category assertion promises
   * @returns {Promise}
   * @example
   *
   * // don't forget to handle async nature
   * (new Promise(function(resolve, reject) { resolve(10); }))
   *    .should.be.fulfilledWith(10);
   *
   * // test example with mocha it is possible to return promise
   * it('is async', () => {
   *    return new Promise((resolve, reject) => resolve(10))
   *       .should.be.fulfilledWith(10);
   * });
   */
  Assertion$$1.prototype.fulfilledWith = function(expectedValue) {
    this.params = {
      operator: "to be fulfilled with " + should.format(expectedValue)
    };

    should(this.obj).be.a.Promise();

    var that = this;
    return this.obj.then(
      function(value) {
        if (that.negate) {
          that.fail();
        }
        should(value).eql(expectedValue);
        return value;
      },
      function next$onError(err) {
        if (!that.negate) {
          that.params.operator += ", but it was rejected with " + should.format(err);
          that.fail();
        }
        return err;
      }
    );
  };

  Assertion$$1.prototype.resolvedWith = Assertion$$1.prototype.fulfilledWith;

  /**
   * Assert given promise will be rejected with some sort of error. Arguments is the same for Assertion#throw.
   * Result of assertion is still .thenable and should be handled accordingly.
   *
   * @name rejectedWith
   * @memberOf Assertion
   * @category assertion promises
   * @returns {Promise}
   * @example
   *
   * function failedPromise() {
   *   return new Promise(function(resolve, reject) {
   *     reject(new Error('boom'))
   *   })
   * }
   * failedPromise().should.be.rejectedWith(Error);
   * failedPromise().should.be.rejectedWith('boom');
   * failedPromise().should.be.rejectedWith(/boom/);
   * failedPromise().should.be.rejectedWith(Error, { message: 'boom' });
   * failedPromise().should.be.rejectedWith({ message: 'boom' });
   *
   * // test example with mocha it is possible to return promise
   * it('is async', () => {
   *    return failedPromise().should.be.rejectedWith({ message: 'boom' });
   * });
   */
  Assertion$$1.prototype.rejectedWith = function(message, properties) {
    this.params = { operator: "to be rejected" };

    should(this.obj).be.a.Promise();

    var that = this;
    return this.obj.then(
      function(value) {
        if (!that.negate) {
          that.fail();
        }
        return value;
      },
      function next$onError(err) {
        if (that.negate) {
          that.fail();
        }

        var errorMatched = true;
        var errorInfo = "";

        if ("string" === typeof message) {
          errorMatched = message === err.message;
        } else if (message instanceof RegExp) {
          errorMatched = message.test(err.message);
        } else if ("function" === typeof message) {
          errorMatched = err instanceof message;
        } else if (message !== null && typeof message === "object") {
          try {
            should(err).match(message);
          } catch (e) {
            if (e instanceof should.AssertionError) {
              errorInfo = ": " + e.message;
              errorMatched = false;
            } else {
              throw e;
            }
          }
        }

        if (!errorMatched) {
          if (typeof message === "string" || message instanceof RegExp) {
            errorInfo = " with a message matching " + should.format(message) + ", but got '" + err.message + "'";
          } else if ("function" === typeof message) {
            errorInfo = " of type " + functionName(message) + ", but got " + functionName(err.constructor);
          }
        } else if ("function" === typeof message && properties) {
          try {
            should(err).match(properties);
          } catch (e) {
            if (e instanceof should.AssertionError) {
              errorInfo = ": " + e.message;
              errorMatched = false;
            } else {
              throw e;
            }
          }
        }

        that.params.operator += errorInfo;

        that.assert(errorMatched);

        return err;
      }
    );
  };

  /**
   * Assert given object is promise and wrap it in PromisedAssertion, which has all properties of Assertion.
   * That means you can chain as with usual Assertion.
   * Result of assertion is still .thenable and should be handled accordingly.
   *
   * @name finally
   * @memberOf Assertion
   * @alias Assertion#eventually
   * @category assertion promises
   * @returns {PromisedAssertion} Like Assertion, but .then this.obj in Assertion
   * @example
   *
   * (new Promise(function(resolve, reject) { resolve(10); }))
   *    .should.be.eventually.equal(10);
   *
   * // test example with mocha it is possible to return promise
   * it('is async', () => {
   *    return new Promise(resolve => resolve(10))
   *      .should.be.finally.equal(10);
   * });
   */
  Object.defineProperty(Assertion$$1.prototype, "finally", {
    get: function() {
      should(this.obj).be.a.Promise();

      var that = this;

      return new PromisedAssertion(
        this.obj.then(function(obj) {
          var a = should(obj);

          a.negate = that.negate;
          a.anyOne = that.anyOne;

          return a;
        })
      );
    }
  });

  Assertion$$1.alias("finally", "eventually");
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function stringAssertions(should, Assertion) {
  /**
   * Assert given string starts with prefix
   * @name startWith
   * @memberOf Assertion
   * @category assertion strings
   * @param {string} str Prefix
   * @param {string} [description] Optional message
   * @example
   *
   * 'abc'.should.startWith('a');
   */
  Assertion.add("startWith", function(str, description) {
    this.params = {
      operator: "to start with " + should.format(str),
      message: description
    };

    this.assert(0 === this.obj.indexOf(str));
  });

  /**
   * Assert given string ends with prefix
   * @name endWith
   * @memberOf Assertion
   * @category assertion strings
   * @param {string} str Prefix
   * @param {string} [description] Optional message
   * @example
   *
   * 'abca'.should.endWith('a');
   */
  Assertion.add("endWith", function(str, description) {
    this.params = {
      operator: "to end with " + should.format(str),
      message: description
    };

    this.assert(this.obj.indexOf(str, this.obj.length - str.length) >= 0);
  });
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function containAssertions(should, Assertion) {
  var i = should.format;

  /**
   * Assert that given object contain something that equal to `other`. It uses `should-equal` for equality checks.
   * If given object is array it search that one of elements was equal to `other`.
   * If given object is string it checks if `other` is a substring - expected that `other` is a string.
   * If given object is Object it checks that `other` is a subobject - expected that `other` is a object.
   *
   * @name containEql
   * @memberOf Assertion
   * @category assertion contain
   * @param {*} other Nested object
   * @example
   *
   * [1, 2, 3].should.containEql(1);
   * [{ a: 1 }, 'a', 10].should.containEql({ a: 1 });
   *
   * 'abc'.should.containEql('b');
   * 'ab1c'.should.containEql(1);
   *
   * ({ a: 10, c: { d: 10 }}).should.containEql({ a: 10 });
   * ({ a: 10, c: { d: 10 }}).should.containEql({ c: { d: 10 }});
   * ({ a: 10, c: { d: 10 }}).should.containEql({ b: 10 });
   * // throws AssertionError: expected { a: 10, c: { d: 10 } } to contain { b: 10 }
   * //            expected { a: 10, c: { d: 10 } } to have property b
   */
  Assertion.add("containEql", function(other) {
    this.params = { operator: "to contain " + i(other) };

    this.is.not.null().and.not.undefined();

    var obj = this.obj;

    if (typeof obj == "string") {
      this.assert(obj.indexOf(String(other)) >= 0);
    } else if (shouldTypeAdaptors.isIterable(obj)) {
      this.assert(
        shouldTypeAdaptors.some(obj, function(v) {
          return eql(v, other).length === 0;
        })
      );
    } else {
      shouldTypeAdaptors.forEach(
        other,
        function(value, key) {
          should(obj).have.value(key, value);
        },
        this
      );
    }
  });

  /**
   * Assert that given object is contain equally structured object on the same depth level.
   * If given object is an array and `other` is an array it checks that the eql elements is going in the same sequence in given array (recursive)
   * If given object is an object it checks that the same keys contain deep equal values (recursive)
   * On other cases it try to check with `.eql`
   *
   * @name containDeepOrdered
   * @memberOf Assertion
   * @category assertion contain
   * @param {*} other Nested object
   * @example
   *
   * [ 1, 2, 3].should.containDeepOrdered([1, 2]);
   * [ 1, 2, [ 1, 2, 3 ]].should.containDeepOrdered([ 1, [ 2, 3 ]]);
   *
   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({a: 10});
   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({b: {c: 10}});
   * ({ a: 10, b: { c: 10, d: [1, 2, 3] }}).should.containDeepOrdered({b: {d: [1, 3]}});
   */
  Assertion.add("containDeepOrdered", function(other) {
    this.params = { operator: "to contain " + i(other) };

    var obj = this.obj;
    if (typeof obj == "string") {
      // expect other to be string
      this.is.equal(String(other));
    } else if (shouldTypeAdaptors.isIterable(obj) && shouldTypeAdaptors.isIterable(other)) {
      var objIterator = shouldTypeAdaptors.iterator(obj);
      var otherIterator = shouldTypeAdaptors.iterator(other);

      var nextObj = objIterator.next();
      var nextOther = otherIterator.next();
      while (!nextObj.done && !nextOther.done) {
        try {
          should(nextObj.value[1]).containDeepOrdered(nextOther.value[1]);
          nextOther = otherIterator.next();
        } catch (e) {
          if (!(e instanceof should.AssertionError)) {
            throw e;
          }
        }
        nextObj = objIterator.next();
      }

      this.assert(nextOther.done);
    } else if (obj != null && typeof obj == "object" && other != null && typeof other == "object") {
      //TODO compare types object contains object case
      shouldTypeAdaptors.forEach(other, function(value, key) {
        should(obj[key]).containDeepOrdered(value);
      });

      // if both objects is empty means we finish traversing - and we need to compare for hidden values
      if (shouldTypeAdaptors.isEmpty(other)) {
        this.eql(other);
      }
    } else {
      this.eql(other);
    }
  });

  /**
   * The same like `Assertion#containDeepOrdered` but all checks on arrays without order.
   *
   * @name containDeep
   * @memberOf Assertion
   * @category assertion contain
   * @param {*} other Nested object
   * @example
   *
   * [ 1, 2, 3].should.containDeep([2, 1]);
   * [ 1, 2, [ 1, 2, 3 ]].should.containDeep([ 1, [ 3, 1 ]]);
   */
  Assertion.add("containDeep", function(other) {
    this.params = { operator: "to contain " + i(other) };

    var obj = this.obj;
    if (typeof obj === "string" && typeof other === "string") {
      // expect other to be string
      this.is.equal(String(other));
    } else if (shouldTypeAdaptors.isIterable(obj) && shouldTypeAdaptors.isIterable(other)) {
      var usedKeys = {};
      shouldTypeAdaptors.forEach(
        other,
        function(otherItem) {
          this.assert(
            shouldTypeAdaptors.some(obj, function(item, index) {
              if (index in usedKeys) {
                return false;
              }

              try {
                should(item).containDeep(otherItem);
                usedKeys[index] = true;
                return true;
              } catch (e) {
                if (e instanceof should.AssertionError) {
                  return false;
                }
                throw e;
              }
            })
          );
        },
        this
      );
    } else if (obj != null && other != null && typeof obj == "object" && typeof other == "object") {
      // object contains object case
      shouldTypeAdaptors.forEach(other, function(value, key) {
        should(obj[key]).containDeep(value);
      });

      // if both objects is empty means we finish traversing - and we need to compare for hidden values
      if (shouldTypeAdaptors.isEmpty(other)) {
        this.eql(other);
      }
    } else {
      this.eql(other);
    }
  });
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

var aSlice = Array.prototype.slice;

function propertyAssertions(should, Assertion) {
  var i = should.format;
  /**
   * Asserts given object has some descriptor. **On success it change given object to be value of property**.
   *
   * @name propertyWithDescriptor
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {Object} desc Descriptor like used in Object.defineProperty (not required to add all properties)
   * @example
   *
   * ({ a: 10 }).should.have.propertyWithDescriptor('a', { enumerable: true });
   */
  Assertion.add("propertyWithDescriptor", function(name, desc) {
    this.params = {
      actual: this.obj,
      operator: "to have own property with descriptor " + i(desc)
    };
    var obj = this.obj;
    this.have.ownProperty(name);
    should(Object.getOwnPropertyDescriptor(Object(obj), name)).have.properties(desc);
  });

  /**
   * Asserts given object has property with optionally value. **On success it change given object to be value of property**.
   *
   * @name property
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {*} [val] Optional property value to check
   * @example
   *
   * ({ a: 10 }).should.have.property('a');
   */
  Assertion.add("property", function(name, val) {
    name = convertPropertyName(name);
    if (arguments.length > 1) {
      var p = {};
      p[name] = val;
      this.have.properties(p);
    } else {
      this.have.properties(name);
    }
    this.obj = this.obj[name];
  });

  /**
   * Asserts given object has properties. On this method affect .any modifier, which allow to check not all properties.
   *
   * @name properties
   * @memberOf Assertion
   * @category assertion property
   * @param {Array|...string|Object} names Names of property
   * @example
   *
   * ({ a: 10 }).should.have.properties('a');
   * ({ a: 10, b: 20 }).should.have.properties([ 'a' ]);
   * ({ a: 10, b: 20 }).should.have.properties({ b: 20 });
   */
  Assertion.add("properties", function(names) {
    var values = {};
    if (arguments.length > 1) {
      names = aSlice.call(arguments);
    } else if (!Array.isArray(names)) {
      if (typeof names == "string" || typeof names == "symbol") {
        names = [names];
      } else {
        values = names;
        names = Object.keys(names);
      }
    }

    var obj = Object(this.obj),
      missingProperties = [];

    //just enumerate properties and check if they all present
    names.forEach(function(name) {
      if (!(name in obj)) {
        missingProperties.push(formatProp(name));
      }
    });

    var props = missingProperties;
    if (props.length === 0) {
      props = names.map(formatProp);
    } else if (this.anyOne) {
      props = names
        .filter(function(name) {
          return missingProperties.indexOf(formatProp(name)) < 0;
        })
        .map(formatProp);
    }

    var operator =
      (props.length === 1
        ? "to have property "
        : "to have " + (this.anyOne ? "any of " : "") + "properties ") + props.join(", ");

    this.params = { obj: this.obj, operator: operator };

    //check that all properties presented
    //or if we request one of them that at least one them presented
    this.assert(
      missingProperties.length === 0 || (this.anyOne && missingProperties.length != names.length)
    );

    // check if values in object matched expected
    var valueCheckNames = Object.keys(values);
    if (valueCheckNames.length) {
      var wrongValues = [];
      props = [];

      // now check values, as there we have all properties
      valueCheckNames.forEach(function(name) {
        var value = values[name];
        if (eql(obj[name], value).length !== 0) {
          wrongValues.push(formatProp(name) + " of " + i(value) + " (got " + i(obj[name]) + ")");
        } else {
          props.push(formatProp(name) + " of " + i(value));
        }
      });

      if ((wrongValues.length !== 0 && !this.anyOne) || (this.anyOne && props.length === 0)) {
        props = wrongValues;
      }

      operator =
        (props.length === 1
          ? "to have property "
          : "to have " + (this.anyOne ? "any of " : "") + "properties ") + props.join(", ");

      this.params = { obj: this.obj, operator: operator };

      //if there is no not matched values
      //or there is at least one matched
      this.assert(
        wrongValues.length === 0 || (this.anyOne && wrongValues.length != valueCheckNames.length)
      );
    }
  });

  /**
   * Asserts given object has property `length` with given value `n`
   *
   * @name length
   * @alias Assertion#lengthOf
   * @memberOf Assertion
   * @category assertion property
   * @param {number} n Expected length
   * @param {string} [description] Optional message
   * @example
   *
   * [1, 2].should.have.length(2);
   */
  Assertion.add("length", function(n, description) {
    this.have.property("length", n, description);
  });

  Assertion.alias("length", "lengthOf");

  /**
   * Asserts given object has own property. **On success it change given object to be value of property**.
   *
   * @name ownProperty
   * @alias Assertion#hasOwnProperty
   * @memberOf Assertion
   * @category assertion property
   * @param {string} name Name of property
   * @param {string} [description] Optional message
   * @example
   *
   * ({ a: 10 }).should.have.ownProperty('a');
   */
  Assertion.add("ownProperty", function(name, description) {
    name = convertPropertyName(name);
    this.params = {
      actual: this.obj,
      operator: "to have own property " + formatProp(name),
      message: description
    };

    this.assert(shouldUtil.hasOwnProperty(this.obj, name));

    this.obj = this.obj[name];
  });

  Assertion.alias("ownProperty", "hasOwnProperty");

  /**
   * Asserts given object is empty. For strings, arrays and arguments it checks .length property, for objects it checks keys.
   *
   * @name empty
   * @memberOf Assertion
   * @category assertion property
   * @example
   *
   * ''.should.be.empty();
   * [].should.be.empty();
   * ({}).should.be.empty();
   */
  Assertion.add(
    "empty",
    function() {
      this.params = { operator: "to be empty" };
      this.assert(shouldTypeAdaptors.isEmpty(this.obj));
    },
    true
  );

  /**
   * Asserts given object has such keys. Compared to `properties`, `keys` does not accept Object as a argument.
   * When calling via .key current object in assertion changed to value of this key
   *
   * @name keys
   * @alias Assertion#key
   * @memberOf Assertion
   * @category assertion property
   * @param {...*} keys Keys to check
   * @example
   *
   * ({ a: 10 }).should.have.keys('a');
   * ({ a: 10, b: 20 }).should.have.keys('a', 'b');
   * (new Map([[1, 2]])).should.have.key(1);
   *
   * json.should.have.only.keys('type', 'version')
   */
  Assertion.add("keys", function(keys) {
    keys = aSlice.call(arguments);

    var obj = Object(this.obj);

    // first check if some keys are missing
    var missingKeys = keys.filter(function(key) {
      return !shouldTypeAdaptors.has(obj, key);
    });

    var verb = "to have " + (this.onlyThis ? "only " : "") + (keys.length === 1 ? "key " : "keys ");

    this.params = { operator: verb + keys.join(", ") };

    if (missingKeys.length > 0) {
      this.params.operator += "\n\tmissing keys: " + missingKeys.join(", ");
    }

    this.assert(missingKeys.length === 0);

    if (this.onlyThis) {
      should(obj).have.size(keys.length);
    }
  });

  Assertion.add("key", function(key) {
    this.have.keys(key);
    this.obj = shouldTypeAdaptors.get(this.obj, key);
  });

  /**
   * Asserts given object has such value for given key
   *
   * @name value
   * @memberOf Assertion
   * @category assertion property
   * @param {*} key Key to check
   * @param {*} value Value to check
   * @example
   *
   * ({ a: 10 }).should.have.value('a', 10);
   * (new Map([[1, 2]])).should.have.value(1, 2);
   */
  Assertion.add("value", function(key, value) {
    this.have.key(key).which.is.eql(value);
  });

  /**
   * Asserts given object has such size.
   *
   * @name size
   * @memberOf Assertion
   * @category assertion property
   * @param {number} s Size to check
   * @example
   *
   * ({ a: 10 }).should.have.size(1);
   * (new Map([[1, 2]])).should.have.size(1);
   */
  Assertion.add("size", function(s) {
    this.params = { operator: "to have size " + s };
    should(shouldTypeAdaptors.size(this.obj)).be.exactly(s);
  });

  /**
   * Asserts given object has nested property in depth by path. **On success it change given object to be value of final property**.
   *
   * @name propertyByPath
   * @memberOf Assertion
   * @category assertion property
   * @param {Array|...string} properties Properties path to search
   * @example
   *
   * ({ a: {b: 10}}).should.have.propertyByPath('a', 'b').eql(10);
   */
  Assertion.add("propertyByPath", function(properties) {
    properties = aSlice.call(arguments);

    var allProps = properties.map(formatProp);

    properties = properties.map(convertPropertyName);

    var obj = should(Object(this.obj));

    var foundProperties = [];

    var currentProperty;
    while (properties.length) {
      currentProperty = properties.shift();
      this.params = {
        operator:
          "to have property by path " +
          allProps.join(", ") +
          " - failed on " +
          formatProp(currentProperty)
      };
      obj = obj.have.property(currentProperty);
      foundProperties.push(currentProperty);
    }

    this.params = {
      obj: this.obj,
      operator: "to have property by path " + allProps.join(", ")
    };

    this.obj = obj.obj;
  });
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */
function errorAssertions(should, Assertion) {
  var i = should.format;

  /**
   * Assert given function throws error with such message.
   *
   * @name throw
   * @memberOf Assertion
   * @category assertion errors
   * @alias Assertion#throwError
   * @param {string|RegExp|Function|Object|GeneratorFunction|GeneratorObject} [message] Message to match or properties
   * @param {Object} [properties] Optional properties that will be matched to thrown error
   * @example
   *
   * (function(){ throw new Error('fail') }).should.throw();
   * (function(){ throw new Error('fail') }).should.throw('fail');
   * (function(){ throw new Error('fail') }).should.throw(/fail/);
   *
   * (function(){ throw new Error('fail') }).should.throw(Error);
   * var error = new Error();
   * error.a = 10;
   * (function(){ throw error; }).should.throw(Error, { a: 10 });
   * (function(){ throw error; }).should.throw({ a: 10 });
   * (function*() {
   *   yield throwError();
   * }).should.throw();
   */
  Assertion.add("throw", function(message, properties) {
    var fn = this.obj;
    var err = {};
    var errorInfo = "";
    var thrown = false;

    if (shouldUtil.isGeneratorFunction(fn)) {
      return should(fn()).throw(message, properties);
    } else if (shouldUtil.isIterator(fn)) {
      return should(fn.next.bind(fn)).throw(message, properties);
    }

    this.is.a.Function();

    var errorMatched = true;

    try {
      fn();
    } catch (e) {
      thrown = true;
      err = e;
    }

    if (thrown) {
      if (message) {
        if ("string" == typeof message) {
          errorMatched = message == err.message;
        } else if (message instanceof RegExp) {
          errorMatched = message.test(err.message);
        } else if ("function" == typeof message) {
          errorMatched = err instanceof message;
        } else if (null != message) {
          try {
            should(err).match(message);
          } catch (e) {
            if (e instanceof should.AssertionError) {
              errorInfo = ": " + e.message;
              errorMatched = false;
            } else {
              throw e;
            }
          }
        }

        if (!errorMatched) {
          if ("string" == typeof message || message instanceof RegExp) {
            errorInfo =
              " with a message matching " +
              i(message) +
              ", but got '" +
              err.message +
              "'";
          } else if ("function" == typeof message) {
            errorInfo =
              " of type " +
              functionName(message) +
              ", but got " +
              functionName(err.constructor);
          }
        } else if ("function" == typeof message && properties) {
          try {
            should(err).match(properties);
          } catch (e) {
            if (e instanceof should.AssertionError) {
              errorInfo = ": " + e.message;
              errorMatched = false;
            } else {
              throw e;
            }
          }
        }
      } else {
        errorInfo = " (got " + i(err) + ")";
      }
    }

    this.params = { operator: "to throw exception" + errorInfo };

    this.assert(thrown);
    this.assert(errorMatched);
  });

  Assertion.alias("throw", "throwError");
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */

function matchingAssertions(should, Assertion) {
  var i = should.format;

  /**
   * Asserts if given object match `other` object, using some assumptions:
   * First object matched if they are equal,
   * If `other` is a regexp and given object is a string check on matching with regexp
   * If `other` is a regexp and given object is an array check if all elements matched regexp
   * If `other` is a regexp and given object is an object check values on matching regexp
   * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
   * If `other` is an object check if the same keys matched with above rules
   * All other cases failed.
   *
   * Usually it is right idea to add pre type assertions, like `.String()` or `.Object()` to be sure assertions will do what you are expecting.
   * Object iteration happen by keys (properties with enumerable: true), thus some objects can cause small pain. Typical example is js
   * Error - it by default has 2 properties `name` and `message`, but they both non-enumerable. In this case make sure you specify checking props (see examples).
   *
   * @name match
   * @memberOf Assertion
   * @category assertion matching
   * @param {*} other Object to match
   * @param {string} [description] Optional message
   * @example
   * 'foobar'.should.match(/^foo/);
   * 'foobar'.should.not.match(/^bar/);
   *
   * ({ a: 'foo', c: 'barfoo' }).should.match(/foo$/);
   *
   * ['a', 'b', 'c'].should.match(/[a-z]/);
   *
   * (5).should.not.match(function(n) {
   *   return n < 0;
   * });
   * (5).should.not.match(function(it) {
   *    it.should.be.an.Array();
   * });
   * ({ a: 10, b: 'abc', c: { d: 10 }, d: 0 }).should
   * .match({ a: 10, b: /c$/, c: function(it) {
   *    return it.should.have.property('d', 10);
   * }});
   *
   * [10, 'abc', { d: 10 }, 0].should
   * .match({ '0': 10, '1': /c$/, '2': function(it) {
   *    return it.should.have.property('d', 10);
   * }});
   *
   * var myString = 'abc';
   *
   * myString.should.be.a.String().and.match(/abc/);
   *
   * myString = {};
   *
   * myString.should.match(/abc/); //yes this will pass
   * //better to do
   * myString.should.be.an.Object().and.not.empty().and.match(/abc/);//fixed
   *
   * (new Error('boom')).should.match(/abc/);//passed because no keys
   * (new Error('boom')).should.not.match({ message: /abc/ });//check specified property
   */
  Assertion.add("match", function(other, description) {
    this.params = { operator: "to match " + i(other), message: description };

    if (eql(this.obj, other).length !== 0) {
      if (other instanceof RegExp) {
        // something - regex

        if (typeof this.obj == "string") {
          this.assert(other.exec(this.obj));
        } else if (null != this.obj && typeof this.obj == "object") {
          var notMatchedProps = [],
            matchedProps = [];
          shouldTypeAdaptors.forEach(
            this.obj,
            function(value, name) {
              if (other.exec(value)) {
                matchedProps.push(formatProp(name));
              } else {
                notMatchedProps.push(formatProp(name) + " (" + i(value) + ")");
              }
            },
            this
          );

          if (notMatchedProps.length) {
            this.params.operator += "\n    not matched properties: " + notMatchedProps.join(", ");
          }
          if (matchedProps.length) {
            this.params.operator += "\n    matched properties: " + matchedProps.join(", ");
          }

          this.assert(notMatchedProps.length === 0);
        } else {
          // should we try to convert to String and exec?
          this.assert(false);
        }
      } else if (typeof other == "function") {
        var res;

        res = other(this.obj);

        //if we throw exception ok - it is used .should inside
        if (typeof res == "boolean") {
          this.assert(res); // if it is just boolean function assert on it
        }
      } else if (typeof this.obj == "object" && this.obj != null && (isPlainObject(other) || Array.isArray(other))) {
        // try to match properties (for Object and Array)
        notMatchedProps = [];
        matchedProps = [];

        shouldTypeAdaptors.forEach(
          other,
          function(value, key) {
            try {
              should(this.obj)
                .have.property(key)
                .which.match(value);
              matchedProps.push(formatProp(key));
            } catch (e) {
              if (e instanceof should.AssertionError) {
                notMatchedProps.push(formatProp(key) + " (" + i(this.obj[key]) + ")");
              } else {
                throw e;
              }
            }
          },
          this
        );

        if (notMatchedProps.length) {
          this.params.operator += "\n    not matched properties: " + notMatchedProps.join(", ");
        }
        if (matchedProps.length) {
          this.params.operator += "\n    matched properties: " + matchedProps.join(", ");
        }

        this.assert(notMatchedProps.length === 0);
      } else {
        this.assert(false);
      }
    }
  });

  /**
   * Asserts if given object values or array elements all match `other` object, using some assumptions:
   * First object matched if they are equal,
   * If `other` is a regexp - matching with regexp
   * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
   * All other cases check if this `other` equal to each element
   *
   * @name matchEach
   * @memberOf Assertion
   * @category assertion matching
   * @alias Assertion#matchEvery
   * @param {*} other Object to match
   * @param {string} [description] Optional message
   * @example
   * [ 'a', 'b', 'c'].should.matchEach(/\w+/);
   * [ 'a', 'a', 'a'].should.matchEach('a');
   *
   * [ 'a', 'a', 'a'].should.matchEach(function(value) { value.should.be.eql('a') });
   *
   * { a: 'a', b: 'a', c: 'a' }.should.matchEach(function(value) { value.should.be.eql('a') });
   */
  Assertion.add("matchEach", function(other, description) {
    this.params = {
      operator: "to match each " + i(other),
      message: description
    };

    shouldTypeAdaptors.forEach(
      this.obj,
      function(value) {
        should(value).match(other);
      },
      this
    );
  });

  /**
  * Asserts if any of given object values or array elements match `other` object, using some assumptions:
  * First object matched if they are equal,
  * If `other` is a regexp - matching with regexp
  * If `other` is a function check if this function throws AssertionError on given object or return false - it will be assumed as not matched
  * All other cases check if this `other` equal to each element
  *
  * @name matchAny
  * @memberOf Assertion
  * @category assertion matching
  * @param {*} other Object to match
  * @alias Assertion#matchSome
  * @param {string} [description] Optional message
  * @example
  * [ 'a', 'b', 'c'].should.matchAny(/\w+/);
  * [ 'a', 'b', 'c'].should.matchAny('a');
  *
  * [ 'a', 'b', 'c'].should.matchAny(function(value) { value.should.be.eql('a') });
  *
  * { a: 'a', b: 'b', c: 'c' }.should.matchAny(function(value) { value.should.be.eql('a') });
  */
  Assertion.add("matchAny", function(other, description) {
    this.params = {
      operator: "to match any " + i(other),
      message: description
    };

    this.assert(
      shouldTypeAdaptors.some(this.obj, function(value) {
        try {
          should(value).match(other);
          return true;
        } catch (e) {
          if (e instanceof should.AssertionError) {
            // Caught an AssertionError, return false to the iterator
            return false;
          }
          throw e;
        }
      })
    );
  });

  Assertion.alias("matchAny", "matchSome");
  Assertion.alias("matchEach", "matchEvery");
}

/*
 * should.js - assertion library
 * Copyright(c) 2010-2013 TJ Holowaychuk <tj@vision-media.ca>
 * Copyright(c) 2013-2017 Denis Bardadym <bardadymchik@gmail.com>
 * MIT Licensed
 */
/**
 * Our function should
 *
 * @param {*} obj Object to assert
 * @returns {should.Assertion} Returns new Assertion for beginning assertion chain
 * @example
 *
 * var should = require('should');
 * should('abc').be.a.String();
 */
function should(obj) {
  return new Assertion(obj);
}

should.AssertionError = AssertionError;
should.Assertion = Assertion;

// exposing modules dirty way
should.modules = {
  format: sformat,
  type: getType,
  equal: eql
};
should.format = format;

/**
 * Object with configuration.
 * It contains such properties:
 * * `checkProtoEql` boolean - Affect if `.eql` will check objects prototypes
 * * `plusZeroAndMinusZeroEqual` boolean - Affect if `.eql` will treat +0 and -0 as equal
 * Also it can contain options for should-format.
 *
 * @type {Object}
 * @memberOf should
 * @static
 * @example
 *
 * var a = { a: 10 }, b = Object.create(null);
 * b.a = 10;
 *
 * a.should.be.eql(b);
 * //not throws
 *
 * should.config.checkProtoEql = true;
 * a.should.be.eql(b);
 * //throws AssertionError: expected { a: 10 } to equal { a: 10 } (because A and B have different prototypes)
 */
should.config = config;

/**
 * Allow to extend given prototype with should property using given name. This getter will **unwrap** all standard wrappers like `Number`, `Boolean`, `String`.
 * Using `should(obj)` is the equivalent of using `obj.should` with known issues (like nulls and method calls etc).
 *
 * To add new assertions, need to use Assertion.add method.
 *
 * @param {string} [propertyName] Name of property to add. Default is `'should'`.
 * @param {Object} [proto] Prototype to extend with. Default is `Object.prototype`.
 * @memberOf should
 * @returns {{ name: string, descriptor: Object, proto: Object }} Descriptor enough to return all back
 * @static
 * @example
 *
 * var prev = should.extend('must', Object.prototype);
 *
 * 'abc'.must.startWith('a');
 *
 * var should = should.noConflict(prev);
 * should.not.exist(Object.prototype.must);
 */
should.extend = function(propertyName, proto) {
  propertyName = propertyName || "should";
  proto = proto || Object.prototype;

  var prevDescriptor = Object.getOwnPropertyDescriptor(proto, propertyName);

  Object.defineProperty(proto, propertyName, {
    set: function() {},
    get: function() {
      return should(isWrapperType(this) ? this.valueOf() : this);
    },
    configurable: true
  });

  return { name: propertyName, descriptor: prevDescriptor, proto: proto };
};

/**
 * Delete previous extension. If `desc` missing it will remove default extension.
 *
 * @param {{ name: string, descriptor: Object, proto: Object }} [desc] Returned from `should.extend` object
 * @memberOf should
 * @returns {Function} Returns should function
 * @static
 * @example
 *
 * var should = require('should').noConflict();
 *
 * should(Object.prototype).not.have.property('should');
 *
 * var prev = should.extend('must', Object.prototype);
 * 'abc'.must.startWith('a');
 * should.noConflict(prev);
 *
 * should(Object.prototype).not.have.property('must');
 */
should.noConflict = function(desc) {
  desc = desc || should._prevShould;

  if (desc) {
    delete desc.proto[desc.name];

    if (desc.descriptor) {
      Object.defineProperty(desc.proto, desc.name, desc.descriptor);
    }
  }
  return should;
};

/**
 * Simple utility function for a bit more easier should assertion extension
 * @param {Function} f So called plugin function. It should accept 2 arguments: `should` function and `Assertion` constructor
 * @memberOf should
 * @returns {Function} Returns `should` function
 * @static
 * @example
 *
 * should.use(function(should, Assertion) {
 *   Assertion.add('asset', function() {
 *      this.params = { operator: 'to be asset' };
 *
 *      this.obj.should.have.property('id').which.is.a.Number();
 *      this.obj.should.have.property('path');
 *  })
 * })
 */
should.use = function(f) {
  f(should, should.Assertion);
  return this;
};

should
  .use(assertExtensions)
  .use(chainAssertions)
  .use(booleanAssertions)
  .use(numberAssertions)
  .use(equalityAssertions)
  .use(typeAssertions)
  .use(stringAssertions)
  .use(propertyAssertions)
  .use(errorAssertions)
  .use(matchingAssertions)
  .use(containAssertions)
  .use(promiseAssertions);

module.exports = should;
