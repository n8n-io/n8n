'use strict';
describe('basic mark with multiple blanks', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/merge-blanks.html');

    $ctx1 = $('.basic-merge-blanks > div:nth-child(1)');
    $ctx2 = $('.basic-merge-blanks > div:nth-child(2)');
    new Mark($ctx1.get()).mark('lorem  ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        new Mark($ctx2.get()).mark('lorem ipsum', {
          'diacritics': false,
          'separateWordSearch': false,
          'done': done
        });
      }
    });
  });

  it('should wrap matches regardless of the number of blanks', function() {
    expect($ctx1.find('mark')).toHaveLength(4);
    expect($ctx2.find('mark')).toHaveLength(4);
  });
});
