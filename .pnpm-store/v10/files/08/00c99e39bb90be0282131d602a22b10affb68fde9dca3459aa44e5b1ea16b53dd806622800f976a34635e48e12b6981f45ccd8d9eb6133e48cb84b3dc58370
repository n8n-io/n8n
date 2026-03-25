var fs = require('fs');
var vm = require('vm');
var assert = require('assert');
var util = require('util');
var Path = require('path');
var domino = require('../../../lib');
var impl = domino.createDOMImplementation();
var Window = require('../../../lib/Window');

var globals = {
  assertEquals: function(message, expected, actual) {
    assert.equal(actual, expected, message + ': expected ' +
      util.inspect(expected, false, 0) + ' got ' +
      util.inspect(actual, false, 0)
    );
  },
  assertTrue: function(message, actual) {
    globals.assertEquals(message, true, actual);
  },
  assertFalse: function(message, actual) {
    assert.ok(!actual, message);
  },
  assertNull: function(message, actual) {
    globals.assertEquals(message, null, actual);
  },
  assertNotNull: function(message, actual) {
    assert.notEqual(actual, null, message);
  },
  console: console
};

function list(dir, re, fn) {
  dir = Path.resolve(__dirname, '..', dir);
  fs.readdirSync(dir).forEach(function(file) {
    var path = Path.join(dir, file);
    var m = re.exec(path);
    if (m) fn.apply(null, m);
  });
}

module.exports = function(path) {

  function run(ctx, file) {
    vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, file);
    return ctx;
  }

  function makeContext() {
    var ctx = vm.createContext(); // create new independent context
    Object.keys(globals).forEach(function(k) {
      ctx[k] = globals[k]; // shallow clone
    });

    ctx.createConfiguredBuilder = function() {
      return {
        contentType: 'text/html',
        hasFeature: function(feature, version) {
          return impl.hasFeature(feature, version);
        },
        getImplementation: function() {
          return impl;
        },
        setImplementationAttribute: function(attr, value) {
          // Ignore
        },
        preload: function(docRef, name, href) {
          return 1;
        },
        load: function(docRef, name, href) {
          var doc = Path.resolve(__dirname, '..', path, 'files', href) + '.html';
          var html = fs.readFileSync(doc, 'utf8');
          var url = 'http://example.com/'+Path.join(path,'files',href)+'.html';

          var document = domino.createDocument(html);
          document.address = url;
          var win = new Window(document);
          return win.document;
        }
      };
    };
    run(ctx, __dirname + '/DomTestCase.js');
    return ctx;
  }

  var tests = {};
  list(path, /(.*?)\.js$/, function(file, basename) {
    tests[basename] =  function() {
      var ctx = makeContext();
      run(ctx, file);
      ctx.setUpPage();
      ctx.runTest();
    };
  });
  return tests;
};
