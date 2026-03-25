var expect = require('chai').expect;
var OAuth = require('../oauth-1.0a');
var crypto = require('crypto');

describe("#getParameterString", function() {
    var oauth = new OAuth({
        consumer: {},
    });

    var request = {
        url: 'https://api.twitter.com/1/statuses/update.json?&',
    };

    var oauth_data = {};

    describe("#getParameterStringEmptyGetParam", function() {
        it("should be equal to Twitter example", function() {
            expect(oauth.getParameterString(request, oauth_data)).to.equal('=');
        });
    });
});