define(['./restArguments', './uniq', './_flatten'], function (restArguments, uniq, _flatten) {

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  var union = restArguments(function(arrays) {
    return uniq(_flatten(arrays, true, true));
  });

  return union;

});
