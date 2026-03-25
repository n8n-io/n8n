define(['./underscore', './each', './functions', './_setup', './_chainResult'], function (underscore, each, functions, _setup, _chainResult) {

  // Add your own custom functions to the Underscore object.
  function mixin(obj) {
    each(functions(obj), function(name) {
      var func = underscore[name] = obj[name];
      underscore.prototype[name] = function() {
        var args = [this._wrapped];
        _setup.push.apply(args, arguments);
        return _chainResult(this, func.apply(underscore, args));
      };
    });
    return underscore;
  }

  return mixin;

});
