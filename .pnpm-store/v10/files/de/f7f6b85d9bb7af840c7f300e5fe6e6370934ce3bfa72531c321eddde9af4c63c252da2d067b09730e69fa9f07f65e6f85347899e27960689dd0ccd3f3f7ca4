'use strict';
describe('basic mark in an empty context', function() {
  var $ctx1, $ctx2, done1 = false,
    done2 = false;
  beforeEach(function(done) {
    loadFixtures('basic/empty.html');

    $ctx1 = $('.notExistingSelector');
    $ctx2 = $('.basic-empty');
    new Mark($ctx1[0]).mark('lorem', {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        done1 = true;
        new Mark($ctx2[0]).mark('lorem', {
          'diacritics': false,
          'separateWordSearch': false,
          'done': function() {
            done2 = true;
            done();
          }
        });
      }
    });
  });

  it('should call the done function', function() {
    expect(done1).toBe(true);
    expect(done2).toBe(true);
  });
});
