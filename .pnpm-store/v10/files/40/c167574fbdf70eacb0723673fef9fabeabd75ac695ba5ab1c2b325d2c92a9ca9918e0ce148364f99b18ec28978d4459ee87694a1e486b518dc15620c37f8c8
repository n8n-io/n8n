var path = require('path');
var assert = require('assert');
var expect = require('chai').expect;

require('./test-helper-code.js');

describe("support for test code", function() {
    it("should load up a module in a path defined in test helper code", function() {

        require('module-a').sayHello();
        require('module-b').sayHello();
    });
    it("should not search paths that have been removed", function() {
        require('module-c').sayHello();
        require('../').removePath(path.join(__dirname, 'src'));
        assert.throws(function() {
            require('module-d').sayHello();
        });
    });

    it("should allow specific directory to be enabled", function() {
        var targetDir = path.dirname(require.resolve('installed-module-allowed-explicit'));
        require('../').addPath(targetDir);
        require('../').enableForDir(targetDir);

        var foo = require('installed-module-allowed-explicit').getFoo();
        expect(foo.name).to.equal('installed-module-allowed-explicit-foo');
    });

    it("should allow directories where loaded", function() {
        require('../').addPath(path.join(__dirname, 'src'));
        var foo = require('installed-module-allowed').getFoo();
        expect(foo.name).to.equal('installed-module-allowed-foo');
    });
});

console.log('All tests passed!');