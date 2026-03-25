'use strict';
describe('basic mark with accuracy complementary', function() {
  var $ctx1, $ctx2;
  beforeEach(function(done) {
    loadFixtures('basic/accuracy-complementary.html');

    $ctx1 = $('.basic-accuracy-complementary > div:first-child');
    $ctx2 = $('.basic-accuracy-complementary > div:last-child');
    new Mark($ctx1[0]).mark(['lorem', 'ipsumx'], {
      'accuracy': 'complementary',
      'separateWordSearch': false,
      'done': function() {
        new Mark($ctx2[0]).mark(['lorem', 'ipsumtest'], {
          'accuracy': 'complementary',
          'separateWordSearch': true,
          'done': done
        });
      }
    });
  });

  it('should wrap the correct matches', function() {
    expect($ctx1.find('mark')).toHaveLength(4);
    var textOpts = ['testLoremtest', 'ipsumx', 'ipsumx-test', 'öipsumxö'];
    $ctx1.find('mark').each(function() {
      expect($.inArray($(this).text(), textOpts)).toBeGreaterThan(-1);
    });
  });
  it('should work with separateWordSearch', function() {
    expect($ctx2.find('mark')).toHaveLength(2);
    var textOpts = ['testLorem', 'ipsumtest'];
    $ctx2.find('mark').each(function() {
      expect($.inArray($(this).text(), textOpts)).toBeGreaterThan(-1);
    });
  });
});
