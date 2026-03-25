define(['./isObject', './isArray', './extend'], function (isObject, isArray, extend) {

  // Create a (shallow-cloned) duplicate of an object.
  function clone(obj) {
    if (!isObject(obj)) return obj;
    return isArray(obj) ? obj.slice() : extend({}, obj);
  }

  return clone;

});
