export function objectOrFunction(x) {
  return typeof x === 'function' || (typeof x === 'object' && x !== null);
}

export function isFunction(x) {
  return typeof x === 'function';
}

export function isMaybeThenable(x) {
  return typeof x === 'object' && x !== null;
}

let _isArray;
if (!Array.isArray) {
  _isArray = x => Object.prototype.toString.call(x) === '[object Array]';
} else {
  _isArray = Array.isArray;
}

export const isArray = _isArray;
