/** Copyright 2015 Gregory Langlais. See LICENSE.txt. */

'use strict';

const signature = require('cookie-signature');

/**
 * Assert that an object has specific properties (supports array of keys or object)
 *
 * @param {object} obj
 * @param {object|array} props
 */
function assertHasProperties(obj, props) {
  if (Array.isArray(props)) {
    props.forEach(function (key) {
      if (!(key in obj)) {
        throw new Error('expected object to have property ' + key);
      }
    });
  } else {
    Object.keys(props).forEach(function (key) {
      if (!(key in obj)) {
        throw new Error('expected object to have property ' + key);
      }
    });
  }
}

/**
 * Assert that an object does not have specific properties (supports array of keys or object)
 * When checking with empty props, throws if object exists (matches should.js behavior)
 *
 * @param {object} obj
 * @param {object|array} props
 */
function assertNotHasProperties(obj, props) {
  if (Array.isArray(props)) {
    // When empty array is passed, should.js throws 'false negative fail' if object exists
    if (props.length === 0) {
      throw new Error('expected object to not have properties (false negative fail)');
    }
    props.forEach(function (key) {
      if (key in obj) {
        throw new Error('expected object to not have property ' + key);
      }
    });
  } else {
    // When empty object is passed, should.js throws 'false negative fail' if object exists
    let keys = Object.keys(props);
    if (keys.length === 0) {
      throw new Error('expected object to not have properties (false negative fail)');
    }
    keys.forEach(function (key) {
      if (key in obj) {
        throw new Error('expected object to not have property ' + key);
      }
    });
  }
}

/**
 * Assert that two values are equal
 *
 * @param {*} actual
 * @param {*} expected
 */
function assertEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(
      'expected ' + JSON.stringify(actual) + ' to equal ' + JSON.stringify(expected)
    );
  }
}

/**
 * Assert that two values are not equal
 *
 * @param {*} actual
 * @param {*} expected
 */
function assertNotEqual(actual, expected) {
  if (actual === expected) {
    throw new Error(
      'expected ' + JSON.stringify(actual) + ' to not equal ' + JSON.stringify(expected)
    );
  }
}

/**
 * Build Assertion function
 *
 * {object|object[]} expects cookies
 * {string} expects.<name> and value of cookie
 * {object} expects.options
 * {string} [expects.options.domain]
 * {string} [expects.options.path]
 * {string} [expects.options.expires] UTC string using date.toUTCString()
 * {number} [expects.options.max-age]
 * {boolean} [expects.options.secure]
 * {boolean} [expects.options.httponly]
 * {string|string[]} [expects.secret]
 *
 * @param {null|string|string[]} [secret]
 * @param {function|function[]} [asserts]
 * @returns {Assertion}
 */
module.exports = function (secret, asserts) {
  let assertions = [];

  if (typeof secret === 'string') secret = [secret]; // eslint-disable-line no-param-reassign
  else if (!Array.isArray(secret)) secret = []; // eslint-disable-line no-param-reassign

  if (Array.isArray(asserts)) assertions = asserts;
  else if (typeof asserts === 'function') assertions.push(asserts);

  /**
   * Assertion function with static chainable methods
   *
   * @param {object} res
   * @returns {undefined|string}
   * @constructor
   */
  function Assertion(res) {
    if (typeof res !== 'object') throw new Error('res argument must be object');

    // request and response object initialization
    let request = {
      headers: res.req.getHeaders(),
      cookies: []
    };

    let response = {
      headers: res.headers,
      cookies: []
    };

    // build assertions request object
    if (request.headers.cookie) {
      const cookies = String(request.headers.cookie);
      cookies.split(/; */).forEach(function (cookie) {
        request.cookies.push(Assertion.parse(cookie));
      });
    }

    // build assertions response object
    if (
      Array.isArray(response.headers['set-cookie'])
      && response.headers['set-cookie'].length > 0
    ) {
      response.headers['set-cookie'].forEach(function (val) {
        response.cookies.push(Assertion.parse(val));
      });
    }

    // run assertions
    let result;
    assertions.every(function (assertion) {
      result = assertion(request, response);
      return (typeof (result) !== 'string');
    });

    return result;
  }

  /**
   * Find cookie in stack/array
   *
   * @param {string} name
   * @param {array} stack
   * @returns {object|undefined} cookie
   */
  Assertion.find = function (name, stack) {
    let cookie;

    stack.every(function (val) {
      if (name !== val.name) return true;
      cookie = val;
      return false;
    });

    return cookie;
  };

  /**
   * Parse cookie string
   *
   * @param {string} str
   * @param {object} [options]
   * @param {function} [options.decode] uri
   * @param {undefined|boolean} [options.request] headers
   * @returns {object}
   */
  Assertion.parse = function (str, options) {
    if (typeof str !== 'string') throw new TypeError('argument str must be a string');

    if (typeof options !== 'object') options = {}; // eslint-disable-line no-param-reassign

    let decode = options.decode || decodeURIComponent;

    let parts = str.split(/; */);

    let cookie = {};

    parts.forEach(function (part, i) {
      if (i === 1) cookie.options = {};

      let equalsIndex = part.indexOf('=');

      // things that don't look like key=value get true flag
      if (equalsIndex < 0) {
        cookie.options[part.trim().toLowerCase()] = true;
        return;
      }

      const key = part.substr(0, equalsIndex).trim().toLowerCase();
      // only assign once
      if (typeof cookie[key] !== 'undefined') return;

      equalsIndex += 1;
      let val = part.substr(equalsIndex, part.length).trim();
      // quoted values
      if (val[0] === '"') val = val.slice(1, -1);

      let value;
      try {
        value = decode(val);
      } catch (e) {
        value = val;
      }

      if (i > 0) {
        cookie.options[key] = value;
        return;
      }

      cookie.name = key;
      cookie.value = decode(val);
    });

    if (typeof cookie.options === 'undefined') cookie.options = {};

    return cookie;
  };

  /**
   * Iterate expects
   *
   * @param {object|object[]} expects
   * @param {boolean|function} hasValues
   * @param {function} [cb]
   */
  Assertion.expects = function (expects, hasValues, cb) {
    if (!Array.isArray(expects) && typeof expects === 'object') expects = [expects]; // eslint-disable-line no-param-reassign

    let resolvedCb;
    let resolvedHasValues;
    if (typeof cb === 'undefined' && typeof hasValues === 'function') {
      resolvedCb = hasValues;
      resolvedHasValues = false;
    } else {
      resolvedCb = cb;
      resolvedHasValues = hasValues;
    }

    expects.forEach(function (expect) {
      let options = expect.options;
      if (typeof options !== 'object' && !Array.isArray(options)) {
        options = (resolvedHasValues) ? {} : [];
      }

      resolvedCb(Object.assign({}, expect, { options }));
    });
  };

  /**
   * Assert cookies and options are set
   *
   * @param {object|object[]} expects cookies
   * @param {undefined|boolean} [assert]
   * @returns {function} Assertion
   */
  Assertion.set = function (expects, assert) {
    if (typeof assert === 'undefined') assert = true; // eslint-disable-line no-param-reassign

    Assertion.expects(expects, function (expect) {
      assertions.push(function (req, res) {
        // get expectation cookie
        const cookie = Assertion.find(expect.name, res.cookies);

        if (assert && !cookie) throw new Error('expected: ' + expect.name + ' cookie to be set');

        if (assert) assertHasProperties(cookie.options, expect.options);
        else if (cookie) assertNotHasProperties(cookie.options, expect.options);
      });
    });

    return Assertion;
  };

  /**
   * Assert cookies has been reset
   *
   * @param {object|object[]} expects cookies
   * @param {undefined|boolean} [assert]
   * @returns {function} Assertion
   */
  Assertion.reset = function (expects, assert) {
    if (typeof assert === 'undefined') assert = true; // eslint-disable-line no-param-reassign

    Assertion.expects(expects, function (expect) {
      assertions.push(function (req, res) {
        // get sent cookie
        const cookieReq = Assertion.find(expect.name, req.cookies);
        // get expectation cookie
        const cookieRes = Assertion.find(expect.name, res.cookies);

        if (assert && (!cookieReq || !cookieRes)) {
          throw new Error('expected: ' + expect.name + ' cookie to be set');
        } else if (!assert && cookieReq && cookieRes) {
          throw new Error('expected: ' + expect.name + ' cookie to be set');
        }
      });
    });

    return Assertion;
  };

  /**
   * Assert cookies is set and new
   *
   * @param {object|object[]} expects cookies
   * @param {undefined|boolean} [assert]
   * @returns {function} Assertion
   */
  Assertion.new = function (expects, assert) {
    if (typeof assert === 'undefined') assert = true; // eslint-disable-line no-param-reassign

    Assertion.expects(expects, function (expect) {
      assertions.push(function (req, res) {
        // get sent cookie
        const cookieReq = Assertion.find(expect.name, req.cookies);
        // get expectation cookie
        const cookieRes = Assertion.find(expect.name, res.cookies);

        if (assert) {
          if (!cookieRes) throw new Error('expected: ' + expect.name + ' cookie to be set');
          if (cookieReq && cookieRes) {
            throw new Error('expected: ' + expect.name + ' cookie to NOT already be set');
          }
        } else if (!cookieReq || !cookieRes) {
          throw new Error('expected: ' + expect.name + ' cookie to be set');
        }
      });
    });

    return Assertion;
  };

  /**
   * Assert cookies expires or max-age has increased
   *
   * @param {object|object[]} expects cookies
   * @param {undefined|boolean} [assert]
   * @returns {function} Assertion
   */
  Assertion.renew = function (expects, assert) {
    if (typeof assert === 'undefined') assert = true; // eslint-disable-line no-param-reassign

    Assertion.expects(expects, true, function (expect) {
      const expectExpires = new Date(expect.options.expires);
      const expectMaxAge = parseFloat(expect.options['max-age']);

      let baseMessage = 'expected: ' + expect.name;
      if (!expectExpires.getTime() && !expectMaxAge) {
        throw new Error(baseMessage + ' expects to have expires or max-age option');
      }

      assertions.push(function (req, res) {
        // get sent cookie
        const cookieReq = Assertion.find(expect.name, req.cookies);
        // get expectation cookie
        const cookieRes = Assertion.find(expect.name, res.cookies);

        const cookieMaxAge = (expectMaxAge && cookieRes)
          ? parseFloat(cookieRes.options['max-age'])
          : undefined;
        const cookieExpires = (expectExpires.getTime() && cookieRes)
          ? new Date(cookieRes.options.expires)
          : undefined;

        if (assert) {
          if (!cookieReq || !cookieRes) {
            throw new Error(baseMessage + ' cookie to be set');
          }
          if (expectMaxAge && (!cookieMaxAge || cookieMaxAge <= expectMaxAge)) {
            throw new Error(baseMessage + ' cookie max-age to be greater than existing value');
          }

          if (
            expectExpires.getTime()
            && (!cookieExpires.getTime() || cookieExpires <= expectExpires)
          ) {
            throw new Error(baseMessage + ' cookie expires to be greater than existing value');
          }
        } else if (cookieRes) {
          if (expectMaxAge && cookieMaxAge > expectMaxAge) {
            throw new Error(
              baseMessage + ' cookie max-age to be less than or equal to existing value'
            );
          }

          if (expectExpires.getTime() && cookieExpires > expectExpires) {
            throw new Error(
              baseMessage + ' cookie expires to be less than or equal to existing value'
            );
          }
        }
      });
    });

    return Assertion;
  };

  /**
   * Assert cookies contains values
   *
   * @param {object|object[]} expects cookies
   * @param {undefined|boolean} [assert]
   * @returns {function} Assertion
   */
  Assertion.contain = function (expects, assert) {
    if (typeof assert === 'undefined') assert = true; // eslint-disable-line no-param-reassign

    Assertion.expects(expects, function (expect) {
      const keys = Object.keys(expect.options);

      assertions.push(function (req, res) {
        // get expectation cookie
        const cookie = Assertion.find(expect.name, res.cookies);

        if (!cookie) throw new Error('expected: ' + expect.name + ' cookie to be set');

        // check cookie values are equal
        if ('value' in expect) {
          try {
            if (assert) assertEqual(cookie.value, expect.value);
            else assertNotEqual(cookie.value, expect.value);
          } catch (e) {
            if (secret.length) {
              let value;
              secret.every(function (sec) {
                value = signature.unsign(cookie.value.slice(2), sec);
                return !(value && value === expect.value);
              });

              if (assert && !value) {
                throw new Error('expected: ' + expect.name + ' value to equal ' + expect.value);
              } else if (!assert && value) {
                throw new Error('expected: ' + expect.name + ' value to NOT equal ' + expect.value);
              }
            } else throw e;
          }
        }

        keys.forEach(function (key) {
          const expected = (
            key === 'max-age'
              ? expect.options[key].toString()
              : expect.options[key]
          );
          if (assert) assertEqual(cookie.options[key], expected);
          else assertNotEqual(cookie.options[key], expected);
        });
      });
    });

    return Assertion;
  };

  /**
   * Assert NOT modifier
   *
   * @param {function} method
   * @param {...*}
   */
  Assertion.not = function (method) {
    let args = [];

    for (let i = 1; i < arguments.length; i += 1) args.push(arguments[i]);

    args.push(false);

    return Assertion[method].apply(Assertion, args);
  };

  return Assertion;
};
