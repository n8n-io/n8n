import _isFunction from './_isFunction.js';
import _toString from './_toString.js';

export default function _assertPromise(name, p) {
  if (p == null || !_isFunction(p.then)) {
    throw new TypeError('`' + name + '` expected a Promise, received ' + _toString(p, []));
  }
}