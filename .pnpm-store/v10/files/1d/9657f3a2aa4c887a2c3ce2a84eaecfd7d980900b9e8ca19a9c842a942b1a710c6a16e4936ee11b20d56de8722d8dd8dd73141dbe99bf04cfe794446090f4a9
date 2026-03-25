import { slice } from './_setup.js';

// Returns everything but the first entry of the `array`. Especially useful on
// the `arguments` object. Passing an **n** will return the rest N values in the
// `array`.
export default function rest(array, n, guard) {
  return slice.call(array, n == null || guard ? 1 : n);
}
