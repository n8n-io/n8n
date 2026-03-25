'use strict';
describe('mark with regular expression', function() {
  var $ctx1, $ctx2, errorThrown, ret;
  beforeEach(function(done) {
    loadFixtures('regexp/main.html');

    $ctx1 = $('.regexp > div:first-child');
    $ctx2 = $('.regexp > div:last-child');
    errorThrown = false;
    ret = new Mark($ctx1[0]).markRegExp(/Lor[^]?m/gmi, {
      'done': function() {
        try {
          new Mark($ctx2[0]).markRegExp(/(Lor)([^]?m)/gmi, {
            'done': function() {
              // timeout, otherwise "ret =" will not be executed
              setTimeout(function() {
                done();
              }, 50);
            }
          });
        } catch (e) {
          errorThrown = true;
          done();
        }
      }
    });
  });

  it('should wrap matches', function() {
    expect($ctx1.find('mark')).toHaveLength(4);
  });
  it('should silently ignore groups in regular expressions', function() {
    expect($ctx2.find('mark')).toHaveLength(4);
    expect(errorThrown).toBe(false);
  });
  it('should return an object with further methods', function() {
    expect(ret instanceof Mark).toBe(true);
    expect(typeof ret.mark).toBe('function');
    expect(typeof ret.unmark).toBe('function');
    expect(typeof ret.markRegExp).toBe('function');
  });
});
