'use strict';
describe('mark with acrossElements and accuracy exactly', function() {
  var $ctx1, $ctx2, $ctx3;
  beforeEach(function(done) {
    loadFixtures('across-elements/basic/accuracy-exactly.html');

    $ctx1 = $('.across-elements-accuracy-exactly > div:nth-child(1)');
    $ctx2 = $('.across-elements-accuracy-exactly > div:nth-child(2)');
    $ctx3 = $('.across-elements-accuracy-exactly > div:nth-child(3)');
    new Mark($ctx1[0]).mark('ipsu', {
      'accuracy': 'exactly',
      'separateWordSearch': false,
      'acrossElements': true,
      'done': function() {
        new Mark($ctx2[0]).mark('ipsu dolo', {
          'accuracy': 'exactly',
          'separateWordSearch': true,
          'acrossElements': true,
          'done': function() {
            new Mark($ctx3[0]).mark('ipsu', {
              'accuracy': 'exactly',
              'separateWordSearch': false,
              'acrossElements': true,
              'done': done
            });
          }
        });
      }
    });
  });

  it('should wrap the right matches', function() {
    expect($ctx1.find('mark')).toHaveLength(1);
    expect($ctx1.find('mark').text()).toBe('ipsu');
    expect($ctx1.find('.not mark')).toHaveLength(0);
  });
  it('should work with separateWordSearch', function() {
    expect($ctx2.find('mark')).toHaveLength(2);
    var textOpts = ['ipsu', 'dolo'];
    $ctx2.find('mark').each(function() {
      expect($.inArray($(this).text(), textOpts)).toBeGreaterThan(-1);
    });
    expect($ctx2.find('.not mark')).toHaveLength(0);
  });
  it('should work with diacritics', function() {
    expect($ctx3.find('mark')).toHaveLength(4);
    var textOpts = ['ipsu', 'ipsü', 'īpsu', 'īpsü'];
    $ctx3.find('mark').each(function() {
      expect($.inArray($(this).text(), textOpts)).toBeGreaterThan(-1);
    });
    expect($ctx3.find('.not mark')).toHaveLength(0);
  });
});
