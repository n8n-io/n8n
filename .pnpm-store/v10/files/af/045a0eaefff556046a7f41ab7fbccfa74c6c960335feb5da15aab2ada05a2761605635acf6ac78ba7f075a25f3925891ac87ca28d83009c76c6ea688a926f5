'use strict';
describe('mark with acrossElements and done callback', function() {
  var $ctx, doneCalled, totalMatches;
  beforeEach(function(done) {
    loadFixtures('across-elements/basic/main.html');

    totalMatches = doneCalled = 0;
    $ctx = $('.across-elements');
    new Mark($ctx[0]).mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'acrossElements': true,
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
    expect(totalMatches).toBe(6);
  });
});
