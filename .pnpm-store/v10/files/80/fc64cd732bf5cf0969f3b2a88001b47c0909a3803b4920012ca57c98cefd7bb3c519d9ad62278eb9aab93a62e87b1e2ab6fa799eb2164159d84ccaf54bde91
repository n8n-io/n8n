var restArguments = require('./restArguments.js');
var isFunction = require('./isFunction.js');
var map = require('./map.js');
var _deepGet = require('./_deepGet.js');
var _toPath = require('./_toPath.js');

// Invoke a method (with arguments) on every item in a collection.
var invoke = restArguments(function(obj, path, args) {
  var contextPath, func;
  if (isFunction(path)) {
    func = path;
  } else {
    path = _toPath(path);
    contextPath = path.slice(0, -1);
    path = path[path.length - 1];
  }
  return map(obj, function(context) {
    var method = func;
    if (!method) {
      if (contextPath && contextPath.length) {
        context = _deepGet(context, contextPath);
      }
      if (context == null) return void 0;
      method = context[path];
    }
    return method == null ? method : method.apply(context, args);
  });
});

module.exports = invoke;
