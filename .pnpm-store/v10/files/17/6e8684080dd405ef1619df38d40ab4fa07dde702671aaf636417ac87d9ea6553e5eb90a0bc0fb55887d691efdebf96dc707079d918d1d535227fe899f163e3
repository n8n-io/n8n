'use strict';
describe('mark with iframes', function() {
  var $ctx, $elements, errCall;
  beforeEach(function(done) {
    loadFixtures('iframes/main.html');

    $elements = $();
    $ctx = $('.iframes');
    errCall = 0;
    try {
      new Mark($ctx[0]).mark('lorem', {
        'diacritics': false,
        'separateWordSearch': false,
        'iframes': true,
        'each': function($m) {
          $elements = $elements.add($($m));
        },
        'done': done
      });
    } catch (e) {
      errCall++;
    }
  }, 30000); // 30 sec timeout

  it('should wrap matches inside iframes', function() {
    expect(errCall).toBe(0);
    expect($elements).toHaveLength(8);
    var unequal = false;
    $elements.each(function() {
      // make sure that some elements are inside an iframe
      if ($(this).prop('ownerDocument') !== $ctx.prop('ownerDocument')) {
        unequal = true;
      }
    });
    expect(unequal).toBe(true);
  });
});
