'use strict';
describe('mark with iframes DOM order', function() {
  var $ctx, elements;
  beforeEach(function(done) {
    loadFixtures('iframes/order.html');

    $ctx = $('.iframes-order');
    elements = [];
    new Mark($ctx[0]).mark('lorem', {
      'diacritics': false,
      'separateWordSearch': false,
      'iframes': true,
      'each': function(node) {
        elements.push(node);
      },
      'done': done
    });
  });

  it('should wrap elements in the DOM order', function() {
    expect(elements.length).toBe(6);
    elements.forEach(function(node, i){
      var thisDoc = $(node).prop('ownerDocument'),
        ownerDoc = $ctx.prop('ownerDocument'),
        equalDocs = thisDoc === ownerDoc;
      if ((i + 1) === 1 || (i + 1) === 6){ // first and last element
        expect(equalDocs).toBe(true);
      } else { // other elements should be in an iframe
        expect(equalDocs).toBe(false);
      }
    });
  });
});
