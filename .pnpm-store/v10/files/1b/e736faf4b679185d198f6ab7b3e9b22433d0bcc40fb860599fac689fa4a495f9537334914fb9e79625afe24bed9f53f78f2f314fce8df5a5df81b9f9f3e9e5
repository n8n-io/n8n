import _ from './underscore.js';
import { toString, SymbolProto } from './_setup.js';
import getByteLength from './_getByteLength.js';
import isTypedArray from './isTypedArray.js';
import isFunction from './isFunction.js';
import { hasDataViewBug }  from './_stringTagBug.js';
import isDataView from './isDataView.js';
import keys from './keys.js';
import has from './_has.js';
import toBufferView from './_toBufferView.js';

// We use this string twice, so give it a name for minification.
var tagDataView = '[object DataView]';

// Perform a deep comparison to check if two objects are equal.
export default function isEqual(a, b) {
  var todo = [{a: a, b: b}];
  // Initializing stacks of traversed objects for cycle detection.
  var aStack = [], bStack = [];

  while (todo.length) {
    var frame = todo.pop();
    if (frame === true) {
      // Remove the first object from the stack of traversed objects.
      aStack.pop();
      bStack.pop();
      continue;
    }
    a = frame.a;
    b = frame.b;

    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the [Harmony `egal` proposal](https://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) {
      if (a !== 0 || 1 / a === 1 / b) continue;
      return false;
    }
    // `null` or `undefined` only equal to itself (strict comparison).
    if (a == null || b == null) return false;
    // `NaN`s are equivalent, but non-reflexive.
    if (a !== a) {
      if (b !== b) continue;
      return false;
    }
    // Exhaust primitive checks
    var type = typeof a;
    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;

// Internal recursive comparison function for `_.isEqual`.
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className !== toString.call(b)) return false;
    // Work around a bug in IE 10 - Edge 13.
    if (hasDataViewBug && className == '[object Object]' && isDataView(a)) {
      if (!isDataView(b)) return false;
      className = tagDataView;
    }
    switch (className) {
      // These types are compared by value.
    case '[object RegExp]':
      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
    case '[object String]':
      // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
      // equivalent to `new String("5")`.
      if ('' + a === '' + b) continue;
      return false;
    case '[object Number]':
      todo.push({a: +a, b: +b});
      continue;
    case '[object Date]':
    case '[object Boolean]':
      // Coerce dates and booleans to numeric primitive values. Dates are compared by their
      // millisecond representations. Note that invalid dates with millisecond representations
      // of `NaN` are not equivalent.
      if (+a === +b) continue;
      return false;
    case '[object Symbol]':
      if (SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b)) continue;
      return false;
    case '[object ArrayBuffer]':
    case tagDataView:
      // Coerce to typed array so we can fall through.
      todo.push({a: toBufferView(a), b: toBufferView(b)});
      continue;
    }

    var areArrays = className === '[object Array]';
    if (!areArrays && isTypedArray(a)) {
      var byteLength = getByteLength(a);
      if (byteLength !== getByteLength(b)) return false;
      if (a.buffer === b.buffer && a.byteOffset === b.byteOffset) continue;
      areArrays = true;
    }
    if (!areArrays) {
      if (typeof a != 'object' || typeof b != 'object') return false;

      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(isFunction(aCtor) && aCtor instanceof aCtor &&
                               isFunction(bCtor) && bCtor instanceof bCtor)
          && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }

    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] === a) {
        if (bStack[length] === b) break;
        return false;
      }
    }
    if (length >= 0) continue;

    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    todo.push(true);

    // Recursively compare objects and arrays.
    if (areArrays) {
      // Compare array lengths to determine if a deep comparison is necessary.
      length = a.length;
      if (length !== b.length) return false;
      // Deep compare the contents, ignoring non-numeric properties.
      while (length--) {
        todo.push({a: a[length], b: b[length]});
      }
    } else {
      // Deep compare objects.
      var _keys = keys(a), key;
      length = _keys.length;
      // Ensure that both objects contain the same number of properties before comparing deep equality.
      if (keys(b).length !== length) return false;
      while (length--) {
        // Deep compare each member
        key = _keys[length];
        if (!has(b, key)) return false;
        todo.push({a: a[key], b: b[key]});
      }
    }
  }
  return true;
}
