var expect = require('chai').expect;
var OAuth = require('../../oauth-1.0a');

describe("Signature method", function() {
    describe("default PLAINTEXT signature method", function() {
        var oauth = new OAuth({
            consumer: {}
        });

        it("hash should be return key only", function() {
            expect(oauth.signature_method).to.equal('PLAINTEXT');
        });
    });

    describe("default PLAINTEXT hash function", function() {
        var oauth = new OAuth({
            consumer: {},
            signature_method: 'PLAINTEXT'
        });

        it("hash should be return key only", function() {
            expect(oauth.hash_function('base_string', 'key')).to.equal('key');
        });
    });

    describe("missing hash function", function() {
        it("constructor should throw a error", function() {
            expect(function() {
                OAuth({
                    consumer: {},
                    signature_method: 'RSA-SHA1',
                });
            }).to.throw('hash_function option is required');
        });
    });
});