'use strict';
describe('mark with iframes where onload was not fired yet', function() {
  // Note that in Chrome the onload event will already be fired. Reason
  // is that Chrome initializes every iframe with an empty page, which will
  // fire the onload event too respectively set readyState complete
  var $ctx, $elements, errCall;
  beforeEach(function(done) {
    loadFixtures('iframes/onload.html');

    $elements = $();
    $ctx = $('.iframes-onload');
    errCall = 0;
    try {
      new Mark($ctx[0]).mark('test', {
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
    expect($elements).toHaveLength(2);
    var unequal = false;
    $elements.each(function() {
      if ($(this).prop('ownerDocument') !== $ctx.prop('ownerDocument')) {
        unequal = true;
      }
    });
    expect(unequal).toBe(true);
  });
});
