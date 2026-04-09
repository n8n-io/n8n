'use strict';
var $ = require('../internals/export');
var getBuiltIn = require('../internals/get-built-in');
var uncurryThis = require('../internals/function-uncurry-this');
var aCallable = require('../internals/a-callable');
var requireObjectCoercible = require('../internals/require-object-coercible');
var toPropertyKey = require('../internals/to-property-key');
var iterate = require('../internals/iterate');

var create = getBuiltIn('Object', 'create');
var push = uncurryThis([].push);

// `Object.groupBy` method
// https://github.com/tc39/proposal-array-grouping
$({ target: 'Object', stat: true }, {
  groupBy: function groupBy(items, callbackfn) {
    requireObjectCoercible(items);
    aCallable(callbackfn);
    var obj = create(null);
    var k = 0;
    iterate(items, function (value) {
      var key = toPropertyKey(callbackfn(value, k++));
      // in some IE versions, `hasOwnProperty` returns incorrect result on integer keys
      // but since it's a `null` prototype object, we can safely use `in`
      if (key in obj) push(obj[key], value);
      else obj[key] = [value];
    });
    return obj;
  }
});
