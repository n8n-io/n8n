'use strict';
describe('basic mark with separateWordSearch and blanks', function() {
  var $ctx1, $ctx2, $ctx3;
  beforeEach(function(done) {
    loadFixtures('basic/separate-word-search-blank.html');

    $ctx1 = $('.basic-separate-blank > div:nth-child(1)');
    $ctx2 = $('.basic-separate-blank > div:nth-child(2)');
    $ctx3 = $('.basic-separate-blank > div:nth-child(3)');
    new Mark($ctx1[0]).mark('lorem ', {
      'diacritics': false,
      'separateWordSearch': true,
      'done': function() {
        new Mark($ctx2[0]).mark(' lorem ', {
          'diacritics': false,
          'separateWordSearch': true,
          'done': function() {
            new Mark($ctx3[0]).mark([''], {
              'diacritics': false,
              'separateWordSearch': true,
              'done': function() {
                done();
              }
            });
          }
        });
      }
    });
  });

  it('should wrap matches, ignore blanks and call done', function() {
    expect($ctx1.find('mark')).toHaveLength(4);
    expect($ctx2.find('mark')).toHaveLength(4);
    expect($ctx3.find('mark')).toHaveLength(0);
  });
});
