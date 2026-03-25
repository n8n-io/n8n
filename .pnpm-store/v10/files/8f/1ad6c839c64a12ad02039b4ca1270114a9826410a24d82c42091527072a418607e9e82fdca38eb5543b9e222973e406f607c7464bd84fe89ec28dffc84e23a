var assert = require('assert');
var nub = require('../');

exports.false = function () {
    var xs = [ 3, 3, 1, 1, 2, 1, 2, 1 ];
    assert.deepEqual(
        nub.by(xs, function () { return false }),
        xs
    );
};

exports.true = function () {
    var xs = [ 3, 3, 1, 1, 2, 1, 2, 1 ];
    assert.deepEqual(
        nub.by(xs, function () { return true }),
        [3]
    );
};

exports.stringify = function () {
    var xs = { a : 1, b : 2 };
    var ys = { a : 1, b : 2 };
    assert.deepEqual(
        nub.by([ 3, 4, xs, ys, 5, 6 ], function (x, y) {
            return JSON.stringify(x) === JSON.stringify(y)
        }),
        [ 3, 4, xs, 5, 6 ]
    );
};

exports.mod = function () {
    var xs = { a : 1, b : 2 };
    var ys = { a : 1, b : 2 };
    assert.deepEqual(
        nub.by([ 1, 6, 3, 4, 5, 2, 7, 8 ], function (x, y) {
            return x % 4 === y % 4
        }),
        [ 1, 6, 3, 4 ]
    );
};

exports.dispatchMod = function () {
    var xs = { a : 1, b : 2 };
    var ys = { a : 1, b : 2 };
    assert.deepEqual(
        nub([ 1, 6, 3, 4, 5, 2, 7, 8 ], function (x, y) {
            return x % 4 === y % 4
        }),
        [ 1, 6, 3, 4 ]
    );
};
