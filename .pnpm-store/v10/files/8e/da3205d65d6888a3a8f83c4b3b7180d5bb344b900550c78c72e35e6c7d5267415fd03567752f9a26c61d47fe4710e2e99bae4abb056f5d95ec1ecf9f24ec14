var expect  = require('chai').expect;
var Request = require('request');
var OAuth   = require('../../oauth-1.0a');
var crypto = require('crypto');

describe.skip("Openbank Personal Consumer", function() {
    var oauth;

    beforeEach(function () {
        if (
            !process.env.OPENBANK_CONSUMER_PUBLIC ||
            !process.env.OPENBANK_CONSUMER_SECRET
        ) {
            this.skip('Openbank secret not set.');
            return;
        }

        this.timeout(10000);

        oauth = new OAuth({
            consumer: {
                key: process.env.OPENBANK_CONSUMER_PUBLIC,
                secret: process.env.OPENBANK_CONSUMER_SECRET
            },
            signature_method: 'HMAC-SHA256',
            hash_function: function(base_string, key) {
                return crypto.createHmac('sha256', key).update(base_string).digest('base64');
            }
        });
    });

    //need to send as header
    describe("#Request Token", function() {
        var request = {
            url:    'https://apisandbox.openbankproject.com/oauth/initiate',
            method: 'POST',
            data: {
                oauth_callback: 'http://www.ddo.me'
            }
        };

        it("should be a valid response", function(done) {
            Request({
                url:        request.url,
                method:     request.method,
                form:       request.data,
                headers:    oauth.toHeader(oauth.authorize(request))
            }, function(err, res, body) {
                expect(body).to.be.a('string');

                body = oauth.deParam(body);

                expect(body).to.have.property('oauth_callback_confirmed', 'true');
                expect(body).to.have.property('oauth_token');
                expect(body).to.have.property('oauth_token_secret');

                done();
            });
        });
    });
});