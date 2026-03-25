'use strict';
describe('basic mark with duplicated contexts', function() {
  var $ctx1, $ctx2, ctx1Called, ctx2Called;
  beforeEach(function(done) {
    loadFixtures('basic/duplicate-context.html');

    $ctx1 = $('.basic-duplicate-context > div:first-child');
    $ctx2 = $('.basic-duplicate-context > div:last-child');
    ctx1Called = ctx2Called = 0;
    new Mark([$ctx1[0], $ctx1[0]]).mark('test', {
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
        new Mark([$ctx2[0], $ctx2.find('span')[0]]).mark('test', {
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

  it('should ignore duplicated passed contexts', function() {
    // it should be called only once, as there's only one text node
    expect(ctx1Called).toBe(1);
  });
  it('should ignore contexts inside other contexts', function(){
    // it should be called only twice, as there are two text nodes
    expect(ctx2Called).toBe(2);
  });
});
