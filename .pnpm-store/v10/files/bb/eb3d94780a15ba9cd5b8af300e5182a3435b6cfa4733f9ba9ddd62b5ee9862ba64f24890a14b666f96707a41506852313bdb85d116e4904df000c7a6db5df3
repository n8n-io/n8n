'use strict';
describe('basic mark with synonyms and noMatch', function() {
  var $ctx, notFound;
  beforeEach(function(done) {
    loadFixtures('basic/synonyms-no-match.html');

    $ctx = $('.basic-synonyms-no-match > p');
    notFound = [];
    new Mark($ctx[0]).mark('test', {
      'synonyms': {
        'test': 'ipsum'
      },
      'separateWordSearch': false,
      'diacritics': false,
      'noMatch': function(term) {
        notFound.push(term);
      },
      'done': function() {
        done();
      }
    });
  });

  it('should not call noMatch if there are synonym matches', function() {
    expect(notFound).toEqual([]);
  });
});
