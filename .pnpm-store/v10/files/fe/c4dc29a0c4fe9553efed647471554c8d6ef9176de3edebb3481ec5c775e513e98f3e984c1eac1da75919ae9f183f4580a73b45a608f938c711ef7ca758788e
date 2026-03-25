'use strict';
describe('basic mark with regex characters', function() {
  var $ctx;
  beforeEach(function(done) {
    loadFixtures('basic/escape.html');

    $ctx = $('.basic-escape');
    new Mark($ctx[0]).mark([
      '39,00 €', '0.009 €', 'Unk?nown', 'Some+>thing', 'www.happy.com\\'
    ], {
      'diacritics': false,
      'separateWordSearch': false,
      'done': function() {
        done();
      }
    });
  });

  it('should escape search terms and wrap matches', function() {
    expect($ctx.find('mark')).toHaveLength(5);
  });
  it('should not modify text node values', function() {
    expect($ctx.find('mark').get(0)).toContainText('39,00 €');
    expect($ctx.find('mark').get(1)).toContainText('0.009 €');
    expect($ctx.find('mark').get(2)).toContainText('Unk?nown');
    expect($ctx.find('mark').get(3)).toContainText('Some+>thing');
    expect($ctx.find('mark').get(4)).toContainText('www.happy.com\\');
  });
});
