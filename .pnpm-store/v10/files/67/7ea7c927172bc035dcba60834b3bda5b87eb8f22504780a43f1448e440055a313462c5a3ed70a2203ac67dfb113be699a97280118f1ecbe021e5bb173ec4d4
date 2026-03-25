'use strict';
describe(
  'basic mark in already marked element',
  function() {
    var $ctx, instance;
    beforeEach(function(done) {
      loadFixtures('basic/nested-mark.html');

      $ctx = $('.basic-nested-mark');
      instance = new Mark($ctx[0]);
      instance.mark('lorem test ipsum', {
        'diacritics': false,
        'separateWordSearch': false,
        'className': 'root',
        'done': function() {
          instance.mark('test', {
            'diacritics': false,
            'separateWordSearch': false,
            'className': 'nested',
            'done': done
          });
        }
      });
    });

    it('should wrap matches even in already marked elements', function() {
      expect($ctx.find('mark')).toHaveLength(5);
      expect($ctx.find('mark.root')).toHaveLength(2);
      expect($ctx.find('mark.nested')).toHaveLength(3);
      expect($ctx.find('mark.root')).toContainElement('mark.nested');
      expect($ctx.find('mark.root')).toContainText('lorem test ipsum');
      expect($ctx.find('mark.nested')).toContainText('test');
    });
    it('should unwrap nested mark elements correctly', function(done) {
      instance.unmark({
        'className': 'root',
        'done': function() {
          expect($ctx.find('mark.root')).not.toExist();
          expect($ctx.find('mark.nested')).toHaveLength(3);
          expect($ctx.find('mark.nested')).toContainText('test');
          instance.unmark({
            'className': 'nested',
            'done': function() {
              expect($ctx.find('mark.nested')).not.toExist();
              done();
            }
          });
        }
      });
    });
  }
);
