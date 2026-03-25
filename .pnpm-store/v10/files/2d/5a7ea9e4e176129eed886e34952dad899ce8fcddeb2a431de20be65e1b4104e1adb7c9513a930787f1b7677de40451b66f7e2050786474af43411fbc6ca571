'use strict';
describe('basic mark with wildcards', function() {
  var $ctx1, $ctx2, $ctx3, $ctx4;
  beforeEach(function(done) {
    loadFixtures('basic/wildcards.html');

    $ctx1 = $('.basic-wildcards > div:nth-child(1)');
    $ctx2 = $('.basic-wildcards > div:nth-child(2)');
    $ctx3 = $('.basic-wildcards > div:nth-child(3)');
    $ctx4 = $('.basic-wildcards > div:nth-child(4)');
    new Mark($ctx1[0]).mark('lor?m', {
      'separateWordSearch': false,
      'diacritics': false,
      'wildcards': 'enabled',
      'done': function() {
        new Mark($ctx2[0]).mark('lor*m', {
          'separateWordSearch': false,
          'diacritics': false,
          'wildcards': 'enabled',
          'done': function() {
            new Mark($ctx3[0]).mark(['lor?m', 'Lor*m'], {
              'separateWordSearch': false,
              'diacritics': false,
              'wildcards': 'enabled',
              'done': function() {
                new Mark($ctx4[0]).mark(['lor?m', 'Lor*m'], {
                  'separateWordSearch': false,
                  'diacritics': false,
                  'wildcards': 'disabled',
                  'done': done
                });
              }
            });
          }
        });
      }
    });
  });

  it('should find \'?\' wildcard matches', function() {
    expect($ctx1.find('mark')).toHaveLength(6);
  });
  it('should find \'*\' wildcard matches', function() {
    expect($ctx2.find('mark')).toHaveLength(8);
  });
  it('should find both \'?\' and \'*\' matches', function() {
    expect($ctx3.find('mark')).toHaveLength(14);
  });
  it('should find wildcards as plain characters when disabled', function() {
    expect($ctx4.find('mark')).toHaveLength(2);
  });
});
