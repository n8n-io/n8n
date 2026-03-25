
var sep = require('path').sep || '/';
var assert = require('assert');
var uri2path = require('../');
var tests = require('./tests.json');

describe('file-uri-to-path', function () {

  Object.keys(tests).forEach(function (uri) {

    // the test cases were generated from Windows' PathCreateFromUrlA() function.
    // On Unix, we have to replace the path separator with the Unix one instead of
    // the Windows one.
    var expected = tests[uri].replace(/\\/g, sep);

    it('should convert ' + JSON.stringify(uri) + ' to ' + JSON.stringify(expected),
    function () {
      var actual = uri2path(uri);
      assert.equal(actual, expected);
    });

  });

});
