'use strict';
describe('mark in nested iframes', function() {
  var $ctx, $elements, errCall;
  beforeEach(function(done) {
    loadFixtures('iframes/nested.html');

    $elements = $();
    $ctx = $('.iframes-nested');
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

  it('should wrap matches inside iframes recursively', function() {
    expect(errCall).toBe(0);
    expect($elements).toHaveLength(12);
  });
});
