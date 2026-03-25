'use strict';
describe('basic mark with wildcards between words', function() {
  var $ctx1, $ctx2, $ctx3, $ctx4;
  beforeEach(function(done) {
    loadFixtures('basic/wildcards-between-words.html');

    $ctx1 = $('.basic-wildcards-between-words > div:nth-child(1)');
    $ctx2 = $('.basic-wildcards-between-words > div:nth-child(2)');
    $ctx3 = $('.basic-wildcards-between-words > div:nth-child(3)');
    $ctx4 = $('.basic-wildcards-between-words > div:nth-child(4)');
    new Mark($ctx1[0]).mark('lorem?ipsum', {
      'separateWordSearch': false,
      'diacritics': false,
      'wildcards': 'enabled',
      'done': function() {
        new Mark($ctx2[0]).mark('lorem*ipsum', {
          'separateWordSearch': false,
          'diacritics': false,
          'wildcards': 'enabled',
          'done': function() {
            new Mark($ctx3[0]).mark('lorem?ipsum', {
              'separateWordSearch': false,
              'diacritics': false,
              'wildcards': 'withSpaces',
              'done': function() {
                new Mark($ctx4[0]).mark('lorem*ipsum', {
                  'separateWordSearch': false,
                  'diacritics': false,
                  'wildcards': 'withSpaces',
                  'done': done
                });
              }
            });
          }
        });
      }
    });
  });

  it(
    'should match wildcard with zero to one non-whitespace in the keyword',
    function() {
      expect($ctx1.find('mark')).toHaveLength(4);
    }
  );
  it(
    'should match wildcard with zero or more non-whitespace in the keyword',
    function() {
      expect($ctx2.find('mark')).toHaveLength(5);
    }
  );
  it(
    'should match wildcard with zero to one character in the keyword',
    function() {
      expect($ctx3.find('mark')).toHaveLength(6);
    }
  );
  it(
    'should match wildcard with zero or more characters in the keyword',
    function() {
      expect($ctx4.find('mark')).toHaveLength(9);
    }
  );

});
