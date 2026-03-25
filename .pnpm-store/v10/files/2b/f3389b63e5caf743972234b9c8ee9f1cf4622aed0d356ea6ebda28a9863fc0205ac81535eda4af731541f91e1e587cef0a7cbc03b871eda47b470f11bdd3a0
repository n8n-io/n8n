define(['./_setup'], function (_setup) {

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N.
  function initial(array, n, guard) {
    return _setup.slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  }

  return initial;

});
