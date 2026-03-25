const assume = require('assume');
const tripleBeam = require('./');

describe('triple-beam', function () {
  describe('LEVEL constant', function () {
    it('is exposed', function () {
      assume(tripleBeam.LEVEL);
    });

    it('is a Symbol', function () {
      assume(tripleBeam.LEVEL).is.a('symbol');
    });

    it('is not mutable', function () {
      //
      // Assert that the symbol does not change
      // even though the operation does not throw.
      //
      const OVERWRITE = Symbol('overwrite');
      const LEVEL = tripleBeam.LEVEL;

      assume(LEVEL).not.equals(OVERWRITE);
      tripleBeam.LEVEL = OVERWRITE;
      assume(tripleBeam.LEVEL).equals(LEVEL);
    });
  });

  describe('MESSAGE constant', function () {
    it('is exposed', function () {
      assume(tripleBeam.MESSAGE);
    });

    it('is a Symbol', function () {
      assume(tripleBeam.MESSAGE).is.a('symbol');
    });

    it('is not mutable', function () {
      //
      // Assert that the symbol does not change
      // even though the operation does not throw.
      //
      const OVERWRITE = Symbol('overwrite');
      const MESSAGE = tripleBeam.MESSAGE;

      assume(MESSAGE).not.equals(OVERWRITE);
      tripleBeam.MESSAGE = OVERWRITE;
      assume(tripleBeam.MESSAGE).equals(MESSAGE);
    });
  });

  describe('SPLAT constant', function () {
    it('is exposed', function () {
      assume(tripleBeam.SPLAT);
    });

    it('is a Symbol', function () {
      assume(tripleBeam.SPLAT).is.a('symbol');
    });

    it('is not mutable', function () {
      //
      // Assert that the symbol does not change
      // even though the operation does not throw.
      //
      const OVERWRITE = Symbol('overwrite');
      const SPLAT = tripleBeam.SPLAT;

      assume(SPLAT).not.equals(OVERWRITE);
      tripleBeam.SPLAT = OVERWRITE;
      assume(tripleBeam.SPLAT).equals(SPLAT);
    });
  });

  describe('configs constant', function () {
    it('is exposed', function () {
      assume(tripleBeam.configs);
    });

    it('is a Symbol', function () {
      assume(tripleBeam.configs).is.an('Object');
    });

    it('is not mutable', function () {
      //
      // Assert that the object does not change
      // even though the operation does not throw.
      //
      const overwrite = {
        overwrite: 'overwrite'
      };
      const configs = tripleBeam.configs;

      assume(configs).not.equals(overwrite);
      tripleBeam.configs = overwrite;
      assume(tripleBeam.configs).equals(configs);
    });
  });
});
