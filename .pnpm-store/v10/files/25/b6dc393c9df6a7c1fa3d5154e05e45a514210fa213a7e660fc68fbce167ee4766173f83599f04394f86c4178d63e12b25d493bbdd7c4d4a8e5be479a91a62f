import {flag} from './flag.js';
import {type} from './type-detect.js';

/**
 * @param {unknown} obj
 * @returns {boolean}
 */
function isObjectType(obj) {
  var objectType = type(obj);
  var objectTypes = ['Array', 'Object', 'Function'];

  return objectTypes.indexOf(objectType) !== -1;
}

/**
 * ### .getOperator(message)
 *
 * Extract the operator from error message.
 * Operator defined is based on below link
 * https://nodejs.org/api/assert.html#assert_assert.
 *
 * Returns the `operator` or `undefined` value for an Assertion.
 *
 * @param {object} obj object (constructed Assertion)
 * @param {unknown} args chai.Assertion.prototype.assert arguments
 * @returns {unknown}
 * @namespace Utils
 * @name getOperator
 * @public
 */
export function getOperator(obj, args) {
  var operator = flag(obj, 'operator');
  var negate = flag(obj, 'negate');
  var expected = args[3];
  var msg = negate ? args[2] : args[1];

  if (operator) {
    return operator;
  }

  if (typeof msg === 'function') msg = msg();

  msg = msg || '';
  if (!msg) {
    return undefined;
  }

  if (/\shave\s/.test(msg)) {
    return undefined;
  }

  var isObject = isObjectType(expected);
  if (/\snot\s/.test(msg)) {
    return isObject ? 'notDeepStrictEqual' : 'notStrictEqual';
  }

  return isObject ? 'deepStrictEqual' : 'strictEqual';
}
