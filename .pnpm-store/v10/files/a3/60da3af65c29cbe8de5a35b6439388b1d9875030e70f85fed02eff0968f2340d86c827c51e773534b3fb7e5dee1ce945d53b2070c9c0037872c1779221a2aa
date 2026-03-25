define(['./_tagTester', './_has'], function (_tagTester, _has) {

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

  return isArguments$1;

});
