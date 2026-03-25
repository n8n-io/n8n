'use strict';
describe('mark with regular expression called with jquery', function() {
  var $ctx1, $ctx2, errorThrown, ret;
  beforeEach(function(done) {
    loadFixtures('regexp/main.html');

    $ctx1 = $('.regexp > div:first-child');
    $ctx2 = $('.regexp > div:last-child');
    errorThrown = false;
    ret = $ctx1.markRegExp(/Lor[^]?m/gmi, {
      'done': function() {
        try {
          $ctx2.markRegExp(/(Lor)([^]?m)/gmi, {
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
  it('should silently ignore groups in regular expression', function() {
    expect($ctx2.find('mark')).toHaveLength(4);
    expect(errorThrown).toBe(false);
  });
  it('should return the provided context jquery element', function() {
    expect(ret instanceof $).toBe(true);
    expect(ret).toBeMatchedBy('.regexp > div:first-child');
  });
});
