'use strict';
describe('basic mark with diacritics', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/diacritics.html');

    $ctx = $('.basic-diacritics');
    // including a term with a "s" and a whitespace to check "merge blanks"
    // behavior in combination with diacritics
    new Mark($ctx[0]).mark(['dolor', 'amet', 'justo', 'lores ipsum'], {
      'separateWordSearch': false,
      'done': function() {
        done();
      }
    });
  });

  it('should treat normal and diacritic characters equally', function() {
    expect($ctx.find('mark')).toHaveLength(15);
  });
});
