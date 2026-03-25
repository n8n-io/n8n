var _setup = require('./_setup.js');
var isSymbol = require('./isSymbol.js');

// Is a given object a finite number?
function isFinite(obj) {
  return !isSymbol(obj) && _setup._isFinite(obj) && !isNaN(parseFloat(obj));
}

module.exports = isFinite;
