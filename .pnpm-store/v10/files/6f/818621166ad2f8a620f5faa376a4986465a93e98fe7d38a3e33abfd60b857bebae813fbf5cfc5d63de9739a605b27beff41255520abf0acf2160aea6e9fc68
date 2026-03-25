"use strict";

var assert = require("@sinonjs/referee-sinon").assert;
var knuthShuffle = require("knuth-shuffle").knuthShuffle;
var sinon = require("@sinonjs/referee-sinon").sinon;
var orderByFirstCall = require("./order-by-first-call");

describe("orderByFirstCall", function () {
    it("should order an Array of spies by the callId of the first call, ascending", function () {
        // create an array of spies
        var spies = [
            sinon.spy(),
            sinon.spy(),
            sinon.spy(),
            sinon.spy(),
            sinon.spy(),
            sinon.spy(),
        ];

        // call all the spies
        spies.forEach(function (spy) {
            spy();
        });

        // add a few uncalled spies
        spies.push(sinon.spy());
        spies.push(sinon.spy());

        // randomise the order of the spies
        knuthShuffle(spies);

        var sortedSpies = orderByFirstCall(spies);

        assert.equals(sortedSpies.length, spies.length);

        var orderedByFirstCall = sortedSpies.every(function (spy, index) {
            if (index + 1 === sortedSpies.length) {
                return true;
            }
            var nextSpy = sortedSpies[index + 1];

            // uncalled spies should be ordered first
            if (!spy.called) {
                return true;
            }

            return spy.calledImmediatelyBefore(nextSpy);
        });

        assert.isTrue(orderedByFirstCall);
    });
});
