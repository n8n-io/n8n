import _ from './underscore.js';
import baseIteratee from './_baseIteratee.js';
import iteratee from './iteratee.js';

// The function we call internally to generate a callback. It invokes
// `_.iteratee` if overridden, otherwise `baseIteratee`.
export default function cb(value, context, argCount) {
  if (_.iteratee !== iteratee) return _.iteratee(value, context);
  return baseIteratee(value, context, argCount);
}
