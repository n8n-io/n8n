'use strict';
describe('basic mark called with jquery', function() {
  var $ctx, ret;
  beforeEach(function(done) {
    loadFixtures('basic/main.html');

    $ctx = $('.basic');
    ret = $ctx.mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        // otherwise "ret =" will not be executed
        setTimeout(function() {
          done();
        }, 50);
      }
    });
  });

  it('should wrap matches', function() {
    expect($ctx.find('mark')).toHaveLength(4);
  });
  it('should return the provided context jquery element', function() {
    expect(ret instanceof $).toBe(true);
    expect(ret).toBeMatchedBy('.basic');
  });
});
