'use strict';
describe('basic mark with synonyms and diacritics', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/synonyms-diacritics.html');

    $ctx1 = $('.basic-synonyms-diacritics > div:nth-child(1)');
    $ctx2 = $('.basic-synonyms-diacritics > div:nth-child(2)');
    new Mark($ctx1[0]).mark(['dolor', 'amet'], {
      'separateWordSearch': false,
      'synonyms': {
        'dolor': 'justo'
      },
      'done': function() {
        new Mark($ctx2[0]).mark('Lorem', {
          'separateWordSearch': false,
          'synonyms': {
            'Lorem': 'amet'
          },
          'done': done
        });
      }
    });
  });

  it('should find synonyms with diacritics', function() {
    expect($ctx1.find('mark')).toHaveLength(14);
    expect($ctx2.find('mark')).toHaveLength(8);
  });
});
