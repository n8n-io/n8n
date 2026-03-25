define(['./_baseCreate', './extendOwn'], function (_baseCreate, extendOwn) {

  // Creates an object that inherits from the given prototype object.
  // If additional properties are provided then they will be added to the
  // created object.
  function create(prototype, props) {
    var result = _baseCreate(prototype);
    if (props) extendOwn(result, props);
    return result;
  }

  return create;

});
