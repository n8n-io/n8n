'use strict';
describe('basic mark with exclude', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/exclude.html');

    $ctx = $('.basic-exclude');
    new Mark($ctx[0]).mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'exclude': [
        '*[data-ignore]',
        '.ignore'
      ],
      'done': function() {
        done();
      }
    });
  });

  it('should exclude matches that are inside exclude selectors', function() {
    expect($ctx.find('mark')).toHaveLength(4);
  });
});
