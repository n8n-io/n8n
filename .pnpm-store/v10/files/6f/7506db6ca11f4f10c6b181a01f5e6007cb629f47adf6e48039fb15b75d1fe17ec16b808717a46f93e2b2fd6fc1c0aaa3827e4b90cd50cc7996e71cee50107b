var expect = require('chai').expect;
var OAuth = require('../../oauth-1.0a');
var crypto = require('crypto');

function hash_function_SHA1(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
}

describe("Realm", function() {
    describe("HMAC-SHA1 signature method with multiple values", function() {
        var oauth = new OAuth({
            consumer: {
                key: "batch-dbc2cd8c-6ca8-463b-96e2-6d8683eac6fd",
                secret: "4S4Rvm25CJZWv7HBg5HOhhlRTBSZ7npl"
            },
            // realm: "hi@ddo.me",
            realm: "https://ddo.me/",
            signature_method: 'HMAC-SHA1',
            hash_function: hash_function_SHA1
        });

        //overide for testing only !!!
        oauth.getTimeStamp = function() {
            return 1445951836;
        };

        //overide for testing only !!!
        oauth.getNonce = function(length) {
            return 'tKOQtKan8PHIrIoOlrl17zHkZQ2H5CsP';
        };


        var request_data = {
          url: "http://localhost:3737/rest/profiles/1ea2a42f-e14d-4057-8bcd-3e0b4514a267/properties?alt=json",
          method: "PUT",
          data: {
            currentbrowserversion: [ '1', '5', 'dfadfadfa' ],
            alt: 'json'
          }
        };

        var result = oauth.authorize(request_data);
        var result_header = oauth.toHeader(result);

        it("Header with realm should match", function() {
            expect(result_header).to.eql({
                Authorization: 'OAuth realm="https://ddo.me/", oauth_consumer_key="batch-dbc2cd8c-6ca8-463b-96e2-6d8683eac6fd", oauth_nonce="tKOQtKan8PHIrIoOlrl17zHkZQ2H5CsP", oauth_signature="ri0lfv4udd2uQmkg5cCPVqLruyk%3D", oauth_signature_method="HMAC-SHA1", oauth_timestamp="1445951836", oauth_version="1.0"'
            });
        });
    });
});