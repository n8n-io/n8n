'use strict';
describe('basic mark with wildcards and synonyms', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/wildcards-ignore-joiners-synonyms.html');

    $ctx1 = $('.basic-wildcards-ignore-joiners-synonyms div:first');
    $ctx2 = $('.basic-wildcards-ignore-joiners-synonyms div:last');
    new Mark($ctx1[0]).mark('Lor?m', {
      'synonyms': {
        'Lor?m': 'Ips?m'
      },
      'separateWordSearch': false,
      'diacritics': true,
      'ignoreJoiners': true,
      'wildcards': 'enabled',
      'done': function() {
        new Mark($ctx2[0]).mark('Lor*m', {
          'synonyms': {
            'Lor*m': 'Ips*m'
          },
          'separateWordSearch': false,
          'diacritics': true,
          'ignoreJoiners': true,
          'wildcards': 'enabled',
          'done': done
        });
      }
    });
  });

  it('should match wildcards and joiners inside of synonyms', function() {
    expect($ctx1.find('mark')).toHaveLength(10);
    expect($ctx2.find('mark')).toHaveLength(17);
  });
});
