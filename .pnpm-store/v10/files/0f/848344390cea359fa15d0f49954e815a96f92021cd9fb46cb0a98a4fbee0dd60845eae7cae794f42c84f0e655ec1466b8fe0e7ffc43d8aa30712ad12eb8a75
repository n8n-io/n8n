'use strict';
describe('basic mark with HTML entities', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/entities.html');

    $ctx1 = $('.basic-entities > div:first-child');
    $ctx2 = $('.basic-entities > div:last-child');
    new Mark($ctx1[0]).mark('Lorem © ipsum', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        new Mark($ctx2[0]).mark('justo √ duo', {
          'diacritics': false,
          'separateWordSearch': false,
          'done': function() {
            done();
          }
        });
      }
    });
  });

  it('should wrap matches', function() {
    expect($ctx1.find('mark')).toHaveLength(1);
    expect($ctx2.find('mark')).toHaveLength(1);
  });
});
