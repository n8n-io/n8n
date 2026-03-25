'use strict';
describe('basic mark with ignorePunctuation and synonyms', function() {
  function getPunctuation() {
    return ':;.,-–—‒_(){}[]!\'"+='
      .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
      .split('');
  }
  var $ctx1, $ctx2,
    punctuation = getPunctuation();
  beforeEach(function(done) {
    loadFixtures('basic/ignore-punctuation-synonyms.html');

    $ctx1 = $('.basic-ignore-punctuation-synonyms > div:nth-child(1)');
    $ctx2 = $('.basic-ignore-punctuation-synonyms > div:nth-child(2)');
    new Mark($ctx1[0]).mark('Lorem', {
      'separateWordSearch': false,
      'diacritics': false,
      'ignorePunctuation': punctuation,
      'synonyms': {
        'Lorem': 'ipsum'
      },
      'done': function() {
        new Mark($ctx2[0]).mark(['one', 'dos', 'lüfte'], {
          'separateWordSearch': false,
          'diacritics': false,
          'ignorePunctuation': punctuation,
          'synonyms': {
            'ü': 'ue',
            'one': 'uno',
            'two': 'dos'
          },
          'done': done
        });
      }
    });
  });

  it('should wrap synonyms', function() {
    expect($ctx1.find('mark')).toHaveLength(8);
    expect($ctx2.find('mark')).toHaveLength(9);
  });
});
