'use strict';
describe('basic mark with escaped wildcards', function() {
  var $ctx1, $ctx2, $ctx3;
  beforeEach(function(done) {
    loadFixtures('basic/wildcards-escaped.html');

    $ctx1 = $('.basic-wildcards > div:nth-child(1)');
    $ctx2 = $('.basic-wildcards > div:nth-child(2)');
    $ctx3 = $('.basic-wildcards > div:nth-child(3)');
    new Mark($ctx1[0]).mark('lor\\?m', {
      'separateWordSearch': false,
      'diacritics': false,
      'wildcards': 'enabled',
      'done': function() {
        new Mark($ctx2[0]).mark('lor\\*m', {
          'separateWordSearch': false,
          'diacritics': false,
          'wildcards': 'enabled',
          'done': function() {
            new Mark($ctx3[0]).mark([
              'lor\\?m',
              'Lor\\*m'
            ], {
              'separateWordSearch': false,
              'diacritics': false,
              'wildcards': 'enabled',
              'done': done
            });
          }
        });
      }
    });
  });

  it('should treat escaped \'?\' normally when wildcards set', function() {
    expect($ctx1.find('mark')).toHaveLength(1);
  });
  it('should treat escaped \'*\' normally when wildcards set', function() {
    expect($ctx2.find('mark')).toHaveLength(1);
  });
  it(
    'should treat escaped \'?\' and \'*\' normally when wildcards not set',
    function() {
      expect($ctx3.find('mark')).toHaveLength(2);
    }
  );
});
