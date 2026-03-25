'use strict';
describe('basic mark ignore empty synonyms', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/synonyms-not-empty.html');
    $ctx = $('.synonyms-not-empty > div');
    new Mark($ctx[0]).mark('lorem', {
      'synonyms': {
        'lorem': ''
      },
      'separateWordSearch': false,
      'diacritics': false,
      'done': done
    });
  });

  it('should ignore empty synonyms', function() {
    expect($ctx.find('mark')).toHaveLength(4);
  });
});
