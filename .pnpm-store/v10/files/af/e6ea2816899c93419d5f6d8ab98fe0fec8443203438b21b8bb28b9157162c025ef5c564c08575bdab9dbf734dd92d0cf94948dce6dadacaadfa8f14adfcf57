'use strict';
describe(
  'basic mark with ignoreJoiners and synonyms with diacritics',
  function() {
    var $ctx;
    beforeEach(function(done) {
      loadFixtures('basic/ignore-joiners-synonyms-diacritics.html');

      $ctx = $('.basic-ignore-joiners-synonyms-diacritics');
      new Mark($ctx[0]).mark(['Dołor', 'Sed', 'Lorèm ipsum'], {
        'separateWordSearch': false,
        'ignoreJoiners': true,
        'synonyms': {
          'Sed': 'justø',
          'Dołor': 'ãmet'
        },
        'diacritics': true,
        'done': done
      });
    });

    it('should find synonyms with diacritics', function() {
      expect($ctx.find('mark')).toHaveLength(33);
    });
  }
);
