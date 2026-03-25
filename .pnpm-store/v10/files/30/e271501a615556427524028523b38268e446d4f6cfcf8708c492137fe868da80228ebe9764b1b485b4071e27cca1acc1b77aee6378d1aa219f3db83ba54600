'use strict';
describe('basic mark with caseSenstive and diacritics', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/case-sensitive-diacritics.html');

    $ctx = $('.basic-case-sensitive-diacritics');
    new Mark($ctx.get()).mark(['Dolor', 'Amet', 'Aliquam', 'Lorem ipsum'], {
      'separateWordSearch': false,
      'caseSensitive': true,
      'done': done
    });
  });

  it('should find case sensitive matches with diacritics', function() {
    expect($ctx.find('mark')).toHaveLength(8);
  });
});
