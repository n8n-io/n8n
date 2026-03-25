'use strict';

function createMap(values, ignoreCase) {
  var map = {};
  values.forEach(function(value) {
    map[value] = 1;
  });
  return ignoreCase ? function(value) {
    return map[value.toLowerCase()] === 1;
  } : function(value) {
    return map[value] === 1;
  };
}

exports.createMap = createMap;
exports.createMapFromString = function(values, ignoreCase) {
  return createMap(values.split(/,/), ignoreCase);
};
