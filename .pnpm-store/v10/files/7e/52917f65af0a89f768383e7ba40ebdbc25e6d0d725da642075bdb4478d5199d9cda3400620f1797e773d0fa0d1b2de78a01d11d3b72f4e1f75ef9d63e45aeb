'use strict';
describe('basic mark with ignorePunctuation and accuracy', function() {
  function getPunctuation() {
    return ':;.,-–—‒_(){}[]!\'"+='
      .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
      .split('');
  }
  var $ctx1, $ctx2,
    punctuation = getPunctuation(),
    regexp = new RegExp('[' + punctuation.join('') + ']', 'g');
  beforeEach(function(done) {
    loadFixtures('basic/ignore-punctuation-accuracy.html');

    $ctx1 = $('.basic-ignore-punctuation-accuracy > div:nth-child(1)');
    $ctx2 = $('.basic-ignore-punctuation-accuracy > div:nth-child(2)');
    new Mark($ctx1[0]).mark('rem ips', {
      'separateWordSearch': false,
      'diacritics': false,
      'accuracy': {
        'value': 'complementary',
        // remove certain limiters for the given HTML
        'limiters': '!#$%&*+,-./:;<=>?@^_`{|}~¡¿'.split('')
      },
      'ignorePunctuation': punctuation,
      'done': function() {
        new Mark($ctx2[0]).mark(['ipsum'], {
          'separateWordSearch': false,
          'diacritics': false,
          'accuracy': 'exact',
          'ignorePunctuation': punctuation,
          'done': done
        });
      }
    });
  });

  it(
    'should find matches with spaces and complementary accuracy',
    function() {
      expect($ctx1.find('mark')).toHaveLength(5);
      var count = 0,
        regex = /lorem\s+ipsum/i;
      $ctx1.find('mark').each(function() {
        if (regex.test($(this).text().replace(regexp, ''))) {
          count++;
        }
      });
      expect(count).toBe(5);
    }
  );
  it('should find matches with exact accuracy', function() {
    expect($ctx2.find('mark')).toHaveLength(5);
    var count = 0;
    $ctx2.find('mark').each(function() {
      if ($(this).text().replace(regexp, '') === 'ipsum') {
        count++;
      }
    });
    expect(count).toBe(5);
  });
});
