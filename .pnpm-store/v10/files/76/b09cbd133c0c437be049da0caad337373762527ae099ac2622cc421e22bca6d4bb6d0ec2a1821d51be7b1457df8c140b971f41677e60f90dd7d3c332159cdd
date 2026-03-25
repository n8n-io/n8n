'use strict';

describe('mark with range', function() {
  var $ctx1, $ctx2, ranges, range, notFound,
    // [single word, characters spanning spaces, anything]
    terms = ['nonumy', 'nt ut labor', 'vero'];

    // in case the fixture whitespace is altered
  function getRange($el, string) {
    var start = $el.text().indexOf(string),
      length = string.length;
    return start > -1 ? {
      'start': start,
      'length': length
    } : null;
  }

  function each(node, range) {
    $(node).attr('data-range-start', range.start);
    $(node).attr('data-range-length', range.length);
  }

  beforeEach(function(done) {
    loadFixtures('ranges/main.html');

    notFound = [];
    ranges = [];
    $ctx1 = $('.ranges > div:nth-child(1)');
    $ctx2 = $('.ranges > div:nth-child(2)');

    // single word
    range = getRange($ctx1, terms[0]);
    ranges.push({
      start: range.start,
      length: range.length
    });
    // characters spanning spaces
    ranges.push(getRange($ctx1, terms[1]));
    range = getRange($ctx1, terms[2]);
    // will be parsed into integers
    ranges.push({
      start: range.start + '.674',
      length: range.length + .234
    });

    new Mark($ctx1[0]).markRanges(ranges, {
      'each': each,
      'done': function() {
        new Mark($ctx2[0]).markRanges([
          { start: 10, length: 0 },
          { start: 20, length: 0 },
          { start: 30, length: 0.6 }
        ], {
          'noMatch': function(item) {
            notFound = notFound.concat(item);
          },
          'each': each,
          'done': done
        });
      }
    });
  });

  it('should mark correct range', function() {
    var $match = $ctx1.find('mark:eq(0)'),
      range = getRange($ctx1, terms[0]);
    expect($match.text()).toBe(terms[0]);
    expect($match.attr('data-range-start')).toBe(range.start.toString());
    expect($match.attr('data-range-length')).toBe(range.length.toString());
    // extra mark around <br>
    expect($ctx1.find('mark')).toHaveLength(4);
  });
  it('should mark correct range including spaces and breaks', function() {
    var range = getRange($ctx1, terms[1]),
      $match = $ctx1.find('mark[data-range-start=\'' + range.start + '\']');
    expect($match.text()).toBe(terms[1]);
    expect($match.attr('data-range-start')).toBe(range.start.toString());
    expect($match.attr('data-range-length')).toBe(range.length.toString());
  });
  it('should mark and parse integer ranges', function() {
    var $match,
      range = getRange($ctx1, terms[2]);
    $match = $ctx1.find('mark[data-range-start=\'' + range.start + '\']');
    expect($match.text()).toBe(terms[2]);
    expect($match.attr('data-range-length')).toBe(range.length.toString());
  });
  it('should ignore ranges with length of zero', function() {
    expect(JSON.stringify(notFound)).toBe(JSON.stringify([
      { start: 10, length: 0 },
      { start: 20, length: 0 },
      { start: 30, length: 0.6 }
    ]));
  });
});
