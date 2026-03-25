var _curry2 = /*#__PURE__*/require('./internal/_curry2');

var _isInteger = /*#__PURE__*/require('./internal/_isInteger');

var _isArray = /*#__PURE__*/require('./internal/_isArray');

var assoc = /*#__PURE__*/require('./assoc');

var dissoc = /*#__PURE__*/require('./dissoc');

var remove = /*#__PURE__*/require('./remove');

var update = /*#__PURE__*/require('./update');

/**
 * Makes a shallow clone of an object, omitting the property at the given path.
 * Note that this copies and flattens prototype properties onto the new object
 * as well. All non-primitive properties are copied by reference.
 *
 * @func
 * @memberOf R
 * @since v0.11.0
 * @category Object
 * @typedefn Idx = String | Int
 * @sig [Idx] -> {k: v} -> {k: v}
 * @param {Array} path The path to the value to omit
 * @param {Object} obj The object to clone
 * @return {Object} A new object without the property at path
 * @see R.assocPath
 * @example
 *
 *      R.dissocPath(['a', 'b', 'c'], {a: {b: {c: 42}}}); //=> {a: {b: {}}}
 */


var dissocPath = /*#__PURE__*/_curry2(function dissocPath(path, obj) {
  switch (path.length) {
    case 0:
      return obj;
    case 1:
      return _isInteger(path[0]) && _isArray(obj) ? remove(path[0], 1, obj) : dissoc(path[0], obj);
    default:
      var head = path[0];
      var tail = Array.prototype.slice.call(path, 1);
      if (obj[head] == null) {
        return obj;
      } else if (_isInteger(head) && _isArray(obj)) {
        return update(head, dissocPath(tail, obj[head]), obj);
      } else {
        return assoc(head, dissocPath(tail, obj[head]), obj);
      }
  }
});
module.exports = dissocPath;