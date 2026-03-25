var _baseCreate = require('./_baseCreate.js');
var extendOwn = require('./extendOwn.js');

// Creates an object that inherits from the given prototype object.
// If additional properties are provided then they will be added to the
// created object.
function create(prototype, props) {
  var result = _baseCreate(prototype);
  if (props) extendOwn(result, props);
  return result;
}

module.exports = create;
