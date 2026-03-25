'use strict';
describe('unmark with click event', function() {
  var $ctx, eventCalled;
  beforeEach(function(done) {
    loadFixtures('basic/events.html');

    $ctx = $('.basic-events');
    eventCalled = 0;
    $ctx.find('.event-target').on('click', function() {
      ++eventCalled;
    });
    var instance = new Mark($ctx[0]);
    instance.mark('test', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        instance.unmark({
          'done': function() {
            $ctx.find('.event-target').click();
            done();
          }
        });
      }
    });
  });

  it('should not remove bound events', function() {
    expect(eventCalled).toBe(1);
  });

});
