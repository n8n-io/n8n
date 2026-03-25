'use strict';

/**
 * Dependencies
 */
import transform, {sync, processFile, processFileSync} from './process-file';
const fs = require('fs');
const writeFile = Promise.promisify(fs.writeFile);
const deleteFile = Promise.promisify(fs.unlink);

/**
 * Specifications
 */
describe('Process a file', () => {

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

  function fromToToProcessor(config) {
    const from = config.from;
    const to = config.to;
    delete config.from;
    delete config.to;

    config.processor = (content) => {
      return content.replace(from, to);
    };
    return config;
  }

  /**
   * Async with promises
   */
  describe('Async with promises', () => {

    it('should run processor', done => {
      transform({
        files: 'test1',
        processor: (input) => {
          return input.replace(/re\splace/g, 'b');
        },
      }).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        console.log(test1);
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should throw an error when no config provided', () => {
      return expect(transform()).to.eventually.be.rejectedWith(Error);
    });

    it('should throw an error when invalid config provided', () => {
      return expect(transform(42)).to.eventually.be.rejectedWith(Error);
    });

    it('should throw an error when no `files` defined', () => {
      return expect(transform(fromToToProcessor({
        from: /re\splace/g,
        to: 'b',
      }))).to.eventually.be.rejectedWith(Error);
    });

    it('should replace contents in a single file with regex', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should replace contents with a string replacement', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: 're place',
        to: 'b',
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it('should replace contents in a an array of files', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs', done => {
      transform(fromToToProcessor({
        files: 'test*',
        from: /re\splace/g,
        to: 'b',
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs while excluding ignored files', done => {
      transform(fromToToProcessor({
        files: 'test*',
        ignore: 'test1',
        from: /re\splace/g,
        to: 'b',
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a re place c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should replace substrings', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /(re)\s(place)/g,
        to: '$2 $1',
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a place re c');
        done();
      });
    });

    it('should fulfill the promise on success', () => {
      return transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      })).should.be.fulfilled;
    });

    it('should reject the promise with an error on failure', () => {
      return expect(transform(fromToToProcessor({
        files: 'nope',
        from: /re\splace/g,
        to: 'b',
      }))).to.eventually.be.rejectedWith(Error);
    });

    it('should not reject the promise if allowEmptyPaths is true', () => {
      return transform(fromToToProcessor({
        files: 'nope',
        allowEmptyPaths: true,
        from: /re\splace/g,
        to: 'b',
      })).should.be.fulfilled;
    });

    it('should return a results array', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      })).then(results => {
        expect(results).to.be.instanceof(Array);
        expect(results).to.have.length(1);
        expect(results[0].file).to.equal('test1');
        done();
      });
    });

    it('should mark if something was replaced', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      })).then(results => {
        expect(results[0].hasChanged).to.equal(true);
        done();
      });
    });

    it('should not mark if nothing was replaced', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: 'nope',
        to: 'b',
      })).then(results => {
        expect(results[0].hasChanged).to.equal(false);
        done();
      });
    });

    it('should return correct results for multiple files', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
      })).then(results => {
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

    it('should not replace in a dry run', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a re place c');
        expect(test2).to.equal('a re place c');
        done();
      });
    });

    it('should return changed files for a dry run', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      })).then(results => {
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
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
        allowEmptyPaths: true,
        glob: {
          ignore: ['test1'],
        },
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a re place c');
        done();
      });
    });

    it('should ignore empty glob configuration', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
        glob: null,
      })).then(() => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });
  });

  /**
   * Async with callback
   */
  describe('Async with callback', () => {

    it('should throw an error when no config provided', done => {
      transform(null, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should throw an error when invalid config provided', done => {
      transform(42, (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should throw an error when no `files` defined', done => {
      transform(fromToToProcessor({
        from: /re\splace/g,
        to: 'b',
      }), (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should replace contents in a single file with regex', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }), () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal(testData);
        done();
      });
    });

    it('should replace contents with a string replacement', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: 're place',
        to: 'b',
      }), () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        expect(test1).to.equal('a b c');
        done();
      });
    });

    it('should replace contents in a an array of files', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
      }), () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs', done => {
      transform(fromToToProcessor({
        files: 'test*',
        from: /re\splace/g,
        to: 'b',
      }), () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should expand globs while excluding ignored files', done => {
      transform(fromToToProcessor({
        files: 'test*',
        ignore: 'test1',
        from: /re\splace/g,
        to: 'b',
      }), () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a re place c');
        expect(test2).to.equal('a b c');
        done();
      });
    });

    it('should not return an error on success', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }), (error) => {
        expect(error).to.equal(null);
        done();
      });
    });

    it('should return an error on failure', done => {
      transform(fromToToProcessor({
        files: 'nope',
        from: /re\splace/g,
        to: 'b',
      }), (error) => {
        expect(error).to.be.instanceof(Error);
        done();
      });
    });

    it('should not return an error if allowEmptyPaths is true', done => {
      transform(fromToToProcessor({
        files: 'nope',
        allowEmptyPaths: true,
        from: /re\splace/g,
        to: 'b',
      }), (error) => {
        expect(error).to.equal(null);
        done();
      });
    });

    it('should return a results array', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }), (error, results) => {
        expect(results).to.be.instanceof(Array);
        expect(results).to.have.length(1);
        expect(results[0].file).to.equal('test1');
        done();
      });
    });

    it('should mark if something was replaced', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }), (error, results) => {
        expect(results[0].hasChanged).to.equal(true);
        done();
      });
    });

    it('should not mark if nothing was replaced', done => {
      transform(fromToToProcessor({
        files: 'test1',
        from: 'nope',
        to: 'b',
      }), (error, results) => {
        expect(results[0].hasChanged).to.equal(false);
        done();
      });
    });

    it('should return correct results for multiple files', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
      }), (error, results) => {
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

    it('should work without expanding globs if disabled', done => {
      transform(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        disableGlobs: true,
      }), () => {
        const test1 = fs.readFileSync('test1', 'utf8');
        const test2 = fs.readFileSync('test2', 'utf8');
        expect(test1).to.equal('a b c');
        expect(test2).to.equal('a b c');
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
        transform.sync();
      }).to.throw(Error);
    });

    it('should throw an error when invalid config provided', () => {
      expect(function() {
        transform.sync(42);
      }).to.throw(Error);
    });

    it('should throw an error when no `files` defined', () => {
      expect(function() {
        transform.sync(fromToToProcessor({
          from: /re\splace/g,
          to: 'b',
        }));
      }).to.throw(Error);
    });

    it('should support the encoding parameter', () => {
      expect(function() {
        transform.sync(fromToToProcessor({
          files: 'test1',
          from: /re\splace/g,
          to: 'b',
          encoding: 'utf-8',
        }));
      }).to.not.throw(Error);
    });

    it('should fall back to utf-8 encoding with invalid configuration', () => {
      expect(function() {
        transform.sync(fromToToProcessor({
          files: 'test1',
          from: /re\splace/g,
          to: 'b',
          encoding: '',
        }));
      }).to.not.throw(Error);
      expect(function() {
        transform.sync(fromToToProcessor({
          files: 'test1',
          from: /re\splace/g,
          to: 'b',
          encoding: null,
        }));
      }).to.not.throw(Error);
    });

    it('should replace contents in a single file with regex', function() {
      transform.sync(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal(testData);
    });

    it('should replace contents with a string replacement', function() {
      transform.sync(fromToToProcessor({
        files: 'test1',
        from: 're place',
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      expect(test1).to.equal('a b c');
    });

    it('should replace contents in a an array of files', function() {
      transform.sync(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should expand globs', function() {
      transform.sync(fromToToProcessor({
        files: 'test*',
        from: /re\splace/g,
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should return a results array', function() {
      const results = transform.sync(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }));
      expect(results).to.be.instanceof(Array);
      expect(results).to.have.length(1);
      expect(results[0].file).to.equal('test1');
    });

    it('should mark if something was replaced', function() {
      const results = transform.sync(fromToToProcessor({
        files: 'test1',
        from: /re\splace/g,
        to: 'b',
      }));
      expect(results[0].hasChanged).to.equal(true);
    });

    it('should not mark if nothing was replaced', function() {
      const results = transform.sync(fromToToProcessor({
        files: 'test1',
        from: 'nope',
        to: 'b',
      }));
      expect(results[0].hasChanged).to.equal(false);
    });

    it('should return corret results for multiple files', function() {
      const results = transform.sync(fromToToProcessor({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
      }));
      expect(results).to.have.length(3);
      expect(results[0].file).to.equal('test1');
      expect(results[0].hasChanged).to.equal(true);
      expect(results[1].file).to.equal('test2');
      expect(results[1].hasChanged).to.equal(true);
      expect(results[2].file).to.equal('test3');
      expect(results[2].hasChanged).to.equal(false);
    });

    it('should expand globs while excluding ignored files', () => {
      transform.sync(fromToToProcessor({
        files: 'test*',
        ignore: 'test1',
        from: /re\splace/g,
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a re place c');
      expect(test2).to.equal('a b c');
    });

    it('should support an array of ignored files', () => {
      transform.sync(fromToToProcessor({
        files: 'test*',
        ignore: ['test1', 'test3'],
        from: /re\splace/g,
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a re place c');
      expect(test2).to.equal('a b c');
    });

    it('should not fail when the ignore parameter is undefined', () => {
      transform.sync(fromToToProcessor({
        files: 'test*',
        ignore: undefined,
        from: /re\splace/g,
        to: 'b',
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should work without expanding globs if disabled', () => {
      transform.sync(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        disableGlobs: true,
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a b c');
      expect(test2).to.equal('a b c');
    });

    it('should not replace in a dry run', () => {
      transform.sync(fromToToProcessor({
        files: ['test1', 'test2'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      }));
      const test1 = fs.readFileSync('test1', 'utf8');
      const test2 = fs.readFileSync('test2', 'utf8');
      expect(test1).to.equal('a re place c');
      expect(test2).to.equal('a re place c');
    });

    it('should return changed files for a dry run', () => {
      const results = transform.sync(fromToToProcessor({
        files: ['test1', 'test2', 'test3'],
        from: /re\splace/g,
        to: 'b',
        dry: true,
      }));
      expect(results).to.have.length(3);
      expect(results[0].file).to.equal('test1');
      expect(results[0].hasChanged).to.equal(true);
      expect(results[1].file).to.equal('test2');
      expect(results[1].hasChanged).to.equal(true);
      expect(results[2].file).to.equal('test3');
      expect(results[2].hasChanged).to.equal(false);
    });
  });

  describe('module export', () => {
    it('default module export refers to async replace implementation', () => {
      expect(transform).to.be.a('function');
    });

    it(`exports named processFile, processFileSync and sync from module facade`, () => {
      expect(processFile).to.be.a('function');
      expect(processFileSync).to.be.a('function');
      expect(sync).to.be.a('function');
    });

    it('exposes inner functions as own fields of transform', () => {
      expect(transform.processFile).to.equal(transform);
      expect(transform.sync).to.equal(processFileSync);
      expect(transform.processFileSync).to.equal(processFileSync);
    });
  });
});
