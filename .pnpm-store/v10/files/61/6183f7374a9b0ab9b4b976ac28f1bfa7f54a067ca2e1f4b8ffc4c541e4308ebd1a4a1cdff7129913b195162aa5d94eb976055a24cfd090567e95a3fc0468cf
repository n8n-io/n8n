'use strict';
describe('basic mark with noMatch callback', function() {
  var $ctx, notFound;
  beforeEach(function(done) {
    loadFixtures('basic/main.html');

    notFound = [];
    $ctx = $('.basic');
    new Mark($ctx[0]).mark('test', {
      'diacritics': false,
      'separateWordSearch': false,
      'noMatch': function(term) {
        notFound.push(term);
      },
      'done': function() {
        done();
      }
    });
  });

  it('should call the noMatch callback for not found terms', function() {
    expect(notFound).toEqual(['test']);
  });
});
