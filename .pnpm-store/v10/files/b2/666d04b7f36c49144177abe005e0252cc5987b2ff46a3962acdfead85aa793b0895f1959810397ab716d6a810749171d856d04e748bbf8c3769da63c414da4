'use strict';
describe('mark with acrossElements and nested matches', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('across-elements/nested/main.html');

    $ctx = $('.across-elements-nested');
    new Mark($ctx[0]).mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'acrossElements': true,
      'done': done
    });
  });

  it('should wrap matches', function() {
    expect($ctx.find('mark')).toHaveLength(7);
  });
});
