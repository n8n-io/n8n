'use strict';
var $ = require('../internals/export');
var uncurryThis = require('../internals/function-uncurry-this');
var aCallable = require('../internals/a-callable');
var requireObjectCoercible = require('../internals/require-object-coercible');
var iterate = require('../internals/iterate');
var MapHelpers = require('../internals/map-helpers');
var IS_PURE = require('../internals/is-pure');

var Map = MapHelpers.Map;
var has = MapHelpers.has;
var get = MapHelpers.get;
var set = MapHelpers.set;
var push = uncurryThis([].push);

// `Map.groupBy` method
// https://github.com/tc39/proposal-array-grouping
$({ target: 'Map', stat: true, forced: IS_PURE }, {
  groupBy: function groupBy(items, callbackfn) {
    requireObjectCoercible(items);
    aCallable(callbackfn);
    var map = new Map();
    var k = 0;
    iterate(items, function (value) {
      var key = callbackfn(value, k++);
      if (!has(map, key)) set(map, key, [value]);
      else push(get(map, key), value);
    });
    return map;
  }
});
