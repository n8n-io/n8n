'use strict';
describe('mark with regular expression and noMatch callback', function() {
  var $ctx, notFound, notFoundCalled;
  beforeEach(function(done) {
    loadFixtures('regexp/main.html');

    $ctx = $('.regexp > div:first-child');
    notFound = null;
    notFoundCalled = 0;
    new Mark($ctx[0]).markRegExp(/test/gmi, {
      'noMatch': function(regexp) {
        notFoundCalled++;
        notFound = regexp;
      },
      'done': function() {
        done();
      }
    });
  });

  it('should call noMatch with the regular expression', function() {
    expect(notFoundCalled).toBe(1);
    expect(notFound instanceof RegExp).toBe(true);
  });
});
