'use strict';
describe('basic mark with accuracy partially', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/accuracy-partially.html');

    $ctx = $('.basic-accuracy-partially');
    new Mark($ctx[0]).mark('lorem', {
      'accuracy': 'partially',
      'separateWordSearch': false,
      'done': done
    });
  });

  it('should wrap the right matches', function() {
    expect($ctx.find('mark')).toHaveLength(4);
    $ctx.find('mark').each(function() {
      expect($(this).text()).toBe('Lorem');
    });
  });
});
