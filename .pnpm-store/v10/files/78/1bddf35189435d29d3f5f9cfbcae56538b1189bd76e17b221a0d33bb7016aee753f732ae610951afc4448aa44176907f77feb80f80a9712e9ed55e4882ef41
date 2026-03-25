var expect = require('chai').expect;
var OAuth = require('../oauth-1.0a');
var crypto = require('crypto');

describe("Twitter Sample", function() {
    var oauth = new OAuth({
        consumer: {
            key: 'xvz1evFS4wEEPTGEFPHBog',
            secret: 'kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw'
        },
        signature_method: 'HMAC-SHA1',
        hash_function: function(base_string, key) {
            return crypto.createHmac('sha1', key).update(base_string).digest('base64');
        }
    });

    //overide for testing only !!!
    oauth.getTimeStamp = function() {
        return 1318622958;
    };

    //overide for testing only !!!
    oauth.getNonce = function(length) {
        return 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg';
    };

    var token = {
        key: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
        secret: 'LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE'
    };

    var request = {
        url: 'https://api.twitter.com/1/statuses/update.json?include_entities=true',
        method: 'POST',
        data: {
            status: 'Hello Ladies + Gentlemen, a signed OAuth request!'
        }
    };

    var oauth_data = {
        oauth_consumer_key: oauth.consumer.key,
        oauth_nonce: oauth.getNonce(),
        oauth_signature_method: oauth.signature_method,
        oauth_timestamp: oauth.getTimeStamp(),
        oauth_version: '1.0',
        oauth_token: token.key
    };

    describe("#getParameterString", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.getParameterString(request, oauth_data)).to.equal('include_entities=true&oauth_consumer_key=xvz1evFS4wEEPTGEFPHBog&oauth_nonce=kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg&oauth_signature_method=HMAC-SHA1&oauth_timestamp=1318622958&oauth_token=370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb&oauth_version=1.0&status=Hello%20Ladies%20%2B%20Gentlemen%2C%20a%20signed%20OAuth%20request%21');
        });
    });

    describe("#getBaseString", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.getBaseString(request, oauth_data)).to.equal('POST&https%3A%2F%2Fapi.twitter.com%2F1%2Fstatuses%2Fupdate.json&include_entities%3Dtrue%26oauth_consumer_key%3Dxvz1evFS4wEEPTGEFPHBog%26oauth_nonce%3DkYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg%26oauth_signature_method%3DHMAC-SHA1%26oauth_timestamp%3D1318622958%26oauth_token%3D370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb%26oauth_version%3D1.0%26status%3DHello%2520Ladies%2520%252B%2520Gentlemen%252C%2520a%2520signed%2520OAuth%2520request%2521');
        });
    });

    describe("#getSigningKey", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.getSigningKey(token.secret)).to.equal('kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw&LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE');
        });
    });
        
    describe("#getSignature", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.getSignature(request, token.secret, oauth_data)).to.equal('tnnArxj06cWHq44gCs1OSKk/jLY=');
        });
    });

    describe("#authorize", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.authorize(request, token)).to.eql({
                oauth_consumer_key: 'xvz1evFS4wEEPTGEFPHBog',
                oauth_nonce: 'kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg',
                oauth_signature_method: 'HMAC-SHA1',
                oauth_timestamp: 1318622958,
                oauth_version: '1.0',
                oauth_token: '370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb',
                status: 'Hello Ladies + Gentlemen, a signed OAuth request!',
                include_entities: 'true',
                oauth_signature: 'tnnArxj06cWHq44gCs1OSKk/jLY='
            });
        });
    });

    describe("#toHeader", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.toHeader(oauth.authorize(request, token))).to.have.property('Authorization', 'OAuth oauth_consumer_key="xvz1evFS4wEEPTGEFPHBog", oauth_nonce="kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg", oauth_signature="tnnArxj06cWHq44gCs1OSKk%2FjLY%3D", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1318622958", oauth_token="370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb", oauth_version="1.0"');
        });
    });
});