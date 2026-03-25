'use strict';
var $ = require('../internals/export');
var aCallable = require('../internals/a-callable');
var aWeakMap = require('../internals/a-weak-map');
var WeakMapHelpers = require('../internals/weak-map-helpers');

var get = WeakMapHelpers.get;
var has = WeakMapHelpers.has;
var set = WeakMapHelpers.set;

// `WeakMap.prototype.getOrInsertComputed` method
// https://github.com/tc39/proposal-upsert
$({ target: 'WeakMap', proto: true, real: true, forced: true }, {
  getOrInsertComputed: function getOrInsertComputed(key, callbackfn) {
    aWeakMap(this);
    aCallable(callbackfn);
    if (has(this, key)) return get(this, key);
    set(this, key); // key validation
    var value = callbackfn(key);
    set(this, key, value);
    return value;
  }
});
