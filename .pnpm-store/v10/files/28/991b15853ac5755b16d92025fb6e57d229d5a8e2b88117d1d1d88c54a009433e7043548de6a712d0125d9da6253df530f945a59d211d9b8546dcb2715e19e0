'use strict';
describe('basic mark with caseSenstive', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/case-sensitive.html');

    $ctx1 = $('.basic-case-sensitive > div:nth-child(1)');
    $ctx2 = $('.basic-case-sensitive > div:nth-child(2)');
    new Mark($ctx1.get()).mark('At', {
      'caseSensitive': true,
      'done': function() {
        new Mark($ctx2[0]).mark(['lorem'], {
          'diacritics': true,
          'separateWordSearch': false,
          'caseSensitive': false,
          'synonyms' : {
            'lorem': 'Lorem'
          },
          'done': done
        });
      }
    });
  });

  it('should find case sensitive matches', function() {
    expect($ctx1.find('mark')).toHaveLength(2);
    expect($ctx2.find('mark')).toHaveLength(4);
  });
});
