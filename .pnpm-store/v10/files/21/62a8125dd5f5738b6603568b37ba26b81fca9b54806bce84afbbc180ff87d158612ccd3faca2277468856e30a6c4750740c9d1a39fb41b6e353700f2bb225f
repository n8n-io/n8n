import rest from './rest.js';

// Get the last element of an array. Passing **n** will return the last N
// values in the array.
export default function last(array, n, guard) {
  if (array == null || array.length < 1) return n == null || guard ? void 0 : [];
  if (n == null || guard) return array[array.length - 1];
  return rest(array, Math.max(0, array.length - n));
}
