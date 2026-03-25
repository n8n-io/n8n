"use strict";

var assert = require("@sinonjs/referee-sinon").assert;
var index = require("./index");

var expectedMethods = [
    "calledInOrder",
    "className",
    "every",
    "functionName",
    "orderByFirstCall",
    "typeOf",
    "valueToString",
];
var expectedObjectProperties = ["deprecated", "prototypes"];

describe("package", function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    expectedMethods.forEach(function (name) {
        it(`should export a method named ${name}`, function () {
            assert.isFunction(index[name]);
        });
    });

    // eslint-disable-next-line mocha/no-setup-in-describe
    expectedObjectProperties.forEach(function (name) {
        it(`should export an object property named ${name}`, function () {
            assert.isObject(index[name]);
        });
    });
});
