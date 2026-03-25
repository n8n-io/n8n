var expect = require('chai').expect;
var OAuth = require('../../oauth-1.0a');
var crypto = require('crypto');

function hash_function_SHA1(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
}

describe("last_ampersand option", function() {
    
    describe("default (true)", function() {
        var oauth = OAuth({
            consumer: {
                secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw'
            },
            signature_method: 'HMAC-SHA1',
            hash_function: hash_function_SHA1
        });

        var token = {
            secret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'
        };

        it("should be equal to Twitter example", function() {
            expect(oauth.getSigningKey(token.secret)).to.equal('kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE');
        });

        it("should has the ampersand at the end", function() {
            expect(oauth.getSigningKey()).to.equal('kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&');
        });
    });

    describe("change to false", function() {
        var oauth = OAuth({
            consumer: {
                secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw'
            },
            signature_method: 'HMAC-SHA1',
            hash_function: hash_function_SHA1,
            last_ampersand: false
        });

        var token = {
            secret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'
        };

        it("should be equal to Twitter example", function() {
            expect(oauth.getSigningKey(token.secret)).to.equal('kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE');
        });

        it("should not has the ampersand at the end", function() {
            expect(oauth.getSigningKey()).to.equal('kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw');
        });
    });
});