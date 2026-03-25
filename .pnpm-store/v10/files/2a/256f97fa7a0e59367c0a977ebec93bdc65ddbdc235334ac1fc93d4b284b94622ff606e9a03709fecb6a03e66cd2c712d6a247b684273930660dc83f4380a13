'use strict';
describe('mark with regular expression and done callback', function() {
  var $ctx, doneCalled, totalMatches;
  beforeEach(function(done) {
    loadFixtures('regexp/main.html');

    totalMatches = doneCalled = 0;
    $ctx = $('.regexp > div:first-child');
    new Mark($ctx[0]).markRegExp(/lorem/gmi, {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function(counter) {
        doneCalled++;
        totalMatches = counter;
        done();
      }
    });
  });

  it('should call the done callback once only', function(done) {
    setTimeout(function() {
      expect(doneCalled).toBe(1);
      done();
    }, 3000);
  });
  it('should call the done callback with total matches', function() {
    expect(totalMatches).toBe(4);
  });
});
