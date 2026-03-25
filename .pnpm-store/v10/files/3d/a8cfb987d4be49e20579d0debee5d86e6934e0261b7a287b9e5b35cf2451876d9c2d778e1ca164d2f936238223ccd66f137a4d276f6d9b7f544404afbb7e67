"use strict";

var assert = require("@sinonjs/referee-sinon").assert;
var calledInOrder = require("./called-in-order");
var sinon = require("@sinonjs/referee-sinon").sinon;

var testObject1 = {
    someFunction: function () {
        return;
    },
};
var testObject2 = {
    otherFunction: function () {
        return;
    },
};
var testObject3 = {
    thirdFunction: function () {
        return;
    },
};

function testMethod() {
    testObject1.someFunction();
    testObject2.otherFunction();
    testObject2.otherFunction();
    testObject2.otherFunction();
    testObject3.thirdFunction();
}

describe("calledInOrder", function () {
    beforeEach(function () {
        sinon.stub(testObject1, "someFunction");
        sinon.stub(testObject2, "otherFunction");
        sinon.stub(testObject3, "thirdFunction");
        testMethod();
    });
    afterEach(function () {
        testObject1.someFunction.restore();
        testObject2.otherFunction.restore();
        testObject3.thirdFunction.restore();
    });

    describe("given single array argument", function () {
        describe("when stubs were called in expected order", function () {
            it("returns true", function () {
                assert.isTrue(
                    calledInOrder([
                        testObject1.someFunction,
                        testObject2.otherFunction,
                    ])
                );
                assert.isTrue(
                    calledInOrder([
                        testObject1.someFunction,
                        testObject2.otherFunction,
                        testObject2.otherFunction,
                        testObject3.thirdFunction,
                    ])
                );
            });
        });

        describe("when stubs were called in unexpected order", function () {
            it("returns false", function () {
                assert.isFalse(
                    calledInOrder([
                        testObject2.otherFunction,
                        testObject1.someFunction,
                    ])
                );
                assert.isFalse(
                    calledInOrder([
                        testObject2.otherFunction,
                        testObject1.someFunction,
                        testObject1.someFunction,
                        testObject3.thirdFunction,
                    ])
                );
            });
        });
    });

    describe("given multiple arguments", function () {
        describe("when stubs were called in expected order", function () {
            it("returns true", function () {
                assert.isTrue(
                    calledInOrder(
                        testObject1.someFunction,
                        testObject2.otherFunction
                    )
                );
                assert.isTrue(
                    calledInOrder(
                        testObject1.someFunction,
                        testObject2.otherFunction,
                        testObject3.thirdFunction
                    )
                );
            });
        });

        describe("when stubs were called in unexpected order", function () {
            it("returns false", function () {
                assert.isFalse(
                    calledInOrder(
                        testObject2.otherFunction,
                        testObject1.someFunction
                    )
                );
                assert.isFalse(
                    calledInOrder(
                        testObject2.otherFunction,
                        testObject1.someFunction,
                        testObject3.thirdFunction
                    )
                );
            });
        });
    });
});
