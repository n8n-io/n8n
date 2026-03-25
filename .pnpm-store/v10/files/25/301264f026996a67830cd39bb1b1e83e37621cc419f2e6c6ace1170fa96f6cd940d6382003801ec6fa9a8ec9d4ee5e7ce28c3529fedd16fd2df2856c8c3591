'use strict';
describe('basic mark with wildcards and diacritics', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/wildcards-diacritics.html');

    $ctx1 = $('.basic-wildcards-diacritics > div:nth-child(1)');
    $ctx2 = $('.basic-wildcards-diacritics > div:nth-child(2)');
    new Mark($ctx1[0]).mark('lor?m', {
      'separateWordSearch': false,
      'diacritics': true,
      'wildcards': 'enabled',
      'done': function() {
        new Mark($ctx2[0]).mark('lör*m', {
          'separateWordSearch': false,
          'diacritics': true,
          'wildcards': 'enabled',
          'done': done
        });
      }
    });
  });

  it('should find wildcard matches containing diacritics', function() {
    expect($ctx1.find('mark')).toHaveLength(7);
    expect($ctx2.find('mark')).toHaveLength(13);
  });
});
