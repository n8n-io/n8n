'use strict';
describe('mark with range filter callback', function() {
  var $ctx, filterCalled, nodeCounter, termCount, rangeCount, ranges, results,
    // will target the first unique term
    terms = ['ipsum', 'amet', 'elitr', 'tempor', 'nonumy'],
    // term to filter out
    skip = 'elitr';

    // in case the fixture whitespace is altered
  function getRange($el, string) {
    var start = $el.text().indexOf(string),
      length = string.length;
    return start > -1 ? { 'start': start, 'length': length } : null;
  }

  beforeEach(function(done) {
    loadFixtures('ranges/filter.html');

    filterCalled = 0;
    nodeCounter = 0;
    termCount = 0;
    rangeCount = 0;
    $ctx = $('.ranges-filter');
    ranges = [];
    results = {};

    terms.forEach(function(item, index) {
      var range = getRange($ctx, item);
      if (range) {
        results[item] = {
          'name': item,
          'start': range.start,
          'length': range.length,
          'index': index
        };
        range.index = index;
        // make sure the entire range object is being passed
        range.foo = 'bar' + index;
        ranges.push(range);
      }
    });

    new Mark($ctx[0]).markRanges(ranges, {
      'filter': function(node, range, match, counter) {
        filterCalled++;
        if (node.nodeType === 3) {
          nodeCounter++;
        }
        var item = results[match];
        // check indexes; this won't always equal the counter
        // because the values within "terms" may not be in order
        if (
          item &&
                    item.index === range.index &&
                    // make sure we're getting a counter value
                    (counter === filterCalled - 1)
        ) {
          termCount++;
          if (
            item.start === range.start &&
                        item.length === range.length &&
                        // check extra data
                        range.foo === 'bar' + item.index
          ) {
            rangeCount++;
          }
        }
        return match !== skip;
      },
      'done': done
    });
  });

  it('should call the filter callback for each range element', function() {
    var length = terms.length;
    expect(filterCalled).toBe(length);
    expect(nodeCounter).toBe(length);
    expect(termCount).toBe(length);
    expect(rangeCount).toBe(length);
    expect($ctx.find('mark')).toHaveLength(length - 1);
    expect($ctx.find('mark:contains(' + skip + ')')).toHaveLength(0);
  });
});
