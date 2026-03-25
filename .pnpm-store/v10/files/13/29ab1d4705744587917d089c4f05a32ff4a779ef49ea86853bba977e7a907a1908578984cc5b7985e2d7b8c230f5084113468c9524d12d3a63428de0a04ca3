'use strict';
describe('iframes unmark and mark with the same instance', function() {
  var $ctx, $elements;
  beforeEach(function(done) {
    loadFixtures('iframes/unmark-same-instance.html');

    $ctx = $('.iframes-unmark-same-instance');
    $elements = $();
    var instance = new Mark($ctx[0]);
    instance.unmark({
      'done': function() {
        instance.mark('lorem ipsum', {
          'diacritics': false,
          'iframes': true,
          'separateWordSearch': false,
          'each': function(node) {
            $elements = $elements.add($(node));
          },
          'done': done
        });
      }
    });
  });

  it(
    'should work when setting different options for method calls',
    function() {
      expect($elements).toHaveLength(8);
      $elements.each(function() {
        expect($(this)).toHaveText('Lorem ipsum');
      });
    }
  );
});
