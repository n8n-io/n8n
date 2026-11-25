import { t as __commonJSMin } from "./rolldown-runtime-EITvVbkG.js";
import { Ci as require__baseClone, Do as require__castPath, Oo as require__arrayMap, Vr as require__baseUnset, gi as require__flatRest, va as require__copyObject, wi as require__getAllKeysIn, ya as require_isPlainObject } from "./vendor-Hx42-oQF.js";
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/_customOmitClone.js
var require__customOmitClone = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var isPlainObject = require_isPlainObject();
	/**
	* Used by `_.omit` to customize its `_.cloneDeep` use to only clone plain
	* objects.
	*
	* @private
	* @param {*} value The value to inspect.
	* @param {string} key The key of the property to inspect.
	* @returns {*} Returns the uncloned value or `undefined` to defer cloning to `_.cloneDeep`.
	*/
	function customOmitClone(value) {
		return isPlainObject(value) ? void 0 : value;
	}
	module.exports = customOmitClone;
}));
//#endregion
//#region ../../../node_modules/.pnpm/lodash@4.18.1_patch_hash=0384abb0bf57b0811e09219dbce0b926741d818285ee77526ad4cb75a60b87a1/node_modules/lodash/omit.js
var require_omit = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var arrayMap = require__arrayMap();
	var baseClone = require__baseClone();
	var baseUnset = require__baseUnset();
	var castPath = require__castPath();
	var copyObject = require__copyObject();
	var customOmitClone = require__customOmitClone();
	var flatRest = require__flatRest();
	var getAllKeysIn = require__getAllKeysIn();
	/** Used to compose bitmasks for cloning. */
	var CLONE_DEEP_FLAG = 1;
	var CLONE_FLAT_FLAG = 2;
	var CLONE_SYMBOLS_FLAG = 4;
	module.exports = flatRest(function(object, paths) {
		var result = {};
		if (object == null) return result;
		var isDeep = false;
		paths = arrayMap(paths, function(path) {
			path = castPath(path, object);
			isDeep || (isDeep = path.length > 1);
			return path;
		});
		copyObject(object, getAllKeysIn(object), result);
		if (isDeep) result = baseClone(result, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
		var length = paths.length;
		while (length--) baseUnset(result, paths[length]);
		return result;
	});
}));
//#endregion
export { require_omit as t };
