'use strict';
describe('basic mark called with an array of contexts', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/context-array.html');

    $ctx = $('.basic-context-array');
    new Mark($ctx.get()).mark('lorem', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': done
    });
  });

  it('should wrap matches', function() {
    expect($ctx.find('mark')).toHaveLength(8);
  });
});
