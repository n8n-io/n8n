'use strict';
describe('basic mark with duplicated keywords', function() {
  var $ctx1, $ctx2, ctx1Called, ctx2Called;
  beforeEach(function(done) {
    loadFixtures('basic/duplicate-keywords.html');

    $ctx1 = $('.basic-duplicate-keywords > div:first-child');
    $ctx2 = $('.basic-duplicate-keywords > div:last-child');
    ctx1Called = ctx2Called = 0;
    new Mark($ctx1[0]).mark(['test', 'test'], {
      'diacritics': false,
      'separateWordSearch': false,
      'filter': function(){
        ctx1Called++;
        // return false. Otherwise matches would become wrapped and no
        // further matches would be found. Therefore no further filter
        // calls would be done
        return false;
      },
      'done': function() {
        new Mark($ctx2[0]).mark('lorem test ipsum', {
          'separateWordSearch': true,
          'filter': function(){
            ctx2Called++;
            // return false. Otherwise matches would become wrapped
            // and no further matches would be found. Therefore no
            // further filter calls would be done
            return false;
          },
          'done': function(){
            done();
          }
        });
      }
    });
  });

  it('should ignore duplicated array keywords', function() {
    // it should be called only once, as there's only one unique keyword
    expect(ctx1Called).toBe(1);
  });
  it('should ignore duplicated keywords with separateWordSearch', function(){
    expect(ctx2Called).toBe(9);
  });
});
