"use strict";

var assert = require("@sinonjs/referee-sinon").assert;
var sinon = require("@sinonjs/referee-sinon").sinon;
var every = require("./every");

describe("util/core/every", function () {
    it("returns true when the callback function returns true for every element in an iterable", function () {
        var obj = [true, true, true, true];
        var allTrue = every(obj, function (val) {
            return val;
        });

        assert(allTrue);
    });

    it("returns false when the callback function returns false for any element in an iterable", function () {
        var obj = [true, true, true, false];
        var result = every(obj, function (val) {
            return val;
        });

        assert.isFalse(result);
    });

    it("calls the given callback once for each item in an iterable until it returns false", function () {
        var iterableOne = [true, true, true, true];
        var iterableTwo = [true, true, false, true];
        var callback = sinon.spy(function (val) {
            return val;
        });

        every(iterableOne, callback);
        assert.equals(callback.callCount, 4);

        callback.resetHistory();

        every(iterableTwo, callback);
        assert.equals(callback.callCount, 3);
    });
});
