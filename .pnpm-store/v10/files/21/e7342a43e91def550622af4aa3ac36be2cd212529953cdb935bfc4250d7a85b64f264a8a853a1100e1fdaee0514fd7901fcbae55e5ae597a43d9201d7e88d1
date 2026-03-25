var expect = require('chai').expect;
var OAuth = require('../../oauth-1.0a');

//TODO: check alphabet and numberic only

describe("nonce_length option", function() {
    describe("default (32)", function() {
        var oauth = OAuth({
            consumer: {}
        });

        it("nonce length should be 32", function() {
            expect(oauth.getNonce().length).to.equal(32);
        });
    });

    describe("length 100", function() {
        var oauth = OAuth({
            consumer: {},
            nonce_length: 100
        });

        it("nonce length should be 100", function() {
            expect(oauth.getNonce().length).to.equal(100);
        });
    });

    describe("random length", function() {
        var random = parseInt(Math.random()*100, 10);

        while(random === 0) {
            random = parseInt(Math.random()*100, 10);
        }

        var oauth = new OAuth({
            consumer: {},
            nonce_length: random
        });

        it("nonce length should be correct", function() {
            expect(oauth.getNonce().length).to.equal(random);
        });
    });
});