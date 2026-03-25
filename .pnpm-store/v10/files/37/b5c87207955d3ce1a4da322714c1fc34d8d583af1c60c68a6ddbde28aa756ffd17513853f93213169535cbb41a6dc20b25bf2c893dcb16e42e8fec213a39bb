'use strict';
var $ = require('../internals/export');
var call = require('../internals/function-call');
var toObject = require('../internals/to-object');
var isPrototypeOf = require('../internals/object-is-prototype-of');
var IteratorPrototype = require('../internals/iterators-core').IteratorPrototype;
var createIteratorProxy = require('../internals/iterator-create-proxy');
var getIteratorFlattenable = require('../internals/get-iterator-flattenable');
var IS_PURE = require('../internals/is-pure');

var IteratorProxy = createIteratorProxy(function () {
  return call(this.next, this.iterator);
}, true);

// `Iterator.from` method
// https://tc39.es/ecma262/#sec-iterator.from
$({ target: 'Iterator', stat: true, forced: IS_PURE }, {
  from: function from(O) {
    var iteratorRecord = getIteratorFlattenable(typeof O == 'string' ? toObject(O) : O, true);
    return isPrototypeOf(IteratorPrototype, iteratorRecord.iterator)
      ? iteratorRecord.iterator
      : new IteratorProxy(iteratorRecord);
  }
});
