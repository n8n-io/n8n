'use strict';
describe(
  'basic mark in a context with script-tags and style-tags',
  function() {
    var $ctx;
    beforeEach(function(done) {
      loadFixtures('basic/script-style.html');

      $ctx = $('.basic-script-style');
      new Mark($ctx[0]).mark('lorem', {
        'diacritics': false,
        'separateWordSearch': false,
        'done': done
      });
    });

    it('should wrap matches', function() {
      expect($ctx.find('mark')).toHaveLength(4);
    });
    it('should not wrap anything inside these tags', function() {
      expect($ctx.find('style, script')).not.toContainElement('mark');
    });
  }
);
