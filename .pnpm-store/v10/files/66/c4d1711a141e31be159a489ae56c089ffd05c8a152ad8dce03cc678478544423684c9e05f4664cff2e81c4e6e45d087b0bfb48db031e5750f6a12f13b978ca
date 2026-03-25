(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('deep-eql'), require('lodash-es')) :
	typeof define === 'function' && define.amd ? define(['exports', 'deep-eql', 'lodash-es'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ArrayHyperUnique = {}, global._equals, global.lodashEs));
})(this, (function (exports, _equals, lodashEs) { 'use strict';

	function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

	var _equals__default = /*#__PURE__*/_interopDefaultLegacy(_equals);

	function equals(a1, a2) {
	  return _equals__default["default"](a1, a2);
	}
	function defaultFilter(options = {}) {
	  const checker = options.checker || defaultChecker;
	  const filter = options.filter || null;
	  const find = options.removeFromFirst ? lodashEs.findLastIndex : lodashEs.findIndex;
	  const cb = (val, index, arr) => {
	    let i = find(arr, a => checker(a, val, arr, arr));
	    return i === index && (!filter || filter(val));
	  };
	  return cb;
	}
	function defaultChecker(element, value, arr_new, arr_old) {
	  return _equals__default["default"](element, value);
	}

	function array_unique(arr, options = {}) {
	  if (!Array.isArray(arr)) {
	    throw new TypeError(`Expected an Array but got ${typeof arr}.`);
	  }
	  const cb = defaultFilter(options);
	  if (options.overwrite) {
	    let index = arr.length;
	    while (index--) {
	      let val = arr[index];
	      if (!cb(val, index, arr)) {
	        arr.splice(index, 1);
	      }
	    }
	    return arr;
	  }
	  return arr.filter(cb);
	}
	function array_unique_overwrite(arr, options = {}) {
	  return array_unique(arr, {
	    ...options,
	    overwrite: true
	  });
	}
	function lazy_unique(...arr) {
	  if (arr.length > 1) {
	    return array_unique(arr);
	  }
	  return array_unique(arr[0]);
	}
	function lazy_unique_overwrite(...arr) {
	  if (arr.length > 1) {
	    return array_unique_overwrite(arr);
	  }
	  return array_unique_overwrite(arr[0]);
	}
	{
	  Object.defineProperty(lazy_unique, "array_unique", {
	    value: array_unique
	  });
	  Object.defineProperty(lazy_unique, "array_unique_overwrite", {
	    value: array_unique_overwrite
	  });
	  Object.defineProperty(lazy_unique, "lazy_unique_overwrite", {
	    value: lazy_unique_overwrite
	  });
	  Object.defineProperty(lazy_unique, "equals", {
	    value: equals
	  });
	  Object.defineProperty(lazy_unique, "defaultFilter", {
	    value: defaultFilter
	  });
	  Object.defineProperty(lazy_unique, "defaultChecker", {
	    value: defaultChecker
	  });
	  Object.defineProperty(lazy_unique, "lazy_unique", {
	    value: lazy_unique
	  });
	  Object.defineProperty(lazy_unique, "default", {
	    value: lazy_unique
	  });
	  Object.defineProperty(lazy_unique, "__esModule", {
	    value: true
	  });
	}

	exports.array_unique = array_unique;
	exports.array_unique_overwrite = array_unique_overwrite;
	exports["default"] = lazy_unique;
	exports.defaultChecker = defaultChecker;
	exports.defaultFilter = defaultFilter;
	exports.equals = equals;
	exports.lazy_unique = lazy_unique;
	exports.lazy_unique_overwrite = lazy_unique_overwrite;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=index.umd.development.cjs.map
