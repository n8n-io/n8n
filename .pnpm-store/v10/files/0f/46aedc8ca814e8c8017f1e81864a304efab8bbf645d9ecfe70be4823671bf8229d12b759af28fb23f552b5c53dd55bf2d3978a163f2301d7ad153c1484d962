'use strict';
var domino = require('../');
var html5lib_tests = require('./html5lib-tests.json');

// These test cases are taken from the `html5lib/html5lib-tests` package
// on github, in the directory `tree-construction`.  The filename in that
// directory is the name of each suite of tests.

function cases(filename, tc) {
  return tc.filter(function(test) {
    // We don't support some of these test cases...
    if (test.fragment && test.fragment.ns) { return false; }
    // Scripting is always enabled in domino.
    if (test.script === 'off') { return false; }
    return true;
  }).reduce(function(r, test) {
    var input = test.data, expected = test.document.html,
        fragment = test.fragment && test.fragment.name;
    // Come up with a helpful name for the testcase.
    var trimmed = input, n, candidate;
    if (trimmed==='') { trimmed = '{no input}'; }
    if (fragment) { trimmed = fragment + ':' + trimmed; }
    if (r[trimmed]) {
      //console.warn("Duplicate test in "+filename+": "+trimmed);
    }
    for (n = 40; n < trimmed.length; n += 5) {
      candidate = trimmed.slice(0, n) + '...';
      if (!r[candidate]) { trimmed = candidate; break; }
    }
    if (/\n/.test(trimmed)) {
      candidate = trimmed.split(/\n/)[0] + '...';
      if (!r[candidate]) { trimmed = candidate; }
    }
    r[trimmed] = makeOneTest(fragment, input, expected);
    return r;
  }, {});
}

function makeOneTest(fragment, input, expected) {
  return function() {
    var doc, context;
    if (fragment) {
      doc = domino.createDocument();
      context = (fragment==='body') ? doc.body : doc.createElement(fragment);
      context.innerHTML = input;
      context.innerHTML.should.equal(expected);
    } else {
      doc = domino.createDocument(input, true);
      doc.outerHTML.should.equal(expected);
    }
  };
}

exports.parseAlgorithm = Object.keys(html5lib_tests).reduce(function(r, file) {
  r[file] = cases(file, html5lib_tests[file]);
  return r;
}, {});

// Some extra tests.

// https://github.com/html5lib/html5lib-tests/issues/20
exports.parseAlgorithm['github issue #20'] = {
  'test1': makeOneTest(
    'body', '<table><li><li></table>', '<li></li><li></li><table></table>'
  )
};
