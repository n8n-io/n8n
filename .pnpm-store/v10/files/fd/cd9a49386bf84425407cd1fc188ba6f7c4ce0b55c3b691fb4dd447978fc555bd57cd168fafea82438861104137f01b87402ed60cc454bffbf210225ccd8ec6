'use strict';
describe('mark with acrossElements and filter callback', function() {
  var $ctx;
  beforeEach(function() {
    loadFixtures('across-elements/basic/filter.html');

    $ctx = $('.across-elements-filter');
  });

  it('should call the callback with the right parameters', function(done) {
    var counter = {
        'lorem': 0,
        'ipsum': 0,
        'dolor': 0
      },
      totalCounter = 0,
      calls = 0;
    try {
      new Mark($ctx[0]).mark(Object.keys(counter), {
        'diacritics': false,
        'separateWordSearch': false,
        'acrossElements': true,
        'filter': function(node, term, totalMatches, matches) {
          expect(node.nodeType).toBe(3);
          expect($.inArray(
            term,
            Object.keys(counter)
          )).toBeGreaterThan(-1);
          expect(totalCounter).toBe(totalMatches);
          expect(counter[term]).toBe(matches);
          if (++calls !== 3) {
            counter[term]++;
            totalCounter++;
            return true;
          } else {
            return false;
          }
        },
        'done': function() {
          expect($ctx.find('mark')).toHaveLength(15);
          done();
        }
      });
    } catch (e){
      done.fail(e.message);
    }
  });
});
