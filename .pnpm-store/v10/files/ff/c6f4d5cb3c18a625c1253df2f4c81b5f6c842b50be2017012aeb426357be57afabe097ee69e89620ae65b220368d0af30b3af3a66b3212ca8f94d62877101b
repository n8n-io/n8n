'use strict';
var fs = require('fs');
var Path = require('path');
var domino = require('../lib');
var Window = require('../lib/Window');

var BLOCKLIST_PATH = Path.resolve(__dirname, 'web-platform-blocklist.json');
// Set to true and delete the existing blocklist file to regenerate the
// blocklist from currently-failing tests.
var WRITE_BLOCKLIST = false;

// These are the tests we currently fail.
// Some of these failures are bugs we ought to fix.
var blocklist = {};
try {
  blocklist = require(BLOCKLIST_PATH);
} catch(e) {
  // We expect that you deleted the old blocklist before using WRITE_BLOCKLIST
  if (!WRITE_BLOCKLIST) { throw e; }
}

var escapeRegExp = function(s) {
  // Note that JSON is not a subset of JavaScript: it allows \u2028 and \u2029
  // to be embedded as literals.  Escape them in the regexp to prevent this
  // from causing a syntax error when we eval() this regexp.
  return s.replace(/[\^\\$*+?.()|{}\[\]\/]/g, '\\$&')
    .replace(/[\u2028\u2029]/, function(c) {
      var cp = c.codePointAt(0).toString(16);
      while (cp.length < 4) { cp = '0' + cp; }
      return '\\u' + cp;
    });
};

var onblocklist = function(shortFile) {
  if (WRITE_BLOCKLIST) { return null; }
  if (!Array.isArray(blocklist[shortFile])) { return null; }
  // convert strings to huge regexp
  return new RegExp('^(' + blocklist[shortFile].map(escapeRegExp).join('|') + ')$');
};

// Test suite requires Array.includes(); polyfill from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
/* jshint bitwise: false */
if (!Array.prototype.includes) {
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this === null || this === undefined) {
        throw new TypeError('"this" is null or not defined');
      }
      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return false;
      }
      var n = fromIndex | 0;
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      while (k < len) {
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        k++;
      }
      return false;
    }
  });
}
// Test suite requires Array.values() as well
if (global.Symbol && global.Symbol.iterator && !Array.prototype.values) {
  Object.defineProperty(
    Array.prototype, 'values',
    Object.getOwnPropertyDescriptor(Array.prototype, global.Symbol.iterator)
  );
}

function read(file) {
  return fs.readFileSync(Path.resolve(__dirname, '..', file), 'utf8');
}

var testharness = require(__dirname + '/web-platform-tests/resources/testharness.js');

function list(base, dir, fn) {
  var result = {};
  var fulldir = Path.resolve(__dirname, '..', base, dir);
  fs.readdirSync(fulldir).forEach(function(file) {
    var path = Path.join(dir, file);
    var stat = fs.statSync(Path.join(fulldir, file));
    if (stat.isDirectory()) {
      result[file] = list(base, path, fn);
    }
    else if (file.match(/\.x?html$/)) {
      var test = fn(path, Path.join(fulldir, file));
      if (test) result[file] = test;
    }
  });
  return result;
}

var badTestFiles = new RegExp('(' + [
  '/html/dom/interfaces.https.html', // Uses ES6, missing .../WebIDLParser.js
  '/dom/nodes/Document-characterSet-normalization.html',
  '/dom/nodes/Document-contentType/contentType/contenttype_datauri_02.html',
  '/dom/nodes/Element-getElementsByTagName-change-document-HTMLNess.html',
  '/dom/nodes/ParentNode-querySelector-All.html',
  '/dom/nodes/query-target-in-load-event.html',
].map(escapeRegExp).join('|') + ')$');

var forceSyncTestFiles = new RegExp('(' + [
  '/dom/nodes/Node-parentNode.html',
  '/html/dom/documents/dom-tree-accessors/Document.currentScript.html',
  '/html/dom/self-origin.sub.html',
  '/dom/nodes/Node-isEqualNode-xhtml.xhtml',
].map(escapeRegExp).join('|') + ')$');

var harness = function() {
  var paths = Array.from(arguments);
  var harnessResult = {
    // Could add 'before' or 'after' hooks here.
  };
  paths.forEach(function(path) {
    var shortName = path.replace(/^.*?\/web-platform-tests\//, '');
    harnessResult[shortName] = list(path, '', function(name, file) {
      var shortFile = file.replace(/^.*?\/web-platform-tests\//, '');
      if (/\/html\/dom\/reflection-original.html$/.test(file)) {
        // This is a compilation file & not a test suite.
        return; // skip
      }
      if (badTestFiles.test(file)) {
        // Misc problems w/ test file, usually resulting in async done() method
        // never getting invoked and a time-wasting timeout.
        return; // skip
      }
      var html = read(file);

      var document = domino.createDocument(html);
      document.address = 'http://example.com/';
      var window = new Window(document);

      Array.from(window.document.getElementsByTagName('iframe')).forEach(function(iframe) {
        if (iframe.src === 'http://example.com/common/dummy.xml') {
          var dummyXmlDoc = domino.createDOMImplementation().createDocument(
            'http://www.w3.org/1999/xhtml', 'html', null
          );
          dummyXmlDoc._contentType = 'application/xml';
          iframe._contentWindow = new Window(dummyXmlDoc);
          var foo = dummyXmlDoc.createElement('foo');
          foo.textContent = 'Dummy XML document';
          dummyXmlDoc.documentElement.appendChild(foo);
        }
        if (iframe.src === 'http://example.com/common/dummy.xhtml') {
          var dummyXhtml = read('test/web-platform-tests/common/dummy.xhtml');
          var dummyXhtmlAsHtml = domino.createDocument(dummyXhtml);
          // Tweak this a tiny bit, since we actually used an HTML parser not
          // an XML parser.
          dummyXhtmlAsHtml.body.textContent = '';
          // Create a proper XML document, and copy the HTML contents into it
          var dummyXhtmlDoc = domino.createDOMImplementation().createDocument(
            'http://www.w3.org/1999/xhtml', 'html', null
          );
          dummyXhtmlDoc._contentType = 'application/xhtml+xml';
          dummyXhtmlDoc.insertBefore(
            dummyXhtmlDoc.adoptNode(dummyXhtmlAsHtml.doctype),
            dummyXhtmlDoc.documentElement
          );
          dummyXhtmlDoc.documentElement.appendChild(
            dummyXhtmlDoc.adoptNode(dummyXhtmlAsHtml.head)
          );
          dummyXhtmlDoc.documentElement.appendChild(
            dummyXhtmlDoc.adoptNode(dummyXhtmlAsHtml.body)
          );
          iframe._contentWindow = new Window(dummyXhtmlDoc);
        }
      });
      testharness(window);
      window.setup({explicit_timeout:true});

      if (forceSyncTestFiles.test(file)) {
        window.async_test = function(){
          return {
            step: function() {},
            step_func_done: function() {},
            done: function() {},
          }
        };
      }
      var scripts = window.document.getElementsByTagName('script');
      scripts = Array.from(scripts);
      var sawTestHarness = false;
      var concatenatedScripts = scripts.map(function(script) {
        if (/\/resources\/testharness(report)?\.js$/.test(script.getAttribute('src')||'')) {
          // We've already included the test harnesses.
          sawTestHarness = true;
          return '';
        }
        if (/\/webrtc\/RTCPeerConnection-helper.js$/.test(script.getAttribute('src')||'')) {
          // Bad script: we don't support webrtc and furthermore it contains
          // ES6 syntax which causes older versions of node to choke.
          return '';
        }
        if (/^text\/plain$/.test(script.getAttribute('type')||'')) {
          return '';
        }
        if (/^(\w+|..|\/)/.test(script.getAttribute('src')||'')) {
          var f = script.getAttribute('src');
          if (/^\//.test(f)) {
            f = Path.resolve(__dirname, 'web-platform-tests' + f);
          } else {
            //console.log('??', {path:path, name:name, file:file});
            f = Path.resolve(Path.dirname(file), f);
          }
          if (fs.existsSync(f)) {
            return read(f);
          } else {
            // console.warn('SKIPPING SCRIPT', script.outerHTML);
          }
        }
        var textContent = script.textContent;
        if (/\.xhtml$/.test(file)) {
          // hacky way to expand entities
          var txt = window.document.createElementNS('http://www.w3.org/1999/xhtml', 'textarea');
          txt.innerHTML = textContent;
          textContent = txt.textContent;
        }
        return textContent + '\n';
      }).join("\n");
      concatenatedScripts =
        concatenatedScripts.replace(/\.attributes\[(\w+)\]/g,
                                    '.attributes.item($1)');
      // Some tests use [...foo] syntax for `Array.from(foo)`
      concatenatedScripts =
        concatenatedScripts.replace(/\[\.\.\.(\w+)\]/g,
                                    'Array.from($1)');
      // usvstring-reflection.html uses () => { ... } syntax (unnecessarily)
      concatenatedScripts =
        concatenatedScripts.replace(/(\b\w+|\(\w*\))\s*=>\s*\{/g, function(_,a){
          if (a.slice(0,1)!=='(') { a = '(' + a + ')'; }
          return 'function '+a+' {';
        });
      // It also contains `([channel1, channel2]) => {` in a test case which is
      // bound to fail anyway (it exercises WebRTC)
      concatenatedScripts =
        concatenatedScripts.replace(
            /\(\[channel1, channel2\]\) => \{/,
            'function(channel1, channel2){' // not right, but not a syntax error
        );
      // Workaround for https://github.com/w3c/web-platform-tests/pull/3984
      concatenatedScripts =
        '"use strict";\n' +
        'var ReflectionTests, x, attr;\n' +
        // Hack in globals on window object
        '"String|Boolean|Number".split("|").forEach(function(x){' +
        'window[x] = global[x];})\n' +
        // Hack in frames on window object
        'Array.from(document.getElementsByTagName("iframe")).forEach(' +
        'function(f,i){window[i]=f.contentWindow;});\n' +
        concatenatedScripts;
      // Fire load events
      var closeDocument =
        'document.close();\n' +
        'Array.from(document.getElementsByTagName("iframe")).forEach(' +
        'function(f){f.dispatchEvent(new Event("load"));});';

      var expectedFailures = onblocklist(shortFile);

      return function(done) {
        var haveTests = false, isComplete = false, sawError = [];
        var calledOnce = false;
        var withResults = function(results) {
          if (calledOnce) {
            console.warn('DONE CALLED TWICE', name, (new Error()).stack);
            return;
          }
          else { calledOnce = true; }
          if (!WRITE_BLOCKLIST) {
            var str = results.map(function(item) {
              var s = item.name;
              if (item.message) s += ': ' + item.message;
              if (item.status) s += ' ['+item.status+']';
              return s;
            });
            sawError.forEach(function(err) {
              if (!(expectedFailures && expectedFailures.test('Uncaught: '+err.message))) {
                str.push('Uncaught: '+err.message);
              }
            });
            if (sawError.length === 1 && str.length === 1) {
              done(sawError[0]); // for nicer stack trace
            } else {
              done(str.length ? new Error(str.join('\n\n')) : null);
            }
          } else {
            var bl = {};
            try {
              bl = JSON.parse(fs.readFileSync(blocklist_PATH, 'utf-8'));
            } catch (e) { /* ignore */ }
            bl[shortFile] = results.map(function(item) { return item.name; });
            sawError.forEach(function(err) {
              bl[shortFile].push('Uncaught: ' + err.message);
            });
            if (!bl[shortFile].length) { bl[shortFile] = undefined; }
            fs.writeFileSync(
              blocklist_PATH, JSON.stringify(bl, null, 2), 'utf-8'
            );
            done();
          }
        };
        window.add_start_callback(function() {
          haveTests = true;
        });
        window.add_completion_callback(function(tests, status) {
          isComplete = true;
          var failed = tests.filter(function(t) {
            if (t.status === t.TIMEOUT) { return true; /* never ok */ }
            var expectFail =
                expectedFailures ? expectedFailures.test(t.name) : false;
            var actualFail = (t.status === t.FAIL);
            return expectFail !== actualFail;
          });
          var report = failed.map(function(t) {
            var item = { name: t.name, message: t.message };
            if (t.status===t.TIMEOUT) { item.status = 'TIMEOUT'; }
            else if (t.status!==t.FAIL) { item.status = 'EXPECT FAIL'; }
            return item;
          });
          withResults(report);
        });
        // TODO(jessicajaniuk): window._run was removed to enable ESM support
        // try {
        //   window._run(concatenatedScripts);
        // } catch (e) {
        //   sawError.push(e);
        // }
        // try {
        //   window._run(closeDocument);
        // } catch (e) {
        //   sawError.push(e);
        // }
        if (!sawTestHarness) { withResults([]); }
        else if (sawError.length && !haveTests) { withResults([]); }
      };
    });
  });
  return harnessResult;
};

// module.exports = harness(__dirname + '/web-platform-tests/html/dom',
//                          __dirname + '/web-platform-tests/dom/nodes',
//                          __dirname + '/web-platform-tests/dom/traversal',
//                          __dirname + '/web-platform-tests/domparsing');
