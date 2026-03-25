'use strict';
describe('mark with acrossElements and multiple blanks', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('across-elements/basic/merge-blanks.html');

    $ctx1 = $('.across-elements-merge-blanks > div:nth-child(1)');
    $ctx2 = $('.across-elements-merge-blanks > div:nth-child(2)');
    new Mark($ctx1.get()).mark('lorem  ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'acrossElements': true,
      'done': function() {
        new Mark($ctx2.get()).mark('lorem ipsum', {
          'diacritics': false,
          'separateWordSearch': false,
          'acrossElements': true,
          'done': done
        });
      }
    });
  });

  it('should wrap matches regardless of the number of blanks', function() {
    expect($ctx1.find('mark')).toHaveLength(5);
    expect($ctx2.find('mark')).toHaveLength(5);
  });
});
