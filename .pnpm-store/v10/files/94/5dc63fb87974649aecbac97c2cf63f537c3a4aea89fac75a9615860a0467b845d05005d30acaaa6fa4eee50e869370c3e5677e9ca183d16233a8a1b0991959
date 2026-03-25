'use strict';
describe('basic mark with ignorePunctuation', function() {
  function getPunctuation() {
    return ':;.,-–—‒_(){}[]!\'"+='
      .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
      .split('');
  }
  var $ctx1, $ctx2, $ctx3,
    punctuation = getPunctuation(),
    regexp = new RegExp('[' + punctuation.join('') + ']', 'g');
  beforeEach(function(done) {
    loadFixtures('basic/ignore-punctuation.html');

    $ctx1 = $('.basic-ignore-punctuation > div:nth-child(1)');
    $ctx2 = $('.basic-ignore-punctuation > div:nth-child(2)');
    $ctx3 = $('.basic-ignore-punctuation > div:nth-child(3)');
    new Mark($ctx1[0]).mark('ipsum', {
      'separateWordSearch': false,
      'diacritics': false,
      'ignorePunctuation': punctuation,
      'done': function() {
        new Mark($ctx2[0]).mark(['Lorem ipsum'], {
          'separateWordSearch': false,
          'diacritics': false,
          'ignorePunctuation': punctuation,
          'done': function() {
            new Mark($ctx3[0]).mark(['ipsum'], {
              'separateWordSearch': false,
              'diacritics': false,
              'ignorePunctuation': '',
              'done': done
            });
          }
        });
      }
    });
  });

  it('should find single word matches', function() {
    expect($ctx1.find('mark')).toHaveLength(5);
    var count = 0;
    $ctx1.find('mark').each(function() {
      if ($(this).text().replace(regexp, '') === 'ipsum') {
        count++;
      }
    });
    expect(count).toBe(5);
  });
  it('should find matches containing whitespace', function() {
    expect($ctx2.find('mark')).toHaveLength(5);
    var count = 0,
      regex = /lorem\s+ipsum/i;
    $ctx2.find('mark').each(function() {
      if (regex.test($(this).text().replace(regexp, ''))) {
        count++;
      }
    });
    expect(count).toBe(5);
  });
  it('should not find matches when disabled', function() {
    expect($ctx3.find('mark')).toHaveLength(1);
  });

});
