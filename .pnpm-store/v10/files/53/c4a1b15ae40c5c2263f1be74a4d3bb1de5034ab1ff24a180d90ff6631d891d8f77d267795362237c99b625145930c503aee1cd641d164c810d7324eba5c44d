var expect = require('chai').expect;
var OAuth = require('../../oauth-1.0a');
var crypto = require('crypto');

function hash_function_SHA1(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
}

describe("Signature method", function() {
    describe("HMAC-SHA1 signature method with multiple duplicate values in the querystring", function() {
        var oauth = new OAuth({
            consumer: {
            key: "batch-8f4fd2c6-9fa3-4368-9797-52876d723dd1",
            secret: "ZACXtYe6LQ4C5X0KbJcDkbW77GYtlaoU"
            },
            signature_method: 'HMAC-SHA1',
            hash_function: hash_function_SHA1
        });

        //overide for testing only !!!
        oauth.getTimeStamp = function() {
            return 1504882975;
        };

        //overide for testing only !!!
        oauth.getNonce = function(length) {
            return 'xsEYfvjTEiPTR3TqJbmhCpUdrDoHF6nk';
        };


        var request_data = {
          url: "http://localhost:3737/rest/profiles?property=email&value=vel.arcu%40ultriciesornareelit.ca&property=visitdate&value=abc&alt=json",
          method: "GET"
        };

        var result = oauth.authorize(request_data);

        it("Signature should match", function() {
            expect(result.oauth_signature).to.equal("b6nMehqpHnpx0VlZB9IhqFh4Jq0=");
        });

        it("Nonce should match", function() {
            expect(result.oauth_nonce).to.equal("xsEYfvjTEiPTR3TqJbmhCpUdrDoHF6nk");
        });

        it("Timestamp should match", function() {
            expect(result.oauth_timestamp).to.equal(1504882975);
        });
    });
});