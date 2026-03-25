var nub = require('../');
var assert = require('assert');

exports.empty = function () {
    assert.deepEqual(nub([]), []);
};

exports.already = function () {
    assert.deepEqual(nub([ 1, 2, 3 ]), [ 1, 2, 3 ]);
};

exports.dups = function () {
    assert.deepEqual(nub([ 1, 1, 2, 1, 3, 2 ]), [ 1, 2, 3 ]);
};

exports.objects = function () {
    var xs = { a : 4, b : 5 };
    var ys = { c : 6 };
    assert.deepEqual(
        nub([ 1, 1, 2, 3, xs, xs, ys, xs, 2, 7, 7, 3, 1, 5 ]),
        [ 1, 2, 3, xs, ys, 7, 5 ]
    );
};

exports.mixed = function () {
    var f = function () {};
    var g = function () {};
    var re = /meow/;
    
    var xs = [
        1, 2, '3', 3, 2, '2', f, f, g, re, false, false, true, false, re,
        undefined, null, undefined, 1, null, null, undefined
    ];
    var res = nub(xs);
    
    assert.deepEqual(res, [
        1, 2, '3', 3, '2', f, g, re, false, true, undefined, null
    ]);
    assert.deepEqual(
        res.map(function (r) { return typeof r }),
        [
            'number', 'number', 'string', 'number', 'string', 'function',
            'function', 'function', 'boolean', 'boolean', 'undefined', 'object'
        ]
    );
};
