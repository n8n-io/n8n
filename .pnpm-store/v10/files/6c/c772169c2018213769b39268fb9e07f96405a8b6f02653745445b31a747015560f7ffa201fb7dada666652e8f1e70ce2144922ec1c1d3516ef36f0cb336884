var _tagTester = require('./_tagTester.js');
var _has = require('./_has.js');

var isArguments = _tagTester('Arguments');

// Define a fallback version of the method in browsers (ahem, IE < 9), where
// there isn't any inspectable "Arguments" type.
(function() {
  if (!isArguments(arguments)) {
    isArguments = function(obj) {
      return _has(obj, 'callee');
    };
  }
}());

var isArguments$1 = isArguments;

module.exports = isArguments$1;
