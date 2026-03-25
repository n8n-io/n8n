var underscore = require('./underscore.js');
var each = require('./each.js');
var functions = require('./functions.js');
var _setup = require('./_setup.js');
var _chainResult = require('./_chainResult.js');

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

module.exports = mixin;
