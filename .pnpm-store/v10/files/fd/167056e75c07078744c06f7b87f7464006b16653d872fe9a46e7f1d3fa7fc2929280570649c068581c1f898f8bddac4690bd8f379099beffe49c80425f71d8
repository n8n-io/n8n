define(['./_setup', './isSymbol'], function (_setup, isSymbol) {

  // Is a given object a finite number?
  function isFinite(obj) {
    return !isSymbol(obj) && _setup._isFinite(obj) && !isNaN(parseFloat(obj));
  }

  return isFinite;

});
