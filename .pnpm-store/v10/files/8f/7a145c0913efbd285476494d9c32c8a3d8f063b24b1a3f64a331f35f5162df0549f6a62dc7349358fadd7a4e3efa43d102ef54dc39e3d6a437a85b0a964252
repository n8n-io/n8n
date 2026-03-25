"use strict";

var assert = require("@sinonjs/referee-sinon").assert;
var typeOf = require("./type-of");

describe("typeOf", function () {
    it("returns boolean", function () {
        assert.equals(typeOf(false), "boolean");
    });

    it("returns string", function () {
        assert.equals(typeOf("Sinon.JS"), "string");
    });

    it("returns number", function () {
        assert.equals(typeOf(123), "number");
    });

    it("returns object", function () {
        assert.equals(typeOf({}), "object");
    });

    it("returns function", function () {
        assert.equals(
            typeOf(function () {
                return undefined;
            }),
            "function"
        );
    });

    it("returns undefined", function () {
        assert.equals(typeOf(undefined), "undefined");
    });

    it("returns null", function () {
        assert.equals(typeOf(null), "null");
    });

    it("returns array", function () {
        assert.equals(typeOf([]), "array");
    });

    it("returns regexp", function () {
        assert.equals(typeOf(/.*/), "regexp");
    });

    it("returns date", function () {
        assert.equals(typeOf(new Date()), "date");
    });
});
