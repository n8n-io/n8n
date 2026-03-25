'use strict';
describe('basic mark', function() {
  var $ctx, ret;
  beforeEach(function(done) {
    loadFixtures('basic/main.html');

    $ctx = $('.basic');
    ret = new Mark($ctx[0]).mark('lorem ipsum', {
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
  it('should return an object with further methods', function() {
    expect(ret instanceof Mark).toBe(true);
    expect(typeof ret.mark).toBe('function');
    expect(typeof ret.unmark).toBe('function');
    expect(typeof ret.markRegExp).toBe('function');
  });
});
