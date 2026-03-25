'use strict';
describe('basic mark with debug callback', function() {
  var $ctx, debugCalled;
  beforeEach(function(done) {
    loadFixtures('basic/main.html');

    debugCalled = 0;
    $ctx = $('.basic');
    new Mark($ctx[0]).mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'debug': true,
      'log': {
        'debug': function() {
          debugCalled++;
        },
        'warn': function() {
          debugCalled++;
        }
      },
      'done': function() {
        done();
      }
    });
  });

  it('should call the log function when debug is enabled', function() {
    expect(debugCalled).toBeGreaterThan(0);
  });
});
