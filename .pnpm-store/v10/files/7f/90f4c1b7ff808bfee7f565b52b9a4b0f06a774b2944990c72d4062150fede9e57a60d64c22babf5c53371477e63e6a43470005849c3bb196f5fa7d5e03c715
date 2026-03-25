"use strict";

var jsc = require("jsverify");
var refute = require("@sinonjs/referee-sinon").refute;

var functionName = require("./function-name");

describe("function-name", function () {
    it("should return empty string if func is falsy", function () {
        jsc.assertForall("falsy", function (fn) {
            return functionName(fn) === "";
        });
    });

    it("should use displayName by default", function () {
        jsc.assertForall("nestring", function (displayName) {
            var fn = { displayName: displayName };

            return functionName(fn) === fn.displayName;
        });
    });

    it("should use name if displayName is not available", function () {
        jsc.assertForall("nestring", function (name) {
            var fn = { name: name };

            return functionName(fn) === fn.name;
        });
    });

    it("should fallback to string parsing", function () {
        jsc.assertForall("nat", function (naturalNumber) {
            var name = `fn${naturalNumber}`;
            var fn = {
                toString: function () {
                    return `\nfunction ${name}`;
                },
            };

            return functionName(fn) === name;
        });
    });

    it("should not fail when a name cannot be found", function () {
        refute.exception(function () {
            var fn = {
                toString: function () {
                    return "\nfunction (";
                },
            };

            functionName(fn);
        });
    });

    it("should not fail when toString is undefined", function () {
        refute.exception(function () {
            functionName(Object.create(null));
        });
    });

    it("should not fail when toString throws", function () {
        refute.exception(function () {
            var fn;
            try {
                // eslint-disable-next-line no-eval
                fn = eval("(function*() {})")().constructor;
            } catch (e) {
                // env doesn't support generators
                return;
            }

            functionName(fn);
        });
    });
});
