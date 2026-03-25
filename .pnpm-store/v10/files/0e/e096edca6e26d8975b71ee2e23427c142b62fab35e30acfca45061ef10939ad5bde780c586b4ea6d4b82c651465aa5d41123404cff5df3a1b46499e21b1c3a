var _setup = require('./_setup.js');

// Internal function for creating a `toString`-based type tester.
function tagTester(name) {
  var tag = '[object ' + name + ']';
  return function(obj) {
    return _setup.toString.call(obj) === tag;
  };
}

module.exports = tagTester;
