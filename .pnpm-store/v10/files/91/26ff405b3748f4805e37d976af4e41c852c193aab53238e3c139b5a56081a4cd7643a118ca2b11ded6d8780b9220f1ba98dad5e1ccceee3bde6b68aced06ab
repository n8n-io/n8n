require('should');

describe('indefinite', () => {
  const indefinite = require('../lib/indefinite');

  context('a word that starts with a vowel', () => {
    it('should be prefixed with an', () => {
      indefinite('apple').should.equal('an apple');
    });
  });

  context('a word that starts with a consonant', () => {
    it('should be prefixed with a', () => {
      indefinite('banana').should.equal('a banana');
    });
  });

  context('a word that starts with a capital vowel', () => {
    it('should be maintain capitalization', () => {
      indefinite('Apple').should.equal('an Apple');
    });
  });

  context('a word that starts with a capital consonant', () => {
    it('should maintain capitalization', () => {
      indefinite('Banana').should.equal('a Banana');
    });
  });

  context('a word that starts with a capital that would be a irregular if it were an acronym', () => {
    it('should be prefixed with the regular article', () => {
      indefinite('Umbrella').should.equal('an Umbrella');
    });
  });

  context('a word that starts with a vowel when capitalize is passed in', () => {
    it('should capitalize the article', () => {
      indefinite('apple', { capitalize: true }).should.equal('An apple');
    });
  });

  context('a word that starts with a consonant when capitalize is passed in', () => {
    it('should capitalize the article', () => {
      indefinite('banana', { capitalize: true }).should.equal('A banana');
    });
  });

  context('an acronym that starts with a regular vowel', () => {
    it('should be prefixed with an', () => {
      indefinite('IOU').should.equal('an IOU');
    });
  });

  context('an acronym that starts with an irregular vowel', () => {
    it('should be prefixed with a', () => {
      indefinite('UFO').should.equal('a UFO');
    });
  });

  context('an acronym that starts with a consonant', () => {
    it('should still be prefixed with a', () => {
      indefinite('CEO').should.equal('a CEO');
    });
  });

  context('an acronym that starts with an irregular consonant', () => {
    it('should be prefixed with an', () => {
      indefinite('FFA prodigy').should.equal('an FFA prodigy');
    });
  });

  context('an acronym that starts with U but with caseInsensitive passed in', () => {
    it('should be prefixed with an', () => {
      indefinite('UNCLE', { caseInsensitive: true }).should.equal('an UNCLE');
    });
  });

  context('an irregular word beginning with a silent consonant', () => {
    it('should be prefixed with an', () => {
      indefinite('honor').should.equal('an honor');
    });
  });

  context('an irregular word beginning with eu that makes a y- sound', () => {
    it('should be prefixed with a', () => {
      indefinite('euro').should.equal('a euro');
    });
  });

  context('an irregular word beginning with a vowel that makes a consonant sound', () => {
    it('should be prefixed with a', () => {
      indefinite('ukelele').should.equal('a ukelele');
    });
  });

  context('an irregular word when multiple words are passed in', () => {
    it('should be prefixed based on the first word only', () => {
      indefinite('ouija board').should.equal('a ouija board');
    });
  });

  context('an irregular word that is hyphenated is passed in', () => {
    it('should be prefixed based on the first part of the word only', () => {
      indefinite('honor-bound').should.equal('an honor-bound');
    });
  });

  context('a plural form of an irregular word is passed in', () => {
    it('should be prefixed based on the singular form', () => {
      indefinite('hours').should.equal('an hours');
    });
  });

  context('an irregular plural form of an irregular word is passed in', () => {
    it('should be prefixed based on the singular form', () => {
      indefinite('heiresses').should.equal('an heiresses');
    });
  });

  context('a past tense verb form of an irregular word is passed in', () => {
    it('should be prefixed based on the present tense', () => {
      indefinite('honored').should.equal('an honored');
    });
  });

  context('a possessive form of an irregular word is passed in', () => {
    it('should be prefixed based on the non-possessive form', () => {
      indefinite('heir\'s').should.equal('an heir\'s');
    });
  });

  context('a regular word that happens to have an ending we strip (s, es, ed)', () => {
    it('should ignore the ending', () => {
      indefinite('red rum').should.equal('a red rum');
    });
  });

  context('an irregular word with some capitalization is passed', () => {
    it('should be treated case-insensitively', () => {
      indefinite('Hour').should.equal('an Hour');
    });
  });

  context('articleOnly', () => {
    context('a word that starts with a vowel', () => {
      it('should return the article only', () => {
        indefinite('apple', { articleOnly: true }).should.equal('an');
      });
    });  

    context('a word that starts with a consonant', () => {
      it('should return the article only', () => {
        indefinite('pear', { articleOnly: true }).should.equal('a');
      });
    });  

    context('a word that starts with a vowel when capitalize is passed in', () => {
      it('should capitalize the article', () => {
        indefinite('apple', { articleOnly: true, capitalize: true }).should.equal('An');
      });
    });  

    context('a word that starts with a consonant when capitalize is passed in', () => {
      it('should capitalize the article', () => {
        indefinite('pear', { articleOnly: true, capitalize: true }).should.equal('A');
      });
    });  
  });

  context('Numbers', () => {
    context('starting with 11', () => {
      it('should be prefixed with an', () => {
        indefinite('11').should.equal('an 11');
        indefinite('110').should.equal('a 110');
        indefinite('11000').should.equal('an 11000');
        indefinite('110000').should.equal('a 110000');
        indefinite('1100000').should.equal('a 1100000');
        indefinite('11000000').should.equal('an 11000000');
        indefinite('110000000').should.equal('a 110000000');
        indefinite('1100000000').should.equal('a 1100000000');
        indefinite('11000000000').should.equal('an 11000000000');
        indefinite('110000000000').should.equal('a 110000000000');
        indefinite('1100000000000').should.equal('a 1100000000000');
        indefinite('11000000000000').should.equal('an 11000000000000');
        indefinite('110000000000000').should.equal('a 110000000000000');
        indefinite('1100000000000000').should.equal('a 1100000000000000');
        indefinite('11000000000000000').should.equal('an 11000000000000000');
      });
    });

    context('starting with 18', () => {
      it('should be prefixed with an', () => {
        indefinite('18').should.equal('an 18');
        indefinite('180').should.equal('a 180');
        indefinite('18000').should.equal('an 18000');
        indefinite('180000').should.equal('a 180000');
        indefinite('1800000').should.equal('a 1800000');
        indefinite('18000000').should.equal('an 18000000');
        indefinite('180000000').should.equal('a 180000000');
        indefinite('1800000000').should.equal('a 1800000000');
        indefinite('18000000000').should.equal('an 18000000000');
        indefinite('180000000000').should.equal('a 180000000000');
        indefinite('1800000000000').should.equal('a 1800000000000');
        indefinite('18000000000000').should.equal('an 18000000000000');
        indefinite('180000000000000').should.equal('a 180000000000000');
        indefinite('1800000000000000').should.equal('a 1800000000000000');
        indefinite('18000000000000000').should.equal('an 18000000000000000');
      });
    });

    context('starting with 8', () => {
      it('should be prefixed with an', () => {
        indefinite('8').should.equal('an 8');
        indefinite('80').should.equal('an 80');
        indefinite('800').should.equal('an 800');
        indefinite('8000').should.equal('an 8000');
        indefinite('80000').should.equal('an 80000');
        indefinite('800000').should.equal('an 800000');
        indefinite('8000000').should.equal('an 8000000');
        indefinite('80000000').should.equal('an 80000000');
        indefinite('800000000').should.equal('an 800000000');
      });
    });

    context('1100 and 1800 range', () => {
      context('with formal pronunciation', () => {
        it('should be prefixed with a', () => {
          indefinite('1100').should.equal('a 1100');
          indefinite('1800').should.equal('a 1800');
        });
      });

      context('with colloquial pronunciation', () => {
        it('should be prefixed with an', () => {
          indefinite('1100', { numbers: 'colloquial' }).should.equal('an 1100');
          indefinite('1800', { numbers: 'colloquial' }).should.equal('an 1800');
        });
      });
    });

    context('other numbers', () => {
      it('should be prefixed with a', () => {
        indefinite('17').should.equal('a 17');
      });
    });

    context('with actual numbers', () => {
      it('should be prefixed the same as with strings', () => {
        indefinite(7).should.equal('a 7');
        indefinite(8).should.equal('an 8');
      });
    });

    context('the letter u', () => {
      it('should be prefixed with a', () => {
        indefinite('u').should.equal('a u')
      });
    });

    context('the letters f, h, l, m, n, r, s, and x', () => {
      it('should be prefixed with an', () => {
        indefinite('f').should.equal('an f')
        indefinite('h').should.equal('an h')
        indefinite('l').should.equal('an l')
        indefinite('m').should.equal('an m')
        indefinite('n').should.equal('an n')
        indefinite('r').should.equal('an r')
        indefinite('s').should.equal('an s')
        indefinite('x').should.equal('an x')
      });
    });

    context('other letters', () => {
      it('should be prefixed as normal', () => {
        indefinite('a').should.equal('an a');
        indefinite('b').should.equal('a b');
      });
    });
  });
});
