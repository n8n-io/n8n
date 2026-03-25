define(['./filter', './negate', './_cb'], function (filter, negate, _cb) {

  // Return all the elements for which a truth test fails.
  function reject(obj, predicate, context) {
    return filter(obj, negate(_cb(predicate)), context);
  }

  return reject;

});
