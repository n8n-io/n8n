'use strict';
describe('basic unmark with custom element and class', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/custom-element-class.html');

    $ctx = $('.basic-custom-element-class > div:first-child');
    var instance = new Mark($ctx[0]);
    instance.mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'element': 'i',
      'className': 'custom',
      'done': function() {
        instance.unmark({
          'element': 'i',
          'className': 'custom',
          'done': done
        });
      }
    });
  });

  it('should remove all marked elements', function() {
    expect($ctx).not.toContainElement('i.custom');
  });
});
