'use strict';
describe('mark with regular expression and ignoreGroups', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('regexp/ignore-groups.html');

    $ctx1 = $('.regexp-ignore-groups > div:first-child');
    $ctx2 = $('.regexp-ignore-groups > div:last-child');
    new Mark($ctx1[0]).markRegExp(/(Lor)([^]?m[\s]*)(ipsum)/gmi, {
      'done': function() {
        new Mark($ctx2[0]).markRegExp(/(Lor)([^]?m[\s]*)(ipsum)/gmi, {
          'ignoreGroups': 2,
          'done': done
        });
      }
    });
  });

  it('should silently ignore groups when disabled', function() {
    expect($ctx1.find('mark')).toHaveLength(4);
    $ctx1.find('mark').each(function() {
      expect($(this).text()).toBe('Lorem ipsum');
    });
  });
  it('should ignore specified groups when enabled', function() {
    expect($ctx2.find('mark')).toHaveLength(4);
    $ctx2.find('mark').each(function() {
      expect($(this).text()).toBe('ipsum');
    });
  });
});
