'use strict';

const assert = require('assert');
const { inspect } = require('util');

// Only use this for integers! Decimal numbers do not work with this function.
function addNumericalSeparator(val) {
  let res = '';
  let i = val.length;
  const start = val[0] === '-' ? 1 : 0;
  for (; i >= start + 4; i -= 3)
    res = `_${val.slice(i - 3, i)}${res}`;
  return `${val.slice(0, i)}${res}`;
}

function oneOf(expected, thing) {
  assert(typeof thing === 'string', '`thing` has to be of type string');
  if (Array.isArray(expected)) {
    const len = expected.length;
    assert(len > 0, 'At least one expected value needs to be specified');
    expected = expected.map((i) => String(i));
    if (len > 2) {
      return `one of ${thing} ${expected.slice(0, len - 1).join(', ')}, or `
              + expected[len - 1];
    } else if (len === 2) {
      return `one of ${thing} ${expected[0]} or ${expected[1]}`;
    }
    return `of ${thing} ${expected[0]}`;
  }
  return `of ${thing} ${String(expected)}`;
}


exports.ERR_INTERNAL_ASSERTION = class ERR_INTERNAL_ASSERTION extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, ERR_INTERNAL_ASSERTION);

    const suffix = 'This is caused by either a bug in ssh2 '
                   + 'or incorrect usage of ssh2 internals.\n'
                   + 'Please open an issue with this stack trace at '
                   + 'https://github.com/mscdex/ssh2/issues\n';

    this.message = (message === undefined ? suffix : `${message}\n${suffix}`);
  }
};

const MAX_32BIT_INT = 2 ** 32;
const MAX_32BIT_BIGINT = (() => {
  try {
    return new Function('return 2n ** 32n')();
  } catch {}
})();
exports.ERR_OUT_OF_RANGE = class ERR_OUT_OF_RANGE extends RangeError {
  constructor(str, range, input, replaceDefaultBoolean) {
    super();
    Error.captureStackTrace(this, ERR_OUT_OF_RANGE);

    assert(range, 'Missing "range" argument');
    let msg = (replaceDefaultBoolean
               ? str
               : `The value of "${str}" is out of range.`);
    let received;
    if (Number.isInteger(input) && Math.abs(input) > MAX_32BIT_INT) {
      received = addNumericalSeparator(String(input));
    } else if (typeof input === 'bigint') {
      received = String(input);
      if (input > MAX_32BIT_BIGINT || input < -MAX_32BIT_BIGINT)
        received = addNumericalSeparator(received);
      received += 'n';
    } else {
      received = inspect(input);
    }
    msg += ` It must be ${range}. Received ${received}`;

    this.message = msg;
  }
};

class ERR_INVALID_ARG_TYPE extends TypeError {
  constructor(name, expected, actual) {
    super();
    Error.captureStackTrace(this, ERR_INVALID_ARG_TYPE);

    assert(typeof name === 'string', `'name' must be a string`);

    // determiner: 'must be' or 'must not be'
    let determiner;
    if (typeof expected === 'string' && expected.startsWith('not ')) {
      determiner = 'must not be';
      expected = expected.replace(/^not /, '');
    } else {
      determiner = 'must be';
    }

    let msg;
    if (name.endsWith(' argument')) {
      // For cases like 'first argument'
      msg = `The ${name} ${determiner} ${oneOf(expected, 'type')}`;
    } else {
      const type = (name.includes('.') ? 'property' : 'argument');
      msg = `The "${name}" ${type} ${determiner} ${oneOf(expected, 'type')}`;
    }

    msg += `. Received type ${typeof actual}`;

    this.message = msg;
  }
}
exports.ERR_INVALID_ARG_TYPE = ERR_INVALID_ARG_TYPE;

exports.validateNumber = function validateNumber(value, name) {
  if (typeof value !== 'number')
    throw new ERR_INVALID_ARG_TYPE(name, 'number', value);
};
