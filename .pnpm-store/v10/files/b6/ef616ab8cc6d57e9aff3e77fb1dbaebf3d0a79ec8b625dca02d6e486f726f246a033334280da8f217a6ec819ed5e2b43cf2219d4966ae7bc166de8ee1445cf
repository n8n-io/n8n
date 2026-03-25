'use strict';
describe('basic mark with ignorePunctuation and ignoreJoiners', function() {
  function getPunctuation() {
    return ':;.,-–—‒_(){}[]!\'"+='
      .replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')
      .split('');
  }
  var $ctx1, $ctx2, $container,
    punctuation = getPunctuation(),
    regexp = new RegExp(
      '[\u00ad\u200b\u200c\u200d' + punctuation.join('') + ']',
      'g'
    );

  beforeEach(function(done) {
    loadFixtures('basic/ignore-punctuation-ignore-joiners.html');
    $container = $('.basic-ignore-punctuation-ignore-joiners');
    $ctx1 = $container.children('div:nth-child(1)');
    $ctx2 = $container.children('div:nth-child(2)');
    new Mark($ctx1[0]).mark('Lorem ipsum', {
      'separateWordSearch': false,
      'diacritics': false,
      'ignoreJoiners': true,
      'ignorePunctuation': punctuation,
      'done': function() {
        new Mark($ctx2[0]).mark(['ipsum'], {
          'separateWordSearch': false,
          'diacritics': false,
          'ignoreJoiners': true,
          'ignorePunctuation': punctuation,
          'done': done
        });
      }
    });
  });

  it('should find matches containing spaces and ignore joiners', function() {
    expect($ctx1.find('mark')).toHaveLength(6);
    var count = 0,
      regex = /lorem\s+ipsum/i;
    $ctx1.find('mark').each(function() {
      if (regex.test($(this).text().replace(regexp, ''))) {
        count++;
      }
    });
    expect(count).toBe(6);
  });
  it('should find matches containing ignore joiners', function() {
    expect($ctx2.find('mark')).toHaveLength(6);
    var count = 0;
    $ctx2.find('mark').each(function() {
      if ($(this).text().replace(regexp, '') === 'ipsum') {
        count++;
      }
    });
    expect(count).toBe(6);
  });
});
