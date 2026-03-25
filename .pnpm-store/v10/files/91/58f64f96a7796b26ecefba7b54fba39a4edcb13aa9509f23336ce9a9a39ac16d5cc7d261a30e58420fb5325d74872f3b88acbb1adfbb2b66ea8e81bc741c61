'use strict';
describe(
  'mark with acrossElements, regular expression and ignoreGroups',
  function() {
    var $ctx1, $ctx2, prefix = 'across-elements-regexp';
    beforeEach(function(done) {
      loadFixtures('across-elements/regexp/ignore-groups.html');

      $ctx1 = $('.' + prefix + '-ignore-groups > div:first-child');
      $ctx2 = $('.' + prefix + '-ignore-groups > div:last-child');
      new Mark($ctx1[0]).markRegExp(/(Lor)([^]?m[\s]*)(ipsum)/gmi, {
        'acrossElements': true,
        'done': function() {
          new Mark($ctx2[0]).markRegExp(
            /(Lor)([^]?m[\s]*)(ipsum)/gmi, {
              'acrossElements': true,
              'ignoreGroups': 2,
              'done': done
            }
          );
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
  }
);
