'use strict';
describe('mark with range each callback', function() {
  var $ctx, $elements, ranges;
  beforeEach(function(done) {
    loadFixtures('ranges/each.html');

    $elements = $();
    $ctx = $('.ranges-each');
    ranges = [];
    new Mark($ctx[0]).markRanges([
      { start: 20, length: 5 },
      { start: 64, length: 5 }
    ], {
      'each': function(node, range) {
        $elements = $elements.add($(node));
        ranges.push(range);
      },
      'done': done
    });
  });

  it('should call the each callback for each range element', function() {
    expect($elements).toHaveLength(2);
  });
  it('should pass the correct parameters', function() {
    var textOpts = ['ipsum', 'elitr'];
    $elements.each(function() {
      expect($.inArray($(this).text(), textOpts)).toBeGreaterThan(-1);
    });
    expect(ranges).toEqual([
      { start: 20, length: 5 },
      { start: 64, length: 5 }
    ]);
  });
});
