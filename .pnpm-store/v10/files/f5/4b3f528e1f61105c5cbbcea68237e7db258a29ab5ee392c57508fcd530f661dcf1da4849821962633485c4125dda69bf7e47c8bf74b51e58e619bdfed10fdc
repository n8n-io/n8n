define(['./_setup'], function (_setup) {

  // Returns everything but the first entry of the `array`. Especially useful on
  // the `arguments` object. Passing an **n** will return the rest N values in the
  // `array`.
  function rest(array, n, guard) {
    return _setup.slice.call(array, n == null || guard ? 1 : n);
  }

  return rest;

});
