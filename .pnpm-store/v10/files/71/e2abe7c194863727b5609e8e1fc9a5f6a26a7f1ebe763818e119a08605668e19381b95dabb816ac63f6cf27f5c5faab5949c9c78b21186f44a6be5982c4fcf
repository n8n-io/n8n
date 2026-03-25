'use strict';
describe('mark with acrossElements and nested iframes', function() {
  var $ctx, $elements, errCall;
  beforeEach(function(done) {
    loadFixtures('across-elements/iframes/nested.html');

    $elements = $();
    $ctx = $('.across-elements-iframes-nested');
    errCall = 0;
    try {
      new Mark($ctx[0]).mark('lorem', {
        'diacritics': false,
        'separateWordSearch': false,
        'iframes': true,
        'acrossElements': true,
        'each': function($m) {
          $elements = $elements.add($($m));
        },
        'done': done
      });
    } catch (e) {
      errCall++;
    }
  }, 30000); // 30 sec timeout

  it('should wrap matches inside iframes recursively', function() {
    expect(errCall).toBe(0);
    expect($elements).toHaveLength(12);
  });
});
