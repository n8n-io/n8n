var assert = require('assert'),
    licenseFiles = require('../lib/license-files');

describe('license files detector', function() {

    it('should export a function', function() {
        assert.equal(typeof licenseFiles, 'function');
    });

    it('no files', function() {
        assert.deepEqual(licenseFiles([]), []);
    });

    it('no license files', function() {
        assert.deepEqual(licenseFiles([
            '.gitignore',
            '.travis.yml',
            'TODO',
        ]), []);
    });

    it('one license candidate', function() {
        assert.deepEqual(licenseFiles([
            'LICENSE',
            '.gitignore',
            'src',
        ]), ['LICENSE']);
    });

    it('multiple license candidates detected in the right order', function() {
        assert.deepEqual(licenseFiles([
            'COPYING',
            '.gitignore',
            'LICENCE',
            'LICENSE',
            'src',
            'README',
        ]), [
            'LICENSE',
            'LICENCE',
            'COPYING',
            'README',
        ]);
    });

    it('extensions have no effect', function() {
        assert.deepEqual(licenseFiles([
            'LICENCE.txt',
            '.gitignore',
            'src',
        ]), [
            'LICENCE.txt',
        ]);
    });

    it('lower/upper case has no effect', function() {
        assert.deepEqual(licenseFiles([
            'LiCeNcE',
            '.gitignore',
            'src',
        ]), [
            'LiCeNcE',
        ]);
    });

    it('LICENSE-MIT gets matched', function() {
        assert.deepEqual(licenseFiles([
            'LICENSE',
            '.gitignore',
            'LICENSE-MIT',
            'src',
        ]), [
            'LICENSE',
            'LICENSE-MIT',
        ]);
    });

    it('only the first LICENSE-* file gets matched', function() {
        assert.deepEqual(licenseFiles([
            'license-foobar.txt',
            '.gitignore',
            'LICENSE-MIT',
        ]), [
            'license-foobar.txt',
        ]);
    });
});
