"use strict";

var iterate = require("../pop-iterate");

describe("array iterator", function () {

    it("iterates an array", function () {
        var iterator = iterate([1, 2, 3]);
        expect(iterator.next()).toEqual({value: 1, done: false, index: 0});
        expect(iterator.next()).toEqual({value: 2, done: false, index: 1});
        expect(iterator.next()).toEqual({value: 3, done: false, index: 2});
        expect(iterator.next()).toEqual({done: true});
    });

    it("handles stuttering", function () {
        var iterator = iterate([]);
        expect(iterator.next()).toEqual({done: true});
        expect(iterator.next()).toEqual({done: true});
        expect(iterator.next()).toEqual({done: true});
    });

    it("start, stop, and step", function () {
        var iterator = iterate([1, 2, 3, 4, 5, 6, 7, 8], 1, 6, 2);
        expect(iterator.next()).toEqual({value: 2, done: false, index: 1});
        expect(iterator.next()).toEqual({value: 4, done: false, index: 3});
        expect(iterator.next()).toEqual({value: 6, done: false, index: 5});
        expect(iterator.next()).toEqual({done: true});
    });

});

describe("iterate an object", function () {

    it("returns entries", function () {
        var object = {a: 10, b: 20, c: 30};
        var iterator = iterate(object);
        expect(iterator.next()).toEqual({value: 10, done: false, index: "a"});
        expect(iterator.next()).toEqual({value: 20, done: false, index: "b"});
        expect(iterator.next()).toEqual({value: 30, done: false, index: "c"});
        expect(iterator.next()).toEqual({done: true});
    });

});

describe("custom iterator", function () {

    it("calls through to custom iterator", function () {
        var iterator, prevValue, nextValue, start, stop, step;
        iterator = iterate({
            iterate: function (gotStart, gotStop, gotStep) {
                start = gotStart;
                stop = gotStop;
                step = gotStep;
                return {
                    next: function (value) {
                        prevValue = value;
                        return nextValue;
                    }
                };
            }
        }, 1, 2, 3);

        expect(start).toBe(1);
        expect(stop).toBe(2);
        expect(step).toBe(3);

        nextValue = 10;
        expect(iterator.next(20)).toBe(10);
        expect(prevValue).toBe(20);
    });

});
