'use strict';
describe('unmark with iframes', function() {
  var $ctx, $elements, errCall;
  beforeEach(function(done) {
    loadFixtures('iframes/main.html');

    $ctx = $('.iframes');
    $elements = $();
    errCall = 0;
    try {
      var instance = new Mark($ctx[0]);
      instance.mark('lorem', {
        'diacritics': false,
        'separateWordSearch': false,
        'iframes': true,
        'each': function($el) {
          $elements = $elements.add($($el));
        },
        'done': function() {
          instance.unmark({
            'iframes': true,
            'done': done
          });
        }
      });
    } catch (e) {
      errCall++;
    }
  });

  it('should remove all marked elements inside iframes', function() {
    expect(errCall).toBe(0);
    $elements.each(function() {
      expect(this).not.toBeInDOM();
    });
  });
});
