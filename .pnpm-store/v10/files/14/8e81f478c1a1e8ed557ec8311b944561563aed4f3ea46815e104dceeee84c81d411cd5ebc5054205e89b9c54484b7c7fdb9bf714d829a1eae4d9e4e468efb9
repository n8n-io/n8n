import castPath from './_castPath.js';
import last from './last.js';
import parent from './_parent.js';
import toKey from './_toKey.js';

/** Used for built-in method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * The base implementation of `_.unset`.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {Array|string} path The property path to unset.
 * @returns {boolean} Returns `true` if the property is deleted, else `false`.
 */
function baseUnset(object, path) {
  path = castPath(path, object);

  // Prevent prototype pollution, see: https://github.com/lodash/lodash/security/advisories/GHSA-xxjr-mmjv-4gpg
  var index = -1,
      length = path.length;

  if (!length) {
    return true;
  }

  var isRootPrimitive = object == null || (typeof object !== 'object' && typeof object !== 'function');

  while (++index < length) {
    var key = path[index];

    // skip non-string keys (e.g., Symbols, numbers)
    if (typeof key !== 'string') {
      continue;
    }

    // Always block "__proto__" anywhere in the path if it's not expected
    if (key === '__proto__' && !hasOwnProperty.call(object, '__proto__')) {
      return false;
    }

    // Block "constructor.prototype" chains
    if (key === 'constructor' &&
        (index + 1) < length &&
        typeof path[index + 1] === 'string' &&
        path[index + 1] === 'prototype') {

      // Allow ONLY when the path starts at a primitive root, e.g., _.unset(0, 'constructor.prototype.a')
      if (isRootPrimitive && index === 0) {
        continue;
      }

      return false;
    }
  }

  var obj = parent(object, path);
  return obj == null || delete obj[toKey(last(path))];
}

export default baseUnset;
