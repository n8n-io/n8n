'use strict';
describe('mark with regular expression with infinite results', function() {
  var $ctx1, $ctx2, errorThrown1, errorThrown2;
  beforeEach(function(done) {
    loadFixtures('regexp/infinite.html');

    $ctx1 = $('.regexp-infinite > div:first-child');
    $ctx2 = $('.regexp-infinite > div:last-child');
    errorThrown1 = errorThrown2 = false;
    try {
      new Mark($ctx1[0]).markRegExp(/(|)/gmi, {
        'done': function() {
          try {
            new Mark($ctx2[0]).markRegExp(/\b/gmi, {
              'done': done
            });
          } catch (e) {
            errorThrown2 = true;
            done();
          }
        }
      });
    } catch (e) {
      errorThrown1 = true;
      done();
    }
  });

  it(
    'should not mark regular expressions with infinite matches',
    function() {
      expect(errorThrown1).toBe(false);
      expect(errorThrown2).toBe(false);
      expect($ctx1.find('mark')).toHaveLength(0);
      expect($ctx2.find('mark')).toHaveLength(0);
    }
  );
});
