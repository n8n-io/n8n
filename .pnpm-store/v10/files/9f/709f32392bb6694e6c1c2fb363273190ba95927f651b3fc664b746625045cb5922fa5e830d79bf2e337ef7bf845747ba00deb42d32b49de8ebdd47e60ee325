'use strict';
describe('basic unmark with exclude', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/unmark-exclude.html');

    $ctx = $('.basic-unmark-exclude');
    new Mark($ctx[0]).mark('lorem ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        new Mark($ctx[0]).unmark({
          'exclude': [
            '*[data-ignore] *',
            '.ignore *'
          ],
          'done': function(){
            done();
          }
        });
      }
    });
  });

  it('should not unmark inside exclude selectors', function() {
    expect($ctx.find('mark')).toHaveLength(2);
  });
});
