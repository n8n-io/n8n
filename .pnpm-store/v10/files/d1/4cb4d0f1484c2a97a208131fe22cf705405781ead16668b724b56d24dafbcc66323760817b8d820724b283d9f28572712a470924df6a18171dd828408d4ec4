'use strict';

/**
 * Dependencies
 */
import replace, {sync, replaceInFile, replaceInFileSync} from './replace-in-file';
const fs = require('fs');
const writeFile = Promise.promisify(fs.writeFile);
const deleteFile = Promise.promisify(fs.unlink);

/**
 * Specifications
 */
describe('Replace in file', () => {

  //Test JSON
  const testData = 'a re place c';

  /**
   * Prepare test files
   */
  beforeEach(() => Promise.all([
    writeFile('test1', testData, 'utf8'),
    writeFile('test2', testData, 'utf8'),
    writeFile('test3', 'nope', 'utf8'),
  ]));

  /**
   * Clean up test files
   */
  afterEach(() => Promise.all([
    deleteFile('test1'),
    deleteFile('test2'),
    deleteFile('test3'),
  ]));

  /**
   * Async with promises
   */
  describe('Async with promises', () => {

    it('should throw an error when no config provided', () => {
      return expect(replace()).to.eventually.be.rejectedWith(Error);
    });

    it('should throw an error when invalid config provided', () => {
      return expect(replace(42)).to.eventually.be.rejectedWith(Error);
    });

    it('should throw an error when no `files` defined', () => {
      return expect(replace({
        from: /re\splace/g,
        to: 'b',
      })).to.eventually.be.rejectedWith(Error);
    });

    it('should throw an error when no `from` defined', () => {
      return expect(replace({
        files: 'test1',
        to: 'b',
      })).to.eventually.be.rejectedWith(Error);
    });

    it('should throw an error when no `to` defined', () => {
      return expect(replace({
        files: 'test1',
        from: /re\splace/g,
      })).to.eventually.be.rejectedWith(Error);
    });

    it('should replace contents in a single file with regex', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should pass file as an arg to a "from" function', done => {
      replace({
        files: 'test1',
        from: (file) => {
          expect(file).to.equal('test1');
          return /re\splace/g;
        },
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it(`should pass the match as first arg and file as last arg to a replacer function replace contents in a single file with regex`, done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: (match, ...args) => {
          const file = args.pop();
          expect(match).to.equal('re place');
          expect(file).to.equal('test1');
          return 'b';
        },
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should replace contents with a string replacement', done => {
      replace({
        files: 'test1',
        from: 're place',
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it(`should pass the match as first arg and file as last arg to a replacer function and replace contents with a string replacement`, done => {
      replace({
        files: 'test1',
        from: 're place',
        to: (match, ...args) => {
          const file = args.pop();
          expect(match).to.equal('re place');
          expect(file).to.equal('test1');
          return 'b';
        },
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it('should replace contents in a an array of files', done => {
      replace({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs', done => {
      replace({
        files: 'test*',
        from: /re\splace/g,
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs while excluding ignored files', done => {
      replace({
        files: 'test*',
        ignore: 'test1',
        from: /re\splace/g,
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a re place c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should replace substrings', done => {
      replace({
        files: 'test1',
        from: /(re)\s(place)/g,
        to: '$2 $1',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a place re c');
        done();
      });
    });

    it('should fulfill the promise on success', () => {
      return replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }).should.be.fulfilled;
    });

    it('should reject the promise with an error on failure', () => {
      return expect(replace({
        files: 'nope',
        from: /re\splace/g,
        to: 'b',
      })).to.eventually.be.rejectedWith(Error);
    });

    it('should not reject the promise if allowEmptyPaths is true', () => {
      return replace({
        files: 'nope',
        allowEmptyPaths: true,
        from: /re\splace/g,
        to: 'b',
      }).should.be.fulfilled;
    });

    it('should return a results array', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }).then(results => {
        expect(results).to.be.instanceof(Array);
        expect(results).to.have.length(1);
        expect(results[0].file).to.equal('test1');
        done();
      });
    });

    it('should mark if something was replaced', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }).then(results => {
        expect(results[0].hasChanged).to.equal(true);
        done();
      });
    });

    it('should not mark if nothing was replaced', done => {
      replace({
        files: 'test1',
        from: 'nope',
        to: 'b',
      }).then(results => {
        expect(results[0].hasChanged).to.equal(false);
        done();
      });
    });

    it('should return correct results for multiple files', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
      }).then(results => {
        expect(results).to.have.length(3);
        expect(results[0].file).to.equal('test1');
        expect(results[0].hasChanged).to.equal(true);
        expect(results[1].file).to.equal('test2');
        expect(results[1].hasChanged).to.equal(true);
        expect(results[2].file).to.equal('test3');
        expect(results[2].hasChanged).to.equal(false);
        done();
      });
    });

    it('should make multiple replacements with the same string', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: 'b',
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b b c');
        expect(test2).to.equal('a b b c');
        done();
      });
    });

    it('should make multiple replacements with different strings', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: ['b', 'e'],
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b e c');
        expect(test2).to.equal('a b e c');
        done();
      });
    });

    it('should not replace with missing replacement values', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: ['b'],
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b place c');
        expect(test2).to.equal('a b place c');
        done();
      });
    });

    it('should not replace in a dry run', done => {
      replace({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a re place c');
        expect(test2).to.equal('a re place c');
        done();
      });
    });

    it('should return changed files for a dry run', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      }).then(results => {
        expect(results).to.have.length(3);
        expect(results[0].file).to.equal('test1');
        expect(results[0].hasChanged).to.equal(true);
        expect(results[1].file).to.equal('test2');
        expect(results[1].hasChanged).to.equal(true);
        expect(results[2].file).to.equal('test3');
        expect(results[2].hasChanged).to.equal(false);
        done();
      });
    });

    it('should accept glob configuration', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
        allowEmptyPaths: true,
        glob: {
          ignore: ['test1'],
        },
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a re place c');
        done();
      });
    });

    it('should ignore empty glob configuration', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
        glob: null,
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it('should count matches if specified in config', done => {
      replace({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'test',
        countMatches: true,
      }).then(results => {
        expect(results[0].numMatches).to.equal(2);
        done();
      });
    });

    it('should not count matches if not specified in config', done => {
      replace({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'test',
      }).then(results => {
        expect(results[0].numMatches).to.be.undefined;
        done();
      });
    });

    it('should return 0 matches if match not found', done => {
      replace({
        files: 'test1',
        from: 'nope',
        to: 'test',
        countMatches: true,
      }).then(results => {
        expect(results[0].numMatches).to.equal(0);
        done();
      });
    });
  });

  /**
   * Async with callback
   */
  describe('Async with callback', () => {

    it('should throw an error when no config provided', done => {
      replace(null, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should throw an error when invalid config provided', done => {
      replace(42, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should throw an error when no `files` defined', done => {
      replace({
        from: /re\splace/g,
        to: 'b',
      }, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should throw an error when no `from` defined', done => {
      replace({
        files: 'test1',
        to: 'b',
      }, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should throw an error when no `to` defined', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
      }, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should replace contents in a single file with regex', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should pass file as an arg to a "from" function', done => {
      replace({
        files: 'test1',
        from: (file) => {
          expect(file).to.equal('test1');
          return /re\splace/g;
        },
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it(`should pass the match as first arg and file as last arg to a replacer function replace contents in a single file with regex`, done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: (match, ...args) => {
          const file = args.pop();
          expect(match).to.equal('re place');
          expect(file).to.equal('test1');
          return 'b';
        },
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should replace contents with a string replacement', done => {
      replace({
        files: 'test1',
        from: 're place',
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it(`should pass the match as first arg and file as last arg to a replacer function and replace contents with a string replacement`, done => {
      replace({
        files: 'test1',
        from: 're place',
        to: (match, ...args) => {
          const file = args.pop();
          expect(match).to.equal('re place');
          expect(file).to.equal('test1');
          return 'b';
        },
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it('should replace contents in a an array of files', done => {
      replace({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs', done => {
      replace({
        files: 'test*',
        from: /re\splace/g,
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs while excluding ignored files', done => {
      replace({
        files: 'test*',
        ignore: 'test1',
        from: /re\splace/g,
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a re place c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should not return an error on success', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });

    it('should return an error on failure', done => {
      replace({
        files: 'nope',
        from: /re\splace/g,
        to: 'b',
      }, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should not return an error if allowEmptyPaths is true', done => {
      replace({
        files: 'nope',
        allowEmptyPaths: true,
        from: /re\splace/g,
        to: 'b',
      }, (error) => {
        expect(error).to.equal(null);
        done();
      });
    });

    it('should return a results array', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }, (error, results) => {
        expect(results).to.be.instanceof(Array);
        expect(results).to.have.length(1);
        expect(results[0].file).to.equal('test1');
        done();
      });
    });

    it('should mark if something was replaced', done => {
      replace({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }, (error, results) => {
        expect(results[0].hasChanged).to.equal(true);
        done();
      });
    });

    it('should not mark if nothing was replaced', done => {
      replace({
        files: 'test1',
        from: 'nope',
        to: 'b',
      }, (error, results) => {
        expect(results[0].hasChanged).to.equal(false);
        done();
      });
    });

    it('should return correct results for multiple files', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
      }, (error, results) => {
        expect(results).to.have.length(3);
        expect(results[0].file).to.equal('test1');
        expect(results[0].hasChanged).to.equal(true);
        expect(results[1].file).to.equal('test2');
        expect(results[1].hasChanged).to.equal(true);
        expect(results[2].file).to.equal('test3');
        expect(results[2].hasChanged).to.equal(false);
        done();
      });
    });

    it('should make multiple replacements with the same string', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: 'b',
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b b c');
        expect(test2).to.equal('a b b c');
        done();
      });
    });

    it('should make multiple replacements with different strings', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: ['b', 'e'],
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b e c');
        expect(test2).to.equal('a b e c');
        done();
      });
    });

    it('should not replace with missing replacement values', done => {
      replace({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: ['b'],
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b place c');
        expect(test2).to.equal('a b place c');
        done();
      });
    });

    it('should work without expanding globs if disabled', done => {
      replace({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        disableGlobs: true,
      }, () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should count matches if specified in config', done => {
      replace({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'test',
        countMatches: true,
      }, (error, results) => {
        expect(results[0].numMatches).to.equal(2);
        done();
      });
    });

    it('should not count matches if not specified in config', done => {
      replace({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'test',
      }, (error, results) => {
        expect(results[0].numMatches).to.be.undefined;
        done();
      });
    });

    it('should return 0 matches if match not found', done => {
      replace({
        files: 'test1',
        from: 'nope',
        to: 'test',
        countMatches: true,
      }, (error, results) => {
        expect(results[0].numMatches).to.equal(0);
        done();
      });
    });
  });

  /**
   * Sync
   */
  describe('Sync', () => {

    it('should throw an error when no config provided', () => {
      expect(function() {
        replace.sync();
      }).to.throw(Error);
    });

    it('should throw an error when invalid config provided', () => {
      expect(function() {
        replace.sync(42);
      }).to.throw(Error);
    });

    it('should throw an error when no `files` defined', () => {
      expect(function() {
        replace.sync({
          from: /re\splace/g,
          to: 'b',
        });
      }).to.throw(Error);
    });

    it('should throw an error when no `from` defined', () => {
      expect(function() {
        replace.sync({
          files: 'test1',
          to: 'b',
        });
      }).to.throw(Error);
    });

    it('should throw an error when no `to` defined', () => {
      expect(function() {
        replace.sync({
          files: 'test1',
          from: /re\splace/g,
        });
      }).to.throw(Error);
    });

    it('should support the encoding parameter', () => {
      expect(function() {
        replace.sync({
          files: 'test1',
          from: /re\splace/g,
          to: 'b',
          encoding: 'utf-8',
        });
      }).to.not.throw(Error);
    });

    it('should fall back to utf-8 encoding with invalid configuration', () => {
      expect(function() {
        replace.sync({
          files: 'test1',
          from: /re\splace/g,
          to: 'b',
          encoding: '',
        });
      }).to.not.throw(Error);
      expect(function() {
        replace.sync({
          files: 'test1',
          from: /re\splace/g,
          to: 'b',
          encoding: null,
        });
      }).to.not.throw(Error);
    });

    it('should replace contents in a single file with regex', function() {
      replace.sync({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal(testData);
    });

    it('should pass file as an arg to a "from" function', function() {
      replace.sync({
        files: 'test1',
        from: (file) => {
          expect(file).to.equal('test1');
          return /re\splace/g;
        },
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal(testData);
    });

    it(`should pass the match as first arg and file as last arg to a replacer function replace contents in a single file with regex`, function() {
      replace.sync({
        files: 'test1',
        from: /re\splace/g,
        to: (match, ...args) => {
          const file = args.pop();
          expect(match).to.equal('re place');
          expect(file).to.equal('test1');
          return 'b';
        },
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal(testData);
    });

    it('should replace contents with a string replacement', function() {
      replace.sync({
        files: 'test1',
        from: 're place',
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      expect(test1).to.equal('a b c');
    });

    it(`should pass the match as first arg and file as last arg to a replacer function and replace contents with a string replacement`, function() {
      replace.sync({
        files: 'test1',
        from: 're place',
        to: (match, ...args) => {
          const file = args.pop();
          expect(match).to.equal('re place');
          expect(file).to.equal('test1');
          return 'b';
        },
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      expect(test1).to.equal('a b c');
    });

    it('should replace contents in a an array of files', function() {
      replace.sync({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should expand globs', function() {
      replace.sync({
        files: 'test*',
        from: /re\splace/g,
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should return a results array', function() {
      const results = replace.sync({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      });
      expect(results).to.be.instanceof(Array);
      expect(results).to.have.length(1);
      expect(results[0].file).to.equal('test1');
    });

    it('should mark if something was replaced', function() {
      const results = replace.sync({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      });
      expect(results[0].hasChanged).to.equal(true);
    });

    it('should not mark if nothing was replaced', function() {
      const results = replace.sync({
        files: 'test1',
        from: 'nope',
        to: 'b',
      });
      expect(results[0].hasChanged).to.equal(false);
    });

    it('should return corret results for multiple files', function() {
      const results = replace.sync({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
      });
      expect(results).to.have.length(3);
      expect(results[0].file).to.equal('test1');
      expect(results[0].hasChanged).to.equal(true);
      expect(results[1].file).to.equal('test2');
      expect(results[1].hasChanged).to.equal(true);
      expect(results[2].file).to.equal('test3');
      expect(results[2].hasChanged).to.equal(false);
    });

    it('should make multiple replacements with the same string', () => {
      replace.sync({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b b c');
      expect(test2).to.equal('a b b c');
    });

    it('should make multiple replacements with different strings', () => {
      replace.sync({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: ['b', 'e'],
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b e c');
      expect(test2).to.equal('a b e c');
    });

    it('should not replace with missing replacement values', () => {
      replace.sync({
        files: ['test1', 'test2', 'test3'],
        from: [/re/g, /place/g],
        to: ['b'],
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b place c');
      expect(test2).to.equal('a b place c');
    });

    it('should expand globs while excluding ignored files', () => {
      replace.sync({
        files: 'test*',
        ignore: 'test1',
        from: /re\splace/g,
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a re place c');
      expect(test2).to.equal('a b c');
    });

    it('should support an array of ignored files', () => {
      replace.sync({
        files: 'test*',
        ignore: ['test1', 'test3'],
        from: /re\splace/g,
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a re place c');
      expect(test2).to.equal('a b c');
    });

    it('should not fail when the ignore parameter is undefined', () => {
      replace.sync({
        files: 'test*',
        ignore: undefined,
        from: /re\splace/g,
        to: 'b',
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should work without expanding globs if disabled', () => {
      replace.sync({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        disableGlobs: true,
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should not replace in a dry run', () => {
      replace.sync({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      });
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a re place c');
      expect(test2).to.equal('a re place c');
    });

    it('should return changed files for a dry run', () => {
      const results = replace.sync({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      });
      expect(results).to.have.length(3);
      expect(results[0].file).to.equal('test1');
      expect(results[0].hasChanged).to.equal(true);
      expect(results[1].file).to.equal('test2');
      expect(results[1].hasChanged).to.equal(true);
      expect(results[2].file).to.equal('test3');
      expect(results[2].hasChanged).to.equal(false);
    });

    it('should count matches and replacements if specified in config', () => {
      const results = replace.sync({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'test',
        countMatches: true,
      });
      expect(results[0].numMatches).to.equal(2);
      expect(results[0].numReplacements).to.equal(2);
    });

    it('should differentiate between matches and replacements', () => {
      const results = replace.sync({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 're',
        countMatches: true,
      });
      expect(results[0].numMatches).to.equal(2);
      expect(results[0].numReplacements).to.equal(1);
    });

    it('should count multiple replacements correctly', () => {
      const results = replace.sync({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'place',
        countMatches: true,
      });
      expect(results[0].numMatches).to.equal(3);
      expect(results[0].numReplacements).to.equal(1);
    });

    it(`should not count matches or replacements if not specified in config`, () => {
      const results = replace.sync({
        files: 'test1',
        from: [/re/g, /place/g],
        to: 'test',
      });
      expect(results[0].numMatches).to.be.undefined;
      expect(results[0].numReplacements).to.be.undefined;
    });

    it('should return 0 matches and replacements if match not found', () => {
      const results = replace.sync({
        files: 'test1',
        from: 'nope',
        to: 'test',
        countMatches: true,
      });
      expect(results[0].numMatches).to.equal(0);
      expect(results[0].numReplacements).to.equal(0);
    });
  });

  describe('module export', () => {
    it('default module export refers to async replace implementation', () => {
      expect(replace).to.be.a('function');
    });

    it(`exports named replaceInFile, replaceInFileSync and sync from module facade`, () => {
      expect(replaceInFile).to.be.a('function');
      expect(replaceInFileSync).to.be.a('function');
      expect(sync).to.be.a('function');
    });

    it('exposes inner functions as own fields of replace', () => {
      expect(replace.replaceInFile).to.equal(replace);
      expect(replace.sync).to.equal(replaceInFileSync);
      expect(replace.replaceInFileSync).to.equal(replaceInFileSync);
    });
  });
});
