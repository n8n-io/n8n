import partial from './partial.js';

// Returns the first function passed as an argument to the second,
// allowing you to adjust arguments, run code before and after, and
// conditionally execute the original function.
export default function wrap(func, wrapper) {
  return partial(wrapper, func);
}
