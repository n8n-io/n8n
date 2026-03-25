'use strict';
describe(
  'basic mark with ignorePunctuation and synonyms with diacritics',
  function() {
    function getPunctuation() {
      return ':;.,-–—‒_(){}[]!\'"+='
        .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
        .split('');
    }
    var $ctx,
      punctuation = getPunctuation();
    beforeEach(function(done) {
      loadFixtures('basic/ignore-punctuation-synonyms-diacritics.html');

      $ctx = $('.basic-ignore-punctuation-synonyms-diacritics');
      new Mark($ctx[0]).mark(['Dołor', 'Sed', 'Lorèm ipsum'], {
        'separateWordSearch': false,
        'diacritics': true,
        'ignorePunctuation': punctuation,
        'synonyms': {
          'Sed': 'justø',
          'Dołor': 'ãmet'
        },
        'done': done
      });
    });

    it('should find synonyms with diacritics', function() {
      expect($ctx.find('mark')).toHaveLength(33);
    });
  }
);
