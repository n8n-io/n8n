'use strict';
describe(
  'basic mark with ignorePunctuation and separateWordSearch', function() {
    function getPunctuation() {
      return ':;.,-–—‒_(){}[]!\'"+='
        .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
        .split('');
    }
    var $ctx1, $ctx2, $container,
      punctuation = getPunctuation(),
      regexp = new RegExp('[' + punctuation.join('') + ']', 'g');
    beforeEach(function(done) {
      loadFixtures('basic/ignore-punctuation-separate-word-search.html');

      $container = $('.basic-ignore-punctuation-separate-word-search');
      $ctx1 = $container.children('div:nth-child(1)');
      $ctx2 = $container.children('div:nth-child(2)');
      new Mark($ctx1[0]).mark('Lorem ipsum', {
        'separateWordSearch': true,
        'diacritics': false,
        'ignorePunctuation': punctuation,
        'done': function() {
          new Mark($ctx2[0]).mark(['amet ipsum'], {
            'separateWordSearch': true,
            'diacritics': false,
            'ignorePunctuation': punctuation,
            'done': done
          });
        }
      });
    });

    it('should find separate matches', function() {
      expect($ctx1.find('mark')).toHaveLength(11);
      var count = 0,
        regex = /^(lorem|ipsum)$/i;
      $ctx1.find('mark').each(function() {
        if (regex.test($(this).text().replace(regexp, ''))) {
          count++;
        }
      });
      expect(count).toBe(11);
      expect($ctx2.find('mark')).toHaveLength(8);
      count = 0;
      regex = /^(ipsum|amet)$/i;
      $ctx2.find('mark').each(function() {
        if (regex.test($(this).text().replace(regexp, ''))) {
          count++;
        }
      });
      expect(count).toBe(8);
    });
  }
);
