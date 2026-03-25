'use strict';
describe('nested mark', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('nested/main.html');

    $ctx = $('.nested');
    new Mark($ctx[0]).mark('lorem', {
      'diacritics': false,
      'separateWordSearch': false,
      'className': 'mark',
      'done': done
    });
  });

  it('should wrap matches', function() {
    expect($ctx.find('mark.mark')).toHaveLength(7);
  });
  it('should also wrap matches in nested mark elements', function() {
    expect($ctx.find('.nested-mark > mark.mark')).toHaveLength(1);
  });
});
