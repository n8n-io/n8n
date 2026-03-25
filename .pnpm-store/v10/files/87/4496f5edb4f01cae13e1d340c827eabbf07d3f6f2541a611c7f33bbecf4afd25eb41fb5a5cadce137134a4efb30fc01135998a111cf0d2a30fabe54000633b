var isObject = require('./isObject.js');
var isArray = require('./isArray.js');
var extend = require('./extend.js');

// Create a (shallow-cloned) duplicate of an object.
function clone(obj) {
  if (!isObject(obj)) return obj;
  return isArray(obj) ? obj.slice() : extend({}, obj);
}

module.exports = clone;
