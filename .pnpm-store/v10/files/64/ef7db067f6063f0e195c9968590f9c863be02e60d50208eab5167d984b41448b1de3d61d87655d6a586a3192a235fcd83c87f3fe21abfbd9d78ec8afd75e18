'use strict';
describe('mark ranges ignoring overlapping values', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('ranges/overlap.html');

    $ctx = $('.ranges-overlap');
    new Mark($ctx[0]).markRanges([
      { start: 0, length: 30 },
      { start: 25, length: 1 },
      { start: 40, length: 10 },
      { start: 45, length: 1 }
    ], {
      'each': function(node, range) {
        $(node).attr('data-range-start', range.start);
      },
      'done': done
    });
  });

  it('should ignore overlapping ranges', function() {
    // length = 3 because whitespace before the <p> is wrapped
    expect($ctx.find('mark')).toHaveLength(3);
    expect($ctx.find('mark[data-range-start=25]')).toHaveLength(0);
    expect($ctx.find('mark[data-range-start=45]')).toHaveLength(0);
  });
});
