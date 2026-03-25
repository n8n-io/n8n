'use strict';
describe('unmark with elements inside marked elements', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/manipulated-mark.html');

    $ctx = $('.basic-manipulated-mark');
    var instance = new Mark($ctx[0]);
    instance.mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        $('<span />', {
          'html': 'test',
          'id': 'manipulatedMark'
        }).appendTo($ctx.find('mark').first());
        instance.unmark({
          'done': function() {
            done();
          }
        });
      }
    });
  });

  it('should not delete subsequently added elements', function() {
    expect($ctx).toContainElement('#manipulatedMark');
  });
});
