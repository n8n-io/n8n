'use strict';
var $ = require('../internals/export');
var toObject = require('../internals/to-object');
var isPrototypeOf = require('../internals/object-is-prototype-of');
var getAsyncIteratorFlattenable = require('../internals/get-async-iterator-flattenable');
var AsyncIteratorPrototype = require('../internals/async-iterator-prototype');
var WrapAsyncIterator = require('../internals/async-iterator-wrap');
var IS_PURE = require('../internals/is-pure');

// `AsyncIterator.from` method
// https://github.com/tc39/proposal-async-iterator-helpers
$({ target: 'AsyncIterator', stat: true, forced: IS_PURE }, {
  from: function from(O) {
    var iteratorRecord = getAsyncIteratorFlattenable(typeof O == 'string' ? toObject(O) : O);
    return isPrototypeOf(AsyncIteratorPrototype, iteratorRecord.iterator)
      ? iteratorRecord.iterator
      : new WrapAsyncIterator(iteratorRecord);
  }
});
