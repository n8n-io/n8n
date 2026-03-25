var lazyIterators = require("../lib/lazy-iterators");

exports.convertingArrayToIteratorAndBack = function(test) {
    var original = ["apple", "banana", "coconut"];
    var iterator = lazyIterators.fromArray(original);
    var reconstituted = iterator.toArray();
    test.deepEqual(original, reconstituted);
    test.done();
};

exports.mapAppliesFunctionToEveryElement = function(test) {
    var original = [1, 2, 3];
    var squared = lazyIterators.fromArray(original).map(function(i) {
        return i * i;
    }).toArray();
    test.deepEqual([1, 4, 9], squared);
    test.done();
};

exports.mappingFunctionIsOnlyCalledWhenNecessary = function(test) {
    var original = [1, 2, 3];
    var faultySquared = lazyIterators.fromArray(original).map(function(i) {
        if (i === 1) {
            return i;
        } else {
            throw new Error("Can only calculate the square of one");
        }
    }).first();
    test.deepEqual(1, faultySquared);
    test.done();
};

exports.filterRetainsElementsThatSatisfyPredicate = function(test) {
    var original = [1, 2, 3, 4];
    var even = lazyIterators.fromArray(original).filter(function(i) {
        return i % 2 === 0;
    }).toArray();
    test.deepEqual([2, 4], even);
    test.done();
};

exports.firstReturnsFirstElementOfArray = function(test) {
    var original = [1, 2, 3, 4];
    var first = lazyIterators.fromArray(original).first();
    test.deepEqual(1, first);
    test.done();
};

exports.firstIsNullIfArrayIsEmpty = function(test) {
    var first = lazyIterators.fromArray([]).first();
    test.same(null, first);
    test.done();
};
