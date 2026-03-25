describe('enabled', function () {
  'use strict';

  var assume = require('assume')
    , enabled = require('./');

  it('supports wildcards', function () {
    var variable = 'b*';

    assume(enabled('bigpipe', variable)).to.be.true();
    assume(enabled('bro-fist', variable)).to.be.true();
    assume(enabled('ro-fist', variable)).to.be.false();
  });

  it('is disabled by default', function () {
    assume(enabled('bigpipe', '')).to.be.false();
    assume(enabled('bigpipe', 'bigpipe')).to.be.true();
  });

  it('can ignore loggers using a -', function () {
    var variable = 'bigpipe,-primus,sack,-other';

    assume(enabled('bigpipe', variable)).to.be.true();
    assume(enabled('sack', variable)).to.be.true();
    assume(enabled('primus', variable)).to.be.false();
    assume(enabled('other', variable)).to.be.false();
    assume(enabled('unknown', variable)).to.be.false();
  });

  it('supports multiple ranges', function () {
    var variable = 'bigpipe*,primus*';

    assume(enabled('bigpipe:', variable)).to.be.true();
    assume(enabled('bigpipes', variable)).to.be.true();
    assume(enabled('primus:', variable)).to.be.true();
    assume(enabled('primush', variable)).to.be.true();
    assume(enabled('unknown', variable)).to.be.false();
  });
});
