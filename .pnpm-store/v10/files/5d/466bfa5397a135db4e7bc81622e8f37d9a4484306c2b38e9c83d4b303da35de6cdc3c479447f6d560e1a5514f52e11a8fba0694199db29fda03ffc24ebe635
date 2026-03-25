import _ from './underscore.js';
import each from './each.js';
import functions from './functions.js';
import { push } from './_setup.js';
import chainResult from './_chainResult.js';

// Add your own custom functions to the Underscore object.
export default function mixin(obj) {
  each(functions(obj), function(name) {
    var func = _[name] = obj[name];
    _.prototype[name] = function() {
      var args = [this._wrapped];
      push.apply(args, arguments);
      return chainResult(this, func.apply(_, args));
    };
  });
  return _;
}
