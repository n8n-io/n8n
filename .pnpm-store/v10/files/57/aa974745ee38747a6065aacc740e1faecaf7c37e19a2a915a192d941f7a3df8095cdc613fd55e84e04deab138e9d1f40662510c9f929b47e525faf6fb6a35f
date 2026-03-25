'use strict';
describe('mark with acrossElements and ignoreJoiners', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('across-elements/basic/ignore-joiners.html');

    $ctx = $('.across-elements-ignore-joiners');
    new Mark($ctx[0]).mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'acrossElements': true,
      'ignoreJoiners': true,
      'done': done
    });
  });

  it('should wrap matches and ignoreJoiners', function() {
    expect($ctx.find('mark')).toHaveLength(6);
  });
});
