describe('text-hex', function () {
  'use strict';

  var assume = require('assume')
    , hex = require('./');

  it('is a 6 digit hex', function () {
    assume(hex('a')).to.have.length(7); // including a #
    assume(hex('a244fdafadfa4 adfau8fa a u adf8a0')).to.have.length(7);
  });
});
