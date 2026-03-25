define(['./_group'], function (_group) {

  // Split a collection into two arrays: one whose elements all pass the given
  // truth test, and one whose elements all do not pass the truth test.
  var partition = _group(function(result, value, pass) {
    result[pass ? 0 : 1].push(value);
  }, true);

  return partition;

});
